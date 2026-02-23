/**
 * Import Attendance Data from Daily Biometric Excel Files
 * 
 * Reads all daily attendance files from:
 * - Attendance/HQ Peat/January/*.xlsx
 * - Attendance/HQ Peat/February/*.xlsx
 * - Attendance/HQ Power/*.xlsx
 * 
 * And imports them into attendance_records table in Supabase.
 * 
 * Uses First-In / Last-Out logic per employee per day.
 * Matches employees by name + fingerprint number.
 * 
 * Run: node scripts/import_attendance.cjs
 */

const XLSX = require('xlsx');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://edumcnnilpnbdxcjpchw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdW1jbm5pbHBuYmR4Y2pwY2h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMjU4MSwiZXhwIjoyMDgyOTA4NTgxfQ.K_h09txrwDdpnIZzT8d1sJOIRmlE3rQI94HcupKtY3U';

function supabaseRequest(method, endpoint, body = null, query = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}${query}`);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${data}`));
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function supabaseGet(endpoint, query = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}${query}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data}`));
        else resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}

function normalizeName(n) {
  return n.toLowerCase().replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function namesMatch(a, b) {
  const aParts = normalizeName(a).split(' ').filter(p => p.length > 2);
  const bParts = normalizeName(b).split(' ').filter(p => p.length > 2);
  if (aParts.length === 0 || bParts.length === 0) return false;
  const shorter = aParts.length <= bParts.length ? aParts : bParts;
  const longer = aParts.length <= bParts.length ? bParts : aParts;
  let matched = 0;
  for (const word of shorter) {
    if (longer.some(w => w === word || (word.length >= 5 && w.startsWith(word)) || (w.length >= 5 && word.startsWith(w)))) {
      matched++;
    }
  }
  if (shorter.length === 1) return matched === 1 && longer.length === 1;
  return matched >= 2;
}

function parseDateTime(val) {
  if (!val) return null;
  
  // Excel serial number (e.g., 46042.70706018519)
  if (typeof val === 'number' || (typeof val === 'string' && /^\d+\.\d+$/.test(val.trim()))) {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (num > 40000 && num < 60000) {
      // Excel serial date: days since 1900-01-01 (with the 1900 leap year bug)
      const msPerDay = 24 * 60 * 60 * 1000;
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899 to account for Excel's bug
      return new Date(excelEpoch.getTime() + num * msPerDay);
    }
  }
  
  const str = String(val).trim();
  
  // Try pattern: "dd-MMM-yy HH:mm:ss" (e.g., "03-Feb-26 16:56:31")
  const ddMmmYy = str.match(/^(\d{1,2})-(\w{3})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (ddMmmYy) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const m = months[ddMmmYy[2].toLowerCase()];
    if (m !== undefined) {
      let y = parseInt(ddMmmYy[3]);
      y = y < 50 ? 2000 + y : 1900 + y;
      return new Date(y, m, parseInt(ddMmmYy[1]), parseInt(ddMmmYy[4]), parseInt(ddMmmYy[5]), parseInt(ddMmmYy[6]));
    }
  }
  
  // Try pattern: "M/d/yyyy H:mm:ss" (e.g., "2/10/2026 8:03:21")
  const mdY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (mdY) {
    return new Date(parseInt(mdY[3]), parseInt(mdY[1]) - 1, parseInt(mdY[2]), parseInt(mdY[4]), parseInt(mdY[5]), parseInt(mdY[6] || '0'));
  }

  // Fallback
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatISO(d) {
  return d.toISOString();
}

function determineStatus(clockIn, clockOut) {
  if (!clockIn) return 'absent';
  const hour = clockIn.getHours();
  const min = clockIn.getMinutes();
  const totalMin = hour * 60 + min;
  // Late if after 08:15
  if (totalMin > 8 * 60 + 15) return 'late';
  return 'present';
}

function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return { total: 0, regular: 0, overtime: 0, shiftType: 'day' };
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
  
  // Determine shift type
  const inHour = clockIn.getHours();
  const shiftType = inHour >= 18 || inHour < 4 ? 'night' : 'day';
  
  const regularHours = Math.min(totalHours, 8);
  const overtimeHours = Math.max(0, totalHours - 8);
  
  return { total: Math.round(totalHours * 100) / 100, regular: Math.round(regularHours * 100) / 100, overtime: Math.round(overtimeHours * 100) / 100, shiftType };
}

async function main() {
  console.log('=== Attendance Import Script ===\n');

  // 1. Fetch all employees from Supabase
  console.log('Fetching employees...');
  const employees = await supabaseGet('employees', '?select=id,full_name,fingerprint_number,department_id,company_id&limit=500');
  console.log(`Found ${employees.length} employees\n`);

  // Build lookup maps
  const empByFingerprint = new Map();
  const empByName = new Map();
  employees.forEach(e => {
    if (e.fingerprint_number) empByFingerprint.set(e.fingerprint_number.trim(), e);
    empByName.set(normalizeName(e.full_name || ''), e);
  });

  function matchEmployee(name, fingerprint) {
    // Try fingerprint + name validation
    if (fingerprint) {
      const fp = fingerprint.trim();
      const empFP = empByFingerprint.get(fp);
      if (empFP && (normalizeName(empFP.full_name || '') === normalizeName(name) || namesMatch(name, empFP.full_name || ''))) {
        return empFP;
      }
    }
    // Try exact name
    const exact = empByName.get(normalizeName(name));
    if (exact) return exact;
    // Try fuzzy name
    for (const e of employees) {
      if (namesMatch(name, e.full_name || '')) return e;
    }
    return null;
  }

  // 2. Collect all daily files
  const attendanceDir = path.join(process.cwd(), 'Attendance');
  const files = [];

  // HQ Peat January
  const peatJanDir = path.join(attendanceDir, 'HQ Peat', 'January');
  if (fs.existsSync(peatJanDir)) {
    fs.readdirSync(peatJanDir).filter(f => f.endsWith('.xlsx')).forEach(f => {
      files.push({ path: path.join(peatJanDir, f), company: 'HQ Peat', period: 'January' });
    });
  }

  // HQ Peat February
  const peatFebDir = path.join(attendanceDir, 'HQ Peat', 'February');
  if (fs.existsSync(peatFebDir)) {
    fs.readdirSync(peatFebDir).filter(f => f.endsWith('.xlsx')).forEach(f => {
      files.push({ path: path.join(peatFebDir, f), company: 'HQ Peat', period: 'February' });
    });
  }

  // HQ Power
  const powerDir = path.join(attendanceDir, 'HQ Power');
  if (fs.existsSync(powerDir)) {
    fs.readdirSync(powerDir).filter(f => f.endsWith('.xlsx')).forEach(f => {
      files.push({ path: path.join(powerDir, f), company: 'HQ Power', period: 'February' });
    });
  }

  console.log(`Found ${files.length} daily attendance files:\n`);
  files.forEach(f => console.log(`  ${f.company}/${path.basename(f.path)}`));
  console.log('');

  // 3. Parse all files and group by employee+date (First-In / Last-Out)
  const grouped = new Map(); // key: "employeeId|date" -> { events: [], employee, name }
  let totalRows = 0;
  let unmatchedNames = new Set();
  let matchedCount = 0;

  for (const file of files) {
    const wb = XLSX.readFile(file.path, { cellDates: false, raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dept = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();
      const fp = String(row[2] || '').trim();
      const dateTimeStr = String(row[3] || '').trim();
      const status = String(row[4] || '').trim(); // C/In or C/Out

      if (!name || !dateTimeStr) continue;
      totalRows++;

      const dateTime = parseDateTime(dateTimeStr);
      if (!dateTime) {
        console.warn(`  Could not parse date: "${dateTimeStr}" for ${name}`);
        continue;
      }

      const employee = matchEmployee(name, fp);
      if (!employee) {
        unmatchedNames.add(name);
        continue;
      }
      matchedCount++;

      const dateKey = formatDate(dateTime);
      const groupKey = `${employee.id}|${dateKey}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { events: [], employee, name, deptId: employee.department_id });
      }
      grouped.get(groupKey).events.push(dateTime);
    }
  }

  console.log(`\nParsed ${totalRows} total rows`);
  console.log(`Matched: ${matchedCount}`);
  console.log(`Unmatched names (${unmatchedNames.size}):`);
  [...unmatchedNames].sort().forEach(n => console.log(`  ❌ ${n}`));
  console.log(`\nGrouped into ${grouped.size} employee-day records\n`);

  // 4. Build attendance records
  const records = [];
  grouped.forEach((group, key) => {
    const [employeeId, dateStr] = key.split('|');
    
    // Sort events chronologically
    const sortedEvents = group.events.sort((a, b) => a.getTime() - b.getTime());
    const clockIn = sortedEvents[0]; // First event = check-in
    const clockOut = sortedEvents.length > 1 ? sortedEvents[sortedEvents.length - 1] : null; // Last event = check-out

    const status = determineStatus(clockIn, clockOut);
    const hours = calculateHours(clockIn, clockOut);

    records.push({
      user_id: employeeId,
      department_id: group.deptId,
      attendance_date: dateStr,
      clock_in: clockIn ? formatISO(clockIn) : null,
      clock_out: clockOut ? formatISO(clockOut) : null,
      status: status,
      shift_type: hours.shiftType,
      total_hours: hours.total,
      regular_hours: hours.regular,
      overtime_hours: hours.overtime,
      notes: `Imported from ${group.name} biometric | Events: ${sortedEvents.length}`,
    });
  });

  console.log(`Prepared ${records.length} attendance records for import\n`);

  // 5. Upsert in batches
  const BATCH_SIZE = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      await supabaseRequest('POST', 'attendance_records', batch, '?on_conflict=user_id,attendance_date');
      imported += batch.length;
      process.stdout.write(`\r  Imported: ${imported}/${records.length}`);
    } catch (err) {
      errors += batch.length;
      console.error(`\n  Error in batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
    }
  }

  console.log(`\n\n=== Import Complete ===`);
  console.log(`Successfully imported: ${imported} records`);
  console.log(`Errors: ${errors}`);
  console.log(`Unmatched employees: ${unmatchedNames.size}`);

  // 6. Auto-save fingerprint numbers for matched employees that don't have one
  let fpUpdated = 0;
  const fpSeen = new Set();
  grouped.forEach((group) => {
    const emp = group.employee;
    if (!emp.fingerprint_number && !fpSeen.has(emp.id)) {
      fpSeen.add(emp.id);
      // We can try to find the fingerprint from the parsed data
      // but we'd need to track it per employee - skip for now
    }
  });
  if (fpUpdated > 0) console.log(`Updated ${fpUpdated} fingerprint numbers`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
