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

interface ParsedScan {
  department: string;
  name: string;
  fingerprint: string;
  dateTime: Date;
  status: string;
  rowNum: number;
  originalDateTimeStr: string;
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
    const parsedRows: { department: string; name: string; fingerprint: string; dateTime: string; status: string; rowNum: number }[] = [];
    
    let rowNum = 0;
    for (const line of lines) {
      rowNum++;
      if (!line.startsWith("|") || line.includes("Department") || line.includes("|-")) continue;
      const parts = line.split("|").filter(p => p.trim() !== "");
      if (parts.length >= 5) {
        parsedRows.push({
          department: parts[0].trim(),
          name: parts[1].trim(),
          fingerprint: parts[2].trim(),
          dateTime: parts[3].trim(),
          status: parts[4].trim(),
          rowNum,
        });
      }
    }

    console.log(`Parsed ${parsedRows.length} rows from markdown`);

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

    // ═══ STEP 1: Parse all scans, match employees, save raw scans ═══
    // We do NOT filter by month yet — we need next-morning checkouts for night shifts
    const rawScans: any[] = [];
    const allMatchedScans: { 
      employeeId: string; 
      employee: Employee; 
      name: string; 
      dt: Date; 
      status: string;
      scanDate: string;
    }[] = [];
    let matchedCount = 0;
    let parseErrors = 0;

    for (const row of parsedRows) {
      if (!row.name || !row.dateTime) continue;
      const dt = parseDateTime(row.dateTime);

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

      // Keep ALL matched scans regardless of month — we'll filter after consolidation
      allMatchedScans.push({
        employeeId: result.employee.id,
        employee: result.employee,
        name: row.name,
        dt,
        status: row.status,
        scanDate: formatDate(dt),
      });
    }

    console.log(`Raw scans: ${rawScans.length}, Matched: ${matchedCount}, ParseErrors: ${parseErrors}`);

    // ═══ STEP 2: Save ALL raw scans ═══
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

    // ═══ STEP 3: Sort all scans by employee then datetime ═══
    allMatchedScans.sort((a, b) => {
      if (a.employeeId !== b.employeeId) return a.employeeId.localeCompare(b.employeeId);
      return a.dt.getTime() - b.dt.getTime();
    });

    // ═══ STEP 4: Pair C/In with C/Out using scan status + cross-date detection ═══
    // Group consecutive scans per employee into shifts
    interface ShiftRecord {
      employeeId: string;
      employee: Employee;
      name: string;
      clockIn: Date;
      clockOut: Date | null;
      attendanceDate: string; // The date this shift belongs to (clock-in date)
      events: Date[];
    }

    const shifts: ShiftRecord[] = [];
    
    // Group scans by employee
    const scansByEmployee = new Map<string, typeof allMatchedScans>();
    for (const scan of allMatchedScans) {
      if (!scansByEmployee.has(scan.employeeId)) {
        scansByEmployee.set(scan.employeeId, []);
      }
      scansByEmployee.get(scan.employeeId)!.push(scan);
    }

    for (const [employeeId, scans] of scansByEmployee) {
      // Strategy: Walk through scans chronologically and pair them into shifts
      // A night shift is detected when:
      //   1. C/In is in the evening (hour >= 14) and C/Out is next morning (hour < 12)
      //   2. Explicit C/In status followed by C/Out status on next calendar day
      //   3. Two scans on different dates within 16 hours of each other
      
      let i = 0;
      while (i < scans.length) {
        const current = scans[i];
        const currentHour = current.dt.getHours();
        const isEveningEntry = currentHour >= 14;
        const isCIn = current.status?.toUpperCase().includes("C/IN") || 
                      current.status?.toUpperCase().includes("IN") ||
                      current.status?.toUpperCase() === "C/IN";
        const isCOut = current.status?.toUpperCase().includes("C/OUT") || 
                       current.status?.toUpperCase().includes("OUT") ||
                       current.status?.toUpperCase() === "C/OUT";

        // Look ahead for a matching checkout
        let pairedIdx = -1;
        
        for (let j = i + 1; j < scans.length; j++) {
          const next = scans[j];
          const timeDiffHours = (next.dt.getTime() - current.dt.getTime()) / 3600000;
          
          // Don't pair scans more than 18 hours apart
          if (timeDiffHours > 18) break;
          
          const nextIsCOut = next.status?.toUpperCase().includes("C/OUT") || 
                             next.status?.toUpperCase().includes("OUT") ||
                             next.status?.toUpperCase() === "C/OUT";
          const nextHour = next.dt.getHours();
          
          // Case 1: Same day, different times — normal shift or multiple scans
          if (next.scanDate === current.scanDate) {
            pairedIdx = j; // Keep looking, take the last scan on same day
            continue;
          }
          
          // Case 2: Cross-date night shift — evening C/In + next morning C/Out
          if (next.scanDate !== current.scanDate && isEveningEntry && nextHour < 12) {
            // This is a night shift! Pair the evening entry with morning exit
            pairedIdx = j;
            break; // Found the cross-date pair
          }
          
          // Case 3: Explicit C/In + C/Out across dates within reasonable time
          if (next.scanDate !== current.scanDate && isCIn && nextIsCOut && timeDiffHours <= 16) {
            pairedIdx = j;
            break;
          }
          
          // If we hit a different date without matching, stop
          if (next.scanDate !== current.scanDate) break;
        }

        const shift: ShiftRecord = {
          employeeId,
          employee: current.employee,
          name: current.name,
          clockIn: current.dt,
          clockOut: null,
          attendanceDate: current.scanDate,
          events: [current.dt],
        };

        if (pairedIdx >= 0) {
          // Collect all events between i and pairedIdx
          for (let k = i + 1; k <= pairedIdx; k++) {
            shift.events.push(scans[k].dt);
          }
          // Sort events — first = clock in, last = clock out
          shift.events.sort((a, b) => a.getTime() - b.getTime());
          shift.clockIn = shift.events[0];
          shift.clockOut = shift.events[shift.events.length - 1];
          // Attendance date is always the clock-in date
          shift.attendanceDate = formatDate(shift.clockIn);
          i = pairedIdx + 1;
        } else {
          // Lone scan — no pair found
          // If it's a C/Out in the early morning, it might be an orphan checkout
          // from a night shift whose C/In was in the previous month
          if (isCOut && currentHour < 12) {
            // Try to find if there's a previous evening entry we missed
            // Otherwise record it as a standalone scan on its date
            // We'll attach it to the previous day as a night shift
            const prevDay = new Date(current.dt);
            prevDay.setDate(prevDay.getDate() - 1);
            shift.attendanceDate = formatDate(prevDay);
            shift.clockOut = current.dt;
            // Mark clock in as estimated from previous evening
            const estimatedIn = new Date(prevDay);
            estimatedIn.setHours(18, 0, 0, 0);
            shift.clockIn = estimatedIn;
          }
          i++;
        }

        shifts.push(shift);
      }
    }

    console.log(`Total shifts detected: ${shifts.length}`);

    // ═══ STEP 5: Filter shifts — keep only those whose attendance_date is in target month ═══
    const targetYear = 2026;
    const filteredShifts = shifts.filter(s => {
      const d = new Date(s.attendanceDate + "T12:00:00");
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    let skippedOtherMonth = shifts.length - filteredShifts.length;
    console.log(`Shifts in target month: ${filteredShifts.length}, skipped other months: ${skippedOtherMonth}`);

    // ═══ STEP 6: Deduplicate — if multiple shifts on same employee+date, merge them ═══
    const shiftMap = new Map<string, ShiftRecord>();
    let nightShiftCount = 0;

    for (const shift of filteredShifts) {
      const key = `${shift.employeeId}|${shift.attendanceDate}`;
      const existing = shiftMap.get(key);
      
      if (!existing) {
        shiftMap.set(key, shift);
      } else {
        // Merge: use earliest clock-in and latest clock-out
        const allEvents = [...existing.events, ...shift.events].sort((a, b) => a.getTime() - b.getTime());
        existing.events = allEvents;
        existing.clockIn = allEvents[0];
        existing.clockOut = allEvents[allEvents.length - 1];
      }
    }

    // ═══ STEP 7: Build attendance records ═══
    const records: any[] = [];
    shiftMap.forEach((shift, key) => {
      const [employeeId, dateStr] = key.split("|");
      const clockIn = shift.clockIn;
      const clockOut = shift.clockOut;
      
      const hasMeaningfulClockOut = clockOut && Math.abs(clockOut.getTime() - clockIn.getTime()) >= 60000;
      const inHour = clockIn.getHours();
      const isNightShift = inHour >= 14 || inHour < 4;
      const shiftType = isNightShift ? "night" : "day";
      
      if (isNightShift) nightShiftCount++;
      
      const status = determineStatus(clockIn, dateStr);

      let totalHours = 0, regularHours = 0, overtimeHours = 0;

      if (hasMeaningfulClockOut) {
        let diffMs = clockOut!.getTime() - clockIn.getTime();
        // Cross-midnight: if checkout is before checkin time-of-day, add 24h
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
        department_id: shift.employee.department_id,
        attendance_date: dateStr,
        clock_in: clockIn.toISOString(),
        clock_out: hasMeaningfulClockOut ? clockOut!.toISOString() : null,
        status,
        shift_type: shiftType,
        total_hours: totalHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        notes: `Imported from ${source} | ${shift.name} | Events: ${shift.events.length} | Shift: ${shiftType}`,
      });
    });

    console.log(`Prepared ${records.length} records (${nightShiftCount} night shifts)`);

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
      totalParsedRows: parsedRows.length,
      totalRawScansSaved: rawSaved,
      skippedOtherMonths: skippedOtherMonth,
      parseErrors,
      employeesMatched: matchedCount,
      recordsImported: imported,
      recordErrors: errors,
      attendanceDays: shiftMap.size,
      nightShiftsDetected: nightShiftCount,
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
