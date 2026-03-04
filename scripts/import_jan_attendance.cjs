/**
 * Import January 2026 Attendance — HQ Peat + HQ Power
 * 
 * Reads the two combined Excel files, filters for January 2026 only,
 * matches employees against the Employee Hub (NO new registrations),
 * and upserts attendance records.
 * 
 * Run: node scripts/import_jan_attendance.cjs
 */

const XLSX = require('xlsx');
const https = require('https');
const path = require('path');

const SUPABASE_URL = 'https://edumcnnilpnbdxcjpchw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdW1jbm5pbHBuYmR4Y2pwY2h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMjU4MSwiZXhwIjoyMDgyOTA4NTgxfQ.K_h09txrwDdpnIZzT8d1sJOIRmlE3rQI94HcupKtY3U';

// ─── Supabase helpers ───

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
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data}`));
        else resolve(data ? JSON.parse(data) : null);
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
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
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

// ─── Name Matching (from import_attendance_v2.cjs) ───

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(name) {
  return name.toLowerCase().replace(/[._\-\/\\,;:()]+/g, ' ').replace(/\s+/g, ' ').replace(/\b(xxx|mr|mrs|ms|dr)\b/gi, '').trim();
}

function tokenize(name, knownTokens = null) {
  const normalized = normalize(name);
  let tokens = normalized.split(' ').filter(t => t.length > 0);
  if (knownTokens) {
    const expanded = [];
    for (const token of tokens) {
      const splits = trySplitConcatenated(token, knownTokens);
      expanded.push(...splits);
    }
    tokens = expanded;
  }
  return tokens;
}

function trySplitConcatenated(token, knownTokens) {
  if (token.length < 6) return [token];
  for (const known of knownTokens) {
    if (known.length < 3) continue;
    if (token.startsWith(known) && token.length > known.length) {
      const remainder = token.substring(known.length);
      if (remainder.length >= 2) {
        const remainderMatch = knownTokens.find(k => k === remainder || (k.length >= 4 && remainder.length >= 4 && levenshtein(k, remainder) <= 1));
        if (remainderMatch) return [known, remainderMatch];
        if (known.length >= 5 && remainder.length >= 4) return [known, remainder];
      }
    }
    if (token.endsWith(known) && token.length > known.length) {
      const prefix = token.substring(0, token.length - known.length);
      if (prefix.length >= 3) {
        const prefixMatch = knownTokens.find(k => k === prefix || (k.length >= 4 && prefix.length >= 4 && levenshtein(k, prefix) <= 1));
        if (prefixMatch) return [prefixMatch, known];
        if (known.length >= 5 && prefix.length >= 4) return [prefix, known];
      }
    }
  }
  return [token];
}

const COMMON_GIVEN_NAMES = new Set([
  'jean', 'pierre', 'emmanuel', 'claude', 'baptiste', 'marie', 'bosco',
  'damascene', 'joseph', 'eric', 'vincent', 'francois', 'alphonse',
  'alexandre', 'augustin', 'gaspard', 'alexis', 'janvier', 'celestin',
  'innocent', 'dieudonne', 'andre', 'david', 'daniel', 'paul', 'john',
  'peter', 'james', 'kumar', 'charles', 'aime', 'andrew', 'samuel',
  'de', 'dieu', 'nepomuscene', 'nepo', 'jmv',
]);

function wordRarity(word) {
  if (COMMON_GIVEN_NAMES.has(word)) return 0.3;
  if (word.length <= 2) return 0.1;
  if (word.length <= 3) return 0.5;
  return 1.0;
}

function wordMatchScore(word, other) {
  if (word === other) return 100;
  if (word.length >= 3 && other.length >= 3) {
    const minLen = Math.min(word.length, other.length);
    if (word.startsWith(other.substring(0, minLen)) || other.startsWith(word.substring(0, minLen))) {
      return Math.round((minLen / Math.max(word.length, other.length)) * 90);
    }
  }
  if (word.length >= 4 && other.length >= 4) {
    const maxLen = Math.max(word.length, other.length);
    const dist = levenshtein(word, other);
    const threshold = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;
    if (dist <= threshold) return Math.round(((maxLen - dist) / maxLen) * 85);
  }
  return 0;
}

function matchScore(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = tokensA.length <= tokensB.length ? tokensB : tokensA;
  let totalWeightedScore = 0, totalWeight = 0, rareWordMatched = false, unmatchedRealWords = 0;
  const usedIndices = new Set();
  for (const word of shorter) {
    const rarity = wordRarity(word);
    let bestScore = 0, bestIdx = -1;
    for (let i = 0; i < longer.length; i++) {
      if (usedIndices.has(i)) continue;
      const score = wordMatchScore(word, longer[i]);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestScore >= 50) {
      usedIndices.add(bestIdx);
      totalWeightedScore += bestScore * rarity;
      totalWeight += rarity;
      if (rarity >= 0.8 && bestScore >= 70) rareWordMatched = true;
    } else {
      totalWeight += rarity;
      if (word.length >= 4) unmatchedRealWords++;
    }
  }
  if (totalWeight === 0) return 0;
  let avgScore = totalWeightedScore / totalWeight;
  if (!rareWordMatched && shorter.length > 1) avgScore = Math.min(avgScore, 40);
  if (shorter.length >= 2 && unmatchedRealWords > 0) {
    const unusedFromLonger = longer.filter((_, i) => !usedIndices.has(i));
    const realUnusedFromLonger = unusedFromLonger.filter(w => w.length >= 4);
    if (realUnusedFromLonger.length > 0) avgScore = Math.min(avgScore, 50);
  }
  const countPenalty = shorter.length === 1 && longer.length > 2 ? 10 : 0;
  const coverageBonus = usedIndices.size === shorter.length && usedIndices.size === longer.length ? 5 : 0;
  return Math.max(0, Math.min(100, avgScore - countPenalty + coverageBonus));
}

function buildNameMatcher(employees) {
  const allTokens = new Set();
  employees.forEach(e => normalize(e.full_name || '').split(' ').filter(t => t.length >= 3).forEach(t => allTokens.add(t)));
  const knownTokens = [...allTokens];
  const empTokenized = employees.map(e => ({ ...e, tokens: tokenize(e.full_name || '', knownTokens), normalized: normalize(e.full_name || '') }));
  const empByFP = new Map();
  employees.forEach(e => { if (e.fingerprint_number) empByFP.set(e.fingerprint_number.trim(), e); });
  const matchCache = new Map();

  return function matchEmployee(bioName, fingerprint, companyId) {
    const cacheKey = `${bioName}|||${fingerprint || ''}|||${companyId || ''}`;
    if (matchCache.has(cacheKey)) return matchCache.get(cacheKey);

    const bioTokens = tokenize(bioName, knownTokens);
    const bioNormalized = normalize(bioName);

    // Filter employees to same company first for priority matching
    const sameCompanyEmps = companyId ? empTokenized.filter(e => e.company_id === companyId) : empTokenized;
    const allEmps = empTokenized;

    // Strategy 1: Fingerprint + name within same company
    if (fingerprint) {
      const fpMatch = empByFP.get(fingerprint.trim());
      if (fpMatch && (!companyId || fpMatch.company_id === companyId)) {
        const fpTokens = tokenize(fpMatch.full_name || '', knownTokens);
        const score = matchScore(bioTokens, fpTokens);
        if (score >= 55) {
          matchCache.set(cacheKey, { employee: fpMatch, score, method: 'fingerprint+name' });
          return matchCache.get(cacheKey);
        }
      }
    }

    // Strategy 2: Exact normalized name in same company
    const exactMatch = sameCompanyEmps.find(e => e.normalized === bioNormalized);
    if (exactMatch) {
      matchCache.set(cacheKey, { employee: exactMatch, score: 100, method: 'exact' });
      return matchCache.get(cacheKey);
    }

    // Strategy 3: Best fuzzy match in same company first, then all
    for (const pool of [sameCompanyEmps, allEmps]) {
      let bestMatch = null, bestScore = 0;
      for (const emp of pool) {
        const score = matchScore(bioTokens, emp.tokens);
        if (score > bestScore) { bestScore = score; bestMatch = emp; }
      }
      // Single-token matching
      if (bioTokens.length === 1) {
        for (const emp of pool) {
          if (emp.tokens.some(t => t === bioTokens[0] || levenshtein(t, bioTokens[0]) <= 1)) {
            const score = emp.tokens.length === 1 ? 95 : 75;
            if (score > bestScore) { bestScore = score; bestMatch = emp; }
          }
        }
      }
      if (bestScore >= 60 && bestMatch) {
        matchCache.set(cacheKey, { employee: bestMatch, score: bestScore, method: 'fuzzy' });
        return matchCache.get(cacheKey);
      }
    }

    matchCache.set(cacheKey, null);
    return null;
  };
}

// ─── Date/Time Parsing ───

function parseDateTime(val) {
  if (!val) return null;
  if (typeof val === 'number' || (typeof val === 'string' && /^\d+\.?\d*$/.test(val.trim()))) {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (num > 40000 && num < 60000) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + num * msPerDay);
    }
  }
  const str = String(val).trim();
  const ddMmmYy = str.match(/^(\d{1,2})-(\w{3})-(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (ddMmmYy) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const m = months[ddMmmYy[2].toLowerCase()];
    if (m !== undefined) {
      let y = parseInt(ddMmmYy[3]);
      if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
      return new Date(y, m, parseInt(ddMmmYy[1]), parseInt(ddMmmYy[4]), parseInt(ddMmmYy[5]), parseInt(ddMmmYy[6]));
    }
  }
  const mdY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (mdY) return new Date(parseInt(mdY[3]), parseInt(mdY[1]) - 1, parseInt(mdY[2]), parseInt(mdY[4]), parseInt(mdY[5]), parseInt(mdY[6] || '0'));
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function determineStatus(clockIn, isSaturday) {
  if (!clockIn) return 'absent';
  if (isSaturday) return 'half_day';
  const totalMin = clockIn.getHours() * 60 + clockIn.getMinutes();
  const inHour = clockIn.getHours();
  // Night shift detection: workers clocking in at 14:00+ are night shift
  if (inHour >= 14 || inHour < 4) return 'present';
  if (totalMin > 8 * 60 + 15) return 'late';
  return 'present';
}

function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return { total: 0, regular: 0, overtime: 0, shiftType: 'day' };
  let diffMs = clockOut.getTime() - clockIn.getTime();
  // Cross-midnight: if checkout is before checkin, add 24h
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
  const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
  const inHour = clockIn.getHours();
  // Night shift: clock-in at 14:00+ or before 04:00
  const shiftType = inHour >= 14 || inHour < 4 ? 'night' : 'day';
  const regularCap = 9;
  const regularHours = Math.min(totalHours, regularCap);
  const otMin = 30;
  const otMax = shiftType === 'day' ? 1.5 : 3;
  let overtimeHours = Math.max(0, totalHours - regularCap);
  if (overtimeHours * 60 < otMin) overtimeHours = 0;
  overtimeHours = Math.min(overtimeHours, otMax);
  return {
    total: Math.round(totalHours * 100) / 100,
    regular: Math.round(regularHours * 100) / 100,
    overtime: Math.round(overtimeHours * 100) / 100,
    shiftType
  };
}

// ─── Main ───

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   January 2026 Attendance Import — HQ Peat + HQ Power  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Company IDs
  const PEAT_ID = '1e1a6299-9342-44b4-9912-cf702b1c85bf';
  const POWER_ID = '51f11cc8-cf98-44e8-b545-032c1b34b1c0';
  const SERVICE_ID = '07d543a6-9403-4156-931c-b77933ded242';

  // 1. Fetch employees
  console.log('📥 Fetching employees from database...');
  const employees = await supabaseGet('employees', '?select=id,full_name,fingerprint_number,department_id,company_id&employment_status=neq.terminated&limit=500');
  console.log(`   Found ${employees.length} employees\n`);

  // 2. Build matcher
  console.log('🔧 Building advanced name matcher...');
  const matchEmployee = buildNameMatcher(employees);

  // 3. Read both Excel files
  const files = [
    { path: path.join(process.cwd(), 'Attendance', 'imports', 'HQ_Peat_From_Jan.xlsx'), defaultCompanyId: PEAT_ID, label: 'HQ Peat' },
    { path: path.join(process.cwd(), 'Attendance', 'imports', 'HQ_Power_From_Jan.xlsx'), defaultCompanyId: POWER_ID, label: 'HQ Power' },
  ];

  // Department text → company mapping for HQ Power file (which has HQ SERVICES entries)
  const deptCompanyMap = {
    'hq services': SERVICE_ID,
    'hq service': SERVICE_ID,
    'hq power': POWER_ID,
    'admn': null, // Use file default
    'admin': null,
  };

  const grouped = new Map(); // "employeeId|date" → { events: [], employee, name, deptId, fp }
  const rawScans = []; // ALL raw scans — nothing is skipped
  let totalRows = 0;
  let janRows = 0;
  let skippedNonJan = 0;
  let matchedRows = 0;
  const unmatchedNames = new Map();
  const matchLog = [];

  for (const file of files) {
    console.log(`\n📂 Processing ${file.label}: ${path.basename(file.path)}`);
    const wb = XLSX.readFile(file.path, { cellDates: false, raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

    let fileJanRows = 0;
    let fileMatchedRows = 0;
    let fileSkipped = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dept = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();
      const fp = String(row[2] || '').trim();
      const dateTimeVal = row[3];
      const statusVal = String(row[4] || '').trim();

      if (!name || !dateTimeVal) continue;
      totalRows++;

      const dateTime = parseDateTime(dateTimeVal);

      // Build raw scan record — EVERY row saved, nothing skipped
      const rawScan = {
        source_file: file.label,
        row_number: i,
        department_text: dept,
        employee_name: name,
        fingerprint_number: fp || null,
        scan_datetime: dateTime ? dateTime.toISOString() : null,
        scan_status: statusVal,
        scan_date: dateTime ? formatDate(dateTime) : null,
        is_matched: false,
        was_imported: false,
        skip_reason: null,
        matched_employee_id: null,
        matched_employee_name: null,
        match_score: null,
        match_method: null,
      };

      if (!dateTime) {
        rawScan.skip_reason = 'parse_error';
        rawScan.scan_datetime = new Date().toISOString();
        rawScan.scan_date = formatDate(new Date());
        rawScans.push(rawScan);
        continue;
      }

      // Keep ALL records — tag non-target months but don't discard
      if (dateTime.getFullYear() !== 2026 || dateTime.getMonth() !== 0) {
        skippedNonJan++;
        fileSkipped++;
        rawScan.skip_reason = 'wrong_month';
        rawScans.push(rawScan);
        continue;
      }

      janRows++;
      fileJanRows++;

      // Determine company from department column
      const deptLower = dept.toLowerCase();
      let companyId = file.defaultCompanyId;
      if (deptCompanyMap[deptLower] !== undefined) {
        companyId = deptCompanyMap[deptLower] || file.defaultCompanyId;
      }

      const result = matchEmployee(name, fp, companyId);
      if (!result) {
        const key = `${name.toLowerCase().trim()}|||${fp}`;
        if (!unmatchedNames.has(key)) {
          unmatchedNames.set(key, { bioName: name, fp, dept, count: 0, company: file.label });
        }
        unmatchedNames.get(key).count++;
        rawScan.skip_reason = 'unmatched';
        rawScans.push(rawScan);
        continue;
      }

      matchedRows++;
      fileMatchedRows++;
      const employee = result.employee;

      // Tag raw scan with match results
      rawScan.is_matched = true;
      rawScan.matched_employee_id = employee.id;
      rawScan.matched_employee_name = employee.full_name;
      rawScan.match_score = result.score;
      rawScan.match_method = result.method;
      rawScans.push(rawScan);

      const logKey = `${name}→${employee.full_name}`;
      if (!matchLog.some(l => l.key === logKey)) {
        matchLog.push({ key: logKey, bioName: name, hubName: employee.full_name, score: result.score, method: result.method, fp, company: file.label });
      }

      const dateKey = formatDate(dateTime);
      const groupKey = `${employee.id}|${dateKey}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { events: [], employee, name, deptId: employee.department_id, fp });
      }
      grouped.get(groupKey).events.push({ time: dateTime, status: statusVal });
    }

    console.log(`   Total rows: ${data.length - 1} | January: ${fileJanRows} | Matched: ${fileMatchedRows} | Non-Jan skipped: ${fileSkipped}`);
  }

  // 4. Report matching results
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  MATCHING RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`  Total biometric rows:    ${totalRows}`);
  console.log(`  January 2026 rows:       ${janRows}`);
  console.log(`  Non-January skipped:     ${skippedNonJan}`);
  console.log(`  Matched Jan rows:        ${matchedRows} (${janRows > 0 ? Math.round(matchedRows/janRows*100) : 0}%)`);
  console.log(`  Unmatched Jan rows:      ${janRows - matchedRows}`);
  console.log(`  Unique unmatched names:  ${unmatchedNames.size}`);
  console.log(`  Employee-day records:    ${grouped.size}\n`);

  // Show match details
  const byMethod = {};
  matchLog.forEach(l => {
    if (!byMethod[l.method]) byMethod[l.method] = [];
    byMethod[l.method].push(l);
  });

  for (const [method, matches] of Object.entries(byMethod)) {
    console.log(`  📌 ${method.toUpperCase()} matches (${matches.length}):`);
    matches.sort((a, b) => a.score - b.score).forEach(m => {
      const scoreBar = '█'.repeat(Math.round(m.score / 10)) + '░'.repeat(10 - Math.round(m.score / 10));
      const indicator = m.score >= 80 ? '✅' : m.score >= 60 ? '🟡' : '🟠';
      console.log(`     ${indicator} ${scoreBar} ${m.score}% [${m.company}] "${m.bioName}" → "${m.hubName}"`);
    });
    console.log('');
  }

  // Show unmatched — THIS IS THE LIST THE USER ASKED FOR
  if (unmatchedNames.size > 0) {
    console.log('  ╔═══════════════════════════════════════════════════════╗');
    console.log('  ║  ⚠️  UNMATCHED EMPLOYEES — NOT FOUND IN EMPLOYEE HUB  ║');
    console.log('  ║  These were NOT imported. Please verify manually.    ║');
    console.log('  ╚═══════════════════════════════════════════════════════╝\n');
    [...unmatchedNames.values()]
      .sort((a, b) => b.count - a.count)
      .forEach(u => {
        console.log(`     ❌ [FP:${u.fp.padStart(4)}] [${u.company.padEnd(8)}] ${u.dept.padEnd(18)} "${u.bioName}" (${u.count} events)`);
      });
    console.log('');
  }

  // 5. Cross-midnight night shift consolidation
  // Workers clocking in at 14:00-23:59 and checking out next morning (00:00-08:00)
  // need their next-day morning events merged into the previous day's record
  console.log('\n🌙 Consolidating cross-midnight night shifts...');
  let nightShiftsMerged = 0;

  const groupKeys = [...grouped.keys()];
  for (const key of groupKeys) {
    const group = grouped.get(key);
    if (!group) continue;
    const [employeeId, dateStr] = key.split('|');
    const sortedEvents = group.events.sort((a, b) => a.time.getTime() - b.time.getTime());
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const lastHour = lastEvent.time.getHours();

    // If last event is in the afternoon/evening (>=14:00), check if next day has early morning events
    if (lastHour >= 14 || (sortedEvents[0] && sortedEvents[0].time.getHours() >= 14)) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      const nextDateStr = formatDate(d);
      const nextKey = `${employeeId}|${nextDateStr}`;
      const nextGroup = grouped.get(nextKey);

      if (nextGroup) {
        const nextEvents = nextGroup.events.sort((a, b) => a.time.getTime() - b.time.getTime());
        // Find morning events (before 08:00) on the next day
        const morningEvents = nextEvents.filter(e => e.time.getHours() < 8);
        const remainingEvents = nextEvents.filter(e => e.time.getHours() >= 8);

        if (morningEvents.length > 0) {
          // Merge morning events into current day's record (adjust date to next day for proper timestamp)
          group.events.push(...morningEvents);
          nightShiftsMerged++;

          if (remainingEvents.length > 0) {
            // Keep remaining events as a separate day record
            nextGroup.events = remainingEvents;
          } else {
            // Remove next day's record entirely
            grouped.delete(nextKey);
          }
        }
      }
    }
  }
  console.log(`   Merged ${nightShiftsMerged} cross-midnight night shifts\n`);

  // 6. Build attendance records using First-In / Last-Out logic
  const records = [];
  grouped.forEach((group, key) => {
    const [employeeId, dateStr] = key.split('|');
    const sortedEvents = group.events.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // First-In / Last-Out
    const clockInEvents = sortedEvents.filter(e => 
      e.status.toLowerCase().includes('in') || e.status.toLowerCase().includes('c/in')
    );
    const clockOutEvents = sortedEvents.filter(e => 
      e.status.toLowerCase().includes('out') || e.status.toLowerCase().includes('c/out') || e.status.toLowerCase().includes('overtime out')
    );

    let clockIn, clockOut;
    if (clockInEvents.length > 0) {
      clockIn = clockInEvents[0].time; // First check-in
    } else {
      clockIn = sortedEvents[0].time; // Fallback to first event
    }
    if (clockOutEvents.length > 0) {
      clockOut = clockOutEvents[clockOutEvents.length - 1].time; // Last check-out
    } else if (sortedEvents.length > 1) {
      clockOut = sortedEvents[sortedEvents.length - 1].time; // Last event
    } else {
      clockOut = null;
    }

    // Don't use same timestamp for both in and out
    if (clockIn && clockOut && Math.abs(clockIn.getTime() - clockOut.getTime()) < 60000) {
      clockOut = null;
    }

    const date = new Date(dateStr);
    const isSaturday = date.getDay() === 6;
    const status = determineStatus(clockIn, isSaturday);
    const hours = calculateHours(clockIn, clockOut);

    records.push({
      user_id: employeeId,
      department_id: group.deptId,
      attendance_date: dateStr,
      clock_in: clockIn ? clockIn.toISOString() : null,
      clock_out: clockOut ? clockOut.toISOString() : null,
      status,
      shift_type: hours.shiftType,
      total_hours: hours.total,
      regular_hours: hours.regular,
      overtime_hours: hours.overtime,
      notes: `Imported from biometric Jan 2026 | ${group.name} | FP:${group.fp} | Events: ${sortedEvents.length}`,
    });
  });

  console.log(`📤 Prepared ${records.length} January attendance records for upsert\n`);

  // 6. Upsert in batches (merge on user_id + attendance_date)
  const BATCH_SIZE = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      await supabaseRequest('POST', 'attendance_records', batch, '?on_conflict=user_id,attendance_date');
      imported += batch.length;
      process.stdout.write(`\r  Importing: ${imported}/${records.length}`);
    } catch (err) {
      errors += batch.length;
      console.error(`\n  ❌ Batch error at ${i}: ${err.message.substring(0, 200)}`);
      // Try individual records in failed batch
      for (const rec of batch) {
        try {
          await supabaseRequest('POST', 'attendance_records', [rec], '?on_conflict=user_id,attendance_date');
          imported++;
          errors--;
        } catch (e2) {
          console.error(`     ❌ Record error for ${rec.user_id} on ${rec.attendance_date}: ${e2.message.substring(0, 100)}`);
        }
      }
    }
  }

  // 7. Auto-save fingerprint numbers for employees that don't have one yet
  let fpSaved = 0;
  for (const match of matchLog) {
    if (match.fp && match.fp !== '') {
      const emp = employees.find(e => e.full_name === match.hubName);
      if (emp && !emp.fingerprint_number) {
        try {
          await supabaseRequest('PATCH', `employees?id=eq.${emp.id}`, { fingerprint_number: match.fp });
          fpSaved++;
          console.log(`\n  🔗 Saved FP ${match.fp} for ${emp.full_name}`);
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  console.log(`\n\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  JANUARY 2026 IMPORT COMPLETE                           ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  ✅ Imported:      ${String(imported).padStart(5)} records                     ║`);
  console.log(`║  ❌ Errors:        ${String(errors).padStart(5)} records                     ║`);
  console.log(`║  🔗 Matched:       ${String(matchLog.length).padStart(5)} unique employees             ║`);
  console.log(`║  ❓ Unmatched:     ${String(unmatchedNames.size).padStart(5)} unique employees             ║`);
  console.log(`║  🔑 FP saved:      ${String(fpSaved).padStart(5)} employees                   ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
  
  if (unmatchedNames.size > 0) {
    console.log('\n⚠️  REMINDER: The unmatched employees listed above were NOT imported.');
    console.log('   Please add them to the Employee Hub first, then re-run this script.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
