import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttendanceRow {
  department: string;
  name: string;
  fingerprint: string;
  dateTime: string;
  status: string;
}

interface Employee {
  id: string;
  full_name: string;
  fingerprint_number: string | null;
  department_id: string;
  company_name: string;
}

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
  // Pattern: "dd-MMM-yy H:mm:ss"
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

function determineStatus(clockIn: Date, clockOut: Date | null, dateStr: string): string {
  const dayOfWeek = new Date(dateStr).getDay(); // 0=Sun, 6=Sat
  if (dayOfWeek === 6) return "half_day"; // Saturday
  
  const hour = clockIn.getHours();
  const min = clockIn.getMinutes();
  const totalMin = hour * 60 + min;
  if (totalMin > 8 * 60 + 15) return "late";
  return "present";
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

    const { rows, source } = await req.json() as { rows: AttendanceRow[]; source: string };

    console.log(`Processing ${rows.length} rows from ${source}`);

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

    // Build lookup maps
    const empByFingerprint = new Map<string, Employee>();
    empList.forEach((e) => {
      if (e.fingerprint_number) empByFingerprint.set(e.fingerprint_number.trim(), e);
    });

    function matchEmployee(name: string, fp: string, fileSource: string): Employee | null {
      // Try fingerprint first (only if name also matches)
      if (fp) {
        const empFP = empByFingerprint.get(fp);
        if (empFP && namesMatch(name, empFP.full_name)) {
          return empFP;
        }
      }
      // Try exact normalized name
      const norm = normalizeName(name);
      for (const e of empList) {
        if (normalizeName(e.full_name) === norm) return e;
      }
      // Try fuzzy name match, preferring same company
      const companyHint = fileSource.includes("Peat") ? "HQ Peat" : fileSource.includes("Power") ? "HQ Power" : "";
      let bestMatch: Employee | null = null;
      for (const e of empList) {
        if (namesMatch(name, e.full_name)) {
          if (companyHint && e.company_name === companyHint) return e;
          if (!bestMatch) bestMatch = e;
        }
      }
      return bestMatch;
    }

    // Filter January only and parse
    const grouped = new Map<string, { events: Date[]; employee: Employee; name: string }>();
    const unmatchedNames = new Set<string>();
    let matchedCount = 0;
    let skippedNonJan = 0;

    for (const row of rows) {
      if (!row.name || !row.dateTime) continue;

      const dt = parseDateTime(row.dateTime);
      if (!dt) continue;

      // Filter: January 2026 only
      if (dt.getMonth() !== 0 || dt.getFullYear() !== 2026) {
        skippedNonJan++;
        continue;
      }

      const employee = matchEmployee(row.name, row.fingerprint, source);
      if (!employee) {
        unmatchedNames.add(row.name);
        continue;
      }
      matchedCount++;

      const dateKey = formatDate(dt);
      const groupKey = `${employee.id}|${dateKey}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { events: [], employee, name: row.name });
      }
      grouped.get(groupKey)!.events.push(dt);
    }

    console.log(`Matched: ${matchedCount}, Unmatched names: ${unmatchedNames.size}, Skipped non-Jan: ${skippedNonJan}, Groups: ${grouped.size}`);

    // Build attendance records
    const records: any[] = [];
    grouped.forEach((group, key) => {
      const [employeeId, dateStr] = key.split("|");
      const sortedEvents = group.events.sort((a, b) => a.getTime() - b.getTime());
      const clockIn = sortedEvents[0];
      const clockOut = sortedEvents.length > 1 ? sortedEvents[sortedEvents.length - 1] : null;

      // Skip if clockIn and clockOut are within 1 minute (likely duplicate scan)
      if (clockOut && Math.abs(clockOut.getTime() - clockIn.getTime()) < 60000) {
        // Only clockIn, no real clockOut
        const status = determineStatus(clockIn, null, dateStr);
        const inHour = clockIn.getHours();
        const shiftType = inHour >= 18 || inHour < 4 ? "night" : "day";
        records.push({
          user_id: employeeId,
          department_id: group.employee.department_id,
          attendance_date: dateStr,
          clock_in: clockIn.toISOString(),
          clock_out: null,
          status,
          shift_type: shiftType,
          total_hours: 0,
          regular_hours: 0,
          overtime_hours: 0,
          notes: `Imported from ${source} | ${group.name} | Events: ${sortedEvents.length}`,
        });
        return;
      }

      const status = determineStatus(clockIn, clockOut, dateStr);
      const inHour = clockIn.getHours();
      const shiftType = inHour >= 18 || inHour < 4 ? "night" : "day";

      let totalHours = 0;
      let regularHours = 0;
      let overtimeHours = 0;

      if (clockOut) {
        totalHours = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60));
        totalHours = Math.round(totalHours * 100) / 100;

        if (status === "half_day") {
          regularHours = Math.min(totalHours, 4);
          overtimeHours = 0;
        } else {
          regularHours = Math.min(totalHours, 8);
          overtimeHours = Math.max(0, totalHours - 8);
          // Cap overtime
          if (shiftType === "day") overtimeHours = Math.min(overtimeHours, 1.5);
          else overtimeHours = Math.min(overtimeHours, 3);
        }
        regularHours = Math.round(regularHours * 100) / 100;
        overtimeHours = Math.round(overtimeHours * 100) / 100;
      }

      records.push({
        user_id: employeeId,
        department_id: group.employee.department_id,
        attendance_date: dateStr,
        clock_in: clockIn.toISOString(),
        clock_out: clockOut ? clockOut.toISOString() : null,
        status,
        shift_type: shiftType,
        total_hours: totalHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        notes: `Imported from ${source} | ${group.name} | Events: ${sortedEvents.length}`,
      });
    });

    console.log(`Prepared ${records.length} attendance records`);

    // Upsert in batches
    let imported = 0;
    let errors = 0;
    const batchSize = 50;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from("attendance_records")
        .upsert(batch, { onConflict: "user_id,attendance_date" });

      if (error) {
        console.error(`Batch error at ${i}: ${error.message}`);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
    }

    const result = {
      source,
      totalRows: rows.length,
      januaryRows: matchedCount + unmatchedNames.size,
      skippedNonJanuary: skippedNonJan,
      matched: matchedCount,
      imported,
      errors,
      unmatchedEmployees: [...unmatchedNames].sort(),
    };

    console.log("Import complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
