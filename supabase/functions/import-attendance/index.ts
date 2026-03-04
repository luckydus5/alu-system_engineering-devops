import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[._\-]/g, " ").replace(/\s+/g, " ").trim();
}

function namesMatch(a: string, b: string): boolean {
  const aParts = normalizeName(a).split(" ").filter((p) => p.length > 2);
  const bParts = normalizeName(b).split(" ").filter((p) => p.length > 2);
  if (aParts.length === 0 || bParts.length === 0) return false;
  const shorter = aParts.length <= bParts.length ? aParts : bParts;
  const longer = aParts.length <= bParts.length ? bParts : aParts;
  let matched = 0;
  for (const word of shorter) {
    if (longer.some((w) => w === word || (word.length >= 4 && w.startsWith(word)) || (w.length >= 4 && word.startsWith(w)))) {
      matched++;
    }
  }
  if (shorter.length === 1) return matched === 1 && longer.length <= 2;
  return matched >= 2;
}

function parseDateTime(str: string): Date | null {
  const m = str.match(/^(\d{1,2})-(\w{3})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (m) {
    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const mon = months[m[2].toLowerCase()];
    if (mon !== undefined) {
      let y = parseInt(m[3]);
      y = y < 50 ? 2000 + y : 1900 + y;
      return new Date(y, mon, parseInt(m[1]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6]));
    }
  }
  return null;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function determineStatus(clockIn: Date, dateStr: string): string {
  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
  if (dayOfWeek === 6) return "half_day";
  const inHour = clockIn.getHours();
  if (inHour >= 14 || inHour < 4) return "present";
  const totalMin = inHour * 60 + clockIn.getMinutes();
  if (totalMin > 8 * 60 + 15) return "late";
  return "present";
}

interface Employee {
  id: string;
  full_name: string;
  fingerprint_number: string | null;
  department_id: string;
  company_name: string;
}

interface MatchResult {
  employee: Employee;
  score: number;
  method: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { markdownText, source, monthFilter, fileUploadId } = body as { 
      markdownText: string; 
      source: string;
      monthFilter?: number;
      fileUploadId?: string;
    };
    
    const targetMonth = monthFilter ?? 0;
    
    console.log(`Processing import from ${source}, filtering month=${targetMonth}`);

    // Parse markdown table rows
    const lines = markdownText.split("\n");
    const rows: { department: string; name: string; fingerprint: string; dateTime: string; status: string; rowNum: number }[] = [];
    
    let rowNum = 0;
    for (const line of lines) {
      rowNum++;
      if (!line.startsWith("|") || line.includes("Department") || line.includes("|-")) continue;
      const parts = line.split("|").filter(p => p.trim() !== "");
      if (parts.length >= 5) {
        rows.push({
          department: parts[0].trim(),
          name: parts[1].trim(),
          fingerprint: parts[2].trim(),
          dateTime: parts[3].trim(),
          status: parts[4].trim(),
          rowNum,
        });
      }
    }

    console.log(`Parsed ${rows.length} rows from markdown`);

    // Fetch all employees
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, full_name, fingerprint_number, department_id, company_id, companies(name)")
      .limit(1000);

    if (empErr) throw new Error(`Failed to fetch employees: ${empErr.message}`);

    const empList: Employee[] = (employees || []).map((e: any) => ({
      id: e.id,
      full_name: e.full_name,
      fingerprint_number: e.fingerprint_number,
      department_id: e.department_id,
      company_name: e.companies?.name || "",
    }));

    console.log(`Loaded ${empList.length} employees`);

    // Build fingerprint lookup
    const empByFingerprint = new Map<string, Employee>();
    empList.forEach((e) => {
      if (e.fingerprint_number) empByFingerprint.set(e.fingerprint_number.trim(), e);
    });

    function matchEmployee(name: string, fp: string): MatchResult | null {
      if (fp) {
        const empFP = empByFingerprint.get(fp);
        if (empFP && namesMatch(name, empFP.full_name)) {
          return { employee: empFP, score: 90, method: "fingerprint+name" };
        }
      }
      const norm = normalizeName(name);
      for (const e of empList) {
        if (normalizeName(e.full_name) === norm) {
          return { employee: e, score: 100, method: "exact" };
        }
      }
      const companyHint = source.includes("Peat") ? "HQ Peat" : source.includes("Power") ? "HQ Power" : "";
      let bestMatch: Employee | null = null;
      for (const e of empList) {
        if (namesMatch(name, e.full_name)) {
          if (companyHint && e.company_name === companyHint) {
            return { employee: e, score: 80, method: "fuzzy+company" };
          }
          if (!bestMatch) bestMatch = e;
        }
      }
      if (bestMatch) return { employee: bestMatch, score: 70, method: "fuzzy" };
      return null;
    }

    // ═══ Process ALL rows — save every single one as a raw scan ═══
    const rawScans: any[] = [];
    const grouped = new Map<string, { events: Date[]; employee: Employee; name: string }>();
    let matchedCount = 0;
    let skippedOtherMonth = 0;
    let parseErrors = 0;

    for (const row of rows) {
      if (!row.name || !row.dateTime) continue;
      const dt = parseDateTime(row.dateTime);

      // Build raw scan record — EVERY row gets saved
      const rawScan: any = {
        file_upload_id: fileUploadId || null,
        source_file: source,
        row_number: row.rowNum,
        department_text: row.department,
        employee_name: row.name,
        fingerprint_number: row.fingerprint || null,
        scan_datetime: dt ? dt.toISOString() : new Date().toISOString(),
        scan_status: row.status,
        scan_date: dt ? formatDate(dt) : formatDate(new Date()),
        is_matched: false,
        was_imported: false,
        skip_reason: null,
      };

      if (!dt) {
        parseErrors++;
        rawScan.skip_reason = "parse_error";
        rawScans.push(rawScan);
        continue;
      }

      if (dt.getMonth() !== targetMonth || dt.getFullYear() !== 2026) {
        skippedOtherMonth++;
        rawScan.skip_reason = "wrong_month";
        rawScans.push(rawScan);
        continue;
      }

      const result = matchEmployee(row.name, row.fingerprint);
      if (!result) {
        rawScan.skip_reason = "unmatched";
        rawScans.push(rawScan);
        continue;
      }

      matchedCount++;
      rawScan.is_matched = true;
      rawScan.matched_employee_id = result.employee.id;
      rawScan.matched_employee_name = result.employee.full_name;
      rawScan.match_score = result.score;
      rawScan.match_method = result.method;
      rawScans.push(rawScan);

      const dateKey = formatDate(dt);
      const groupKey = `${result.employee.id}|${dateKey}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { events: [], employee: result.employee, name: row.name });
      }
      grouped.get(groupKey)!.events.push(dt);
    }

    console.log(`Raw scans to save: ${rawScans.length}, Matched: ${matchedCount}, SkippedOtherMonth: ${skippedOtherMonth}, ParseErrors: ${parseErrors}`);

    // ═══ Save ALL raw scans to attendance_raw_scans ═══
    let rawSaved = 0;
    for (let i = 0; i < rawScans.length; i += 100) {
      const batch = rawScans.slice(i, i + 100);
      const { error } = await supabase.from("attendance_raw_scans").insert(batch);
      if (error) {
        console.error(`Raw scan batch ${i} error: ${error.message}`);
      } else {
        rawSaved += batch.length;
      }
    }
    console.log(`Raw scans saved: ${rawSaved}/${rawScans.length}`);

    // ═══ Cross-midnight night shift consolidation ═══
    const groupKeysList = [...grouped.keys()];
    let nightMerged = 0;
    for (const key of groupKeysList) {
      const group = grouped.get(key);
      if (!group) continue;
      const [employeeId, dateStr] = key.split("|");
      const sorted = group.events.sort((a, b) => a.getTime() - b.getTime());
      const firstHour = sorted[0].getHours();

      if (firstHour >= 14) {
        const d = new Date(dateStr + "T12:00:00");
        d.setDate(d.getDate() + 1);
        const nextDateStr = formatDate(d);
        const nextKey = `${employeeId}|${nextDateStr}`;
        const nextGroup = grouped.get(nextKey);
        if (nextGroup) {
          const morningEvents = nextGroup.events.filter((e: Date) => e.getHours() < 8);
          const remainingEvents = nextGroup.events.filter((e: Date) => e.getHours() >= 8);
          if (morningEvents.length > 0) {
            group.events.push(...morningEvents);
            nightMerged++;
            if (remainingEvents.length > 0) {
              nextGroup.events = remainingEvents;
            } else {
              grouped.delete(nextKey);
            }
          }
        }
      }
    }
    console.log(`Night shifts merged: ${nightMerged}`);

    // ═══ Build attendance records ═══
    const records: any[] = [];
    grouped.forEach((group, key) => {
      const [employeeId, dateStr] = key.split("|");
      const sorted = group.events.sort((a, b) => a.getTime() - b.getTime());
      const clockIn = sorted[0];
      const clockOut = sorted.length > 1 ? sorted[sorted.length - 1] : null;

      const hasMeaningfulClockOut = clockOut && Math.abs(clockOut.getTime() - clockIn.getTime()) >= 60000;
      const status = determineStatus(clockIn, dateStr);
      const inHour = clockIn.getHours();
      const shiftType = inHour >= 14 || inHour < 4 ? "night" : "day";

      let totalHours = 0, regularHours = 0, overtimeHours = 0;

      if (hasMeaningfulClockOut) {
        let diffMs = clockOut!.getTime() - clockIn.getTime();
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
        totalHours = Math.round(Math.max(0, diffMs / 3600000) * 100) / 100;
        if (status === "half_day") {
          regularHours = Math.min(totalHours, 4);
        } else {
          regularHours = Math.min(totalHours, 8);
          overtimeHours = Math.max(0, totalHours - 8);
          overtimeHours = shiftType === "day" ? Math.min(overtimeHours, 1.5) : Math.min(overtimeHours, 3);
        }
        regularHours = Math.round(regularHours * 100) / 100;
        overtimeHours = Math.round(overtimeHours * 100) / 100;
      }

      records.push({
        user_id: employeeId,
        department_id: group.employee.department_id,
        attendance_date: dateStr,
        clock_in: clockIn.toISOString(),
        clock_out: hasMeaningfulClockOut ? clockOut!.toISOString() : null,
        status,
        shift_type: shiftType,
        total_hours: totalHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        notes: `Imported from ${source} | ${group.name} | Events: ${sorted.length}`,
      });
    });

    console.log(`Prepared ${records.length} records for upsert`);

    // Upsert attendance records
    let imported = 0, errors = 0;
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      const { error } = await supabase
        .from("attendance_records")
        .upsert(batch, { onConflict: "user_id,attendance_date" });
      if (error) {
        console.error(`Batch ${i} error: ${error.message}`);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
    }

    // Update raw scans with was_imported = true for matched records
    if (fileUploadId) {
      await supabase
        .from("attendance_raw_scans")
        .update({ was_imported: true })
        .eq("file_upload_id", fileUploadId)
        .eq("is_matched", true);
    }

    const unmatchedList = rawScans
      .filter(s => s.skip_reason === "unmatched")
      .reduce((acc: any[], s) => {
        const existing = acc.find(a => a.name === s.employee_name);
        if (existing) { existing.scanCount++; }
        else { acc.push({ name: s.employee_name, scanCount: 1, fingerprint: s.fingerprint_number }); }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.scanCount - a.scanCount);

    const result = {
      source,
      totalParsedRows: rows.length,
      totalRawScansSaved: rawSaved,
      skippedOtherMonths: skippedOtherMonth,
      parseErrors,
      employeesMatched: matchedCount,
      recordsImported: imported,
      recordErrors: errors,
      attendanceDays: grouped.size,
      nightShiftsMerged: nightMerged,
      unmatchedEmployees: unmatchedList,
    };

    console.log("Result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
