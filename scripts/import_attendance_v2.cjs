/**
 * Import Attendance Data v2 — Advanced Name Matching
 * 
 * Handles all the real-world differences between biometric device names
 * and Employee Hub names:
 * 
 * 1. Name order reversed: "Shillu John" ↔ "John Shillu"
 * 2. Dots/punctuation: "Nzabamwita.Pascal" ↔ "NZABAMWITA PASCAL"
 * 3. Spelling variations: "GIDEON" ↔ "GEDEON" (Levenshtein distance)
 * 4. Concatenated names: "Ishimwejpierre" ↔ "JEAN PIERRE ISHIMWE"
 * 5. Truncated names: "DIDIER FABRI" ↔ "DIDIER FABRICE"
 * 6. Single-name matching: "Rajbali" ↔ "RAJBALI XXX"
 * 7. Prefix/suffix matching: "MACUMI JMV" ↔ "MACUMI JEAN MARIE"
 * 8. Fingerprint cross-validation for ambiguous cases
 * 
 * Run: node scripts/import_attendance_v2.cjs
 */

const XLSX = require('xlsx');
const https = require('https');
const fs = require('fs');
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

// ─── Advanced Name Matching Engine ───

/**
 * Levenshtein distance — counts minimum edits to transform one string into another.
 * Used for spelling variations like "GIDEON" vs "GEDEON".
 */
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

/**
 * Normalize a name for comparison:
 * - lowercase
 * - remove dots, dashes, underscores → spaces
 * - collapse multiple spaces
 * - remove common filler words (xxx, etc.)
 */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[._\-\/\\,;:()]+/g, ' ')  // dots, dashes → spaces
    .replace(/\s+/g, ' ')                // collapse spaces
    .replace(/\b(xxx|mr|mrs|ms|dr)\b/gi, '') // remove fillers
    .trim();
}

/**
 * Split a name into word tokens. Also tries to split concatenated names:
 * "Ishimwejpierre" → ["ishimwe", "jean", "pierre"] if it matches known parts.
 * "Iyamuremyepierre" → ["iyamuremye", "pierre"]
 */
function tokenize(name, knownTokens = null) {
  const normalized = normalize(name);
  let tokens = normalized.split(' ').filter(t => t.length > 0);

  // Try to split concatenated tokens using known word list
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

/**
 * Try to split a concatenated token like "ishimwejpierre" into known words.
 * Uses a greedy longest-match approach.
 */
function trySplitConcatenated(token, knownTokens) {
  if (token.length < 6) return [token]; // Too short to be concatenated
  
  // Try finding a known token as prefix
  for (const known of knownTokens) {
    if (known.length < 3) continue;
    if (token.startsWith(known) && token.length > known.length) {
      const remainder = token.substring(known.length);
      if (remainder.length >= 2) {
        // Check if remainder is also a known token (or close to one)
        const remainderMatch = knownTokens.find(k => 
          k === remainder || 
          (k.length >= 4 && remainder.length >= 4 && levenshtein(k, remainder) <= 1)
        );
        if (remainderMatch) {
          return [known, remainderMatch];
        }
        // Even if not a perfect match, if the prefix is long enough, split
        if (known.length >= 5 && remainder.length >= 4) {
          return [known, remainder];
        }
      }
    }
    // Try as suffix
    if (token.endsWith(known) && token.length > known.length) {
      const prefix = token.substring(0, token.length - known.length);
      if (prefix.length >= 3) {
        const prefixMatch = knownTokens.find(k =>
          k === prefix ||
          (k.length >= 4 && prefix.length >= 4 && levenshtein(k, prefix) <= 1)
        );
        if (prefixMatch) {
          return [prefixMatch, known];
        }
        if (known.length >= 5 && prefix.length >= 4) {
          return [prefix, known];
        }
      }
    }
  }
  return [token];
}

/**
 * Common Rwandan/East African given names that appear across many employees.
 * These should NOT count as strong matches on their own — we need a surname match too.
 */
const COMMON_GIVEN_NAMES = new Set([
  'jean', 'pierre', 'emmanuel', 'claude', 'baptiste', 'marie', 'bosco',
  'damascene', 'joseph', 'eric', 'vincent', 'francois', 'alphonse',
  'alexandre', 'augustin', 'gaspard', 'alexis', 'janvier', 'celestin',
  'innocent', 'dieudonne', 'andre', 'david', 'daniel', 'paul', 'john',
  'peter', 'james', 'kumar', 'charles', 'aime', 'andrew', 'samuel',
  'de', 'dieu', 'nepomuscene', 'nepo', 'jmv',
]);

/**
 * Calculate how "rare" (identifying) a word is in the name.
 * Common given names get low weight, rare surnames get high weight.
 */
function wordRarity(word) {
  if (COMMON_GIVEN_NAMES.has(word)) return 0.3;
  if (word.length <= 2) return 0.1;
  if (word.length <= 3) return 0.5;
  return 1.0; // Rare/surname words are most important
}

/**
 * Score how well two words match (0–100).
 */
function wordMatchScore(word, other) {
  // Exact match
  if (word === other) return 100;

  // Prefix match (handles truncation like "FABRI" ↔ "FABRICE")
  if (word.length >= 3 && other.length >= 3) {
    const minLen = Math.min(word.length, other.length);
    if (word.startsWith(other.substring(0, minLen)) || other.startsWith(word.substring(0, minLen))) {
      const maxLen = Math.max(word.length, other.length);
      return Math.round((minLen / maxLen) * 90);
    }
  }

  // Fuzzy match (Levenshtein) for words of similar length
  if (word.length >= 4 && other.length >= 4) {
    const maxLen = Math.max(word.length, other.length);
    const dist = levenshtein(word, other);
    const threshold = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;
    if (dist <= threshold) {
      return Math.round(((maxLen - dist) / maxLen) * 85);
    }
  }

  return 0;
}

/**
 * Calculate a match score between two sets of name tokens.
 * Returns a score 0–100 where 100 = perfect match.
 *
 * KEY INSIGHT: Common names like "Emmanuel", "Jean Claude", "Jean Bosco" appear
 * across many employees. Matching ONLY on these produces false positives.
 * We require at least one RARE (surname) word to match for a valid match.
 *
 * Handles:
 * - Exact word matches
 * - Prefix matches (truncated names)
 * - Fuzzy matches (spelling variations via Levenshtein)
 * - Word order independence (reversed names)
 * - Surname-priority matching to avoid false positives
 */
function matchScore(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = tokensA.length <= tokensB.length ? tokensB : tokensA;

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let rareWordMatched = false;
  let unmatchedRealWords = 0; // words from shorter that failed to match and are "real" names (length >= 4)
  const usedIndices = new Set();

  for (const word of shorter) {
    const rarity = wordRarity(word);
    let bestScore = 0;
    let bestIdx = -1;

    for (let i = 0; i < longer.length; i++) {
      if (usedIndices.has(i)) continue;
      const score = wordMatchScore(word, longer[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore >= 50) {
      usedIndices.add(bestIdx);
      totalWeightedScore += bestScore * rarity;
      totalWeight += rarity;
      if (rarity >= 0.8 && bestScore >= 70) rareWordMatched = true;
    } else {
      // Word didn't match — still counts in weight
      totalWeight += rarity;
      if (word.length >= 4) unmatchedRealWords++;
    }
  }

  if (totalWeight === 0) return 0;
  let avgScore = totalWeightedScore / totalWeight;

  // CRITICAL: If no rare/surname word matched, cap the score low.
  // This prevents "KWIZERA Emmanuel" → "EMMANUEL HAKIZIMANA" false positives.
  if (!rareWordMatched && shorter.length > 1) {
    avgScore = Math.min(avgScore, 40);
  }

  // CRITICAL #2: "Different person, same surname" detection.
  // When both sides have 2+ tokens and there are real unmatched words (length >= 4)
  // on BOTH sides, they're likely different people sharing a surname.
  // e.g., "Ndagijimana Eric" vs "NDAGIJIMANA SIMON" → only surname matches → reject.
  if (shorter.length >= 2 && unmatchedRealWords > 0) {
    const unusedFromLonger = longer.filter((_, i) => !usedIndices.has(i));
    const realUnusedFromLonger = unusedFromLonger.filter(w => w.length >= 4);
    if (realUnusedFromLonger.length > 0) {
      // Both sides have real names that don't match each other → different people
      avgScore = Math.min(avgScore, 50);
    }
  }

  // Penalize big word count differences
  const countPenalty = shorter.length === 1 && longer.length > 2 ? 10 : 0;

  // Bonus: if all words matched both ways
  const coverageBonus = usedIndices.size === shorter.length && usedIndices.size === longer.length ? 5 : 0;

  return Math.max(0, Math.min(100, avgScore - countPenalty + coverageBonus));
}

/**
 * Build a name matching function given a list of employees.
 * Returns a function that takes a biometric name + fingerprint and returns the best match.
 */
function buildNameMatcher(employees) {
  // Collect all unique name tokens from employee hub for concatenation splitting
  const allTokens = new Set();
  employees.forEach(e => {
    normalize(e.full_name || '').split(' ').filter(t => t.length >= 3).forEach(t => allTokens.add(t));
  });
  const knownTokens = [...allTokens];

  // Pre-tokenize all employees
  const empTokenized = employees.map(e => ({
    ...e,
    tokens: tokenize(e.full_name || '', knownTokens),
    normalized: normalize(e.full_name || ''),
  }));

  // Fingerprint lookup
  const empByFP = new Map();
  employees.forEach(e => {
    if (e.fingerprint_number) empByFP.set(e.fingerprint_number.trim(), e);
  });

  // Cache for matched names
  const matchCache = new Map();

  return function matchEmployee(bioName, fingerprint) {
    const cacheKey = `${bioName}|||${fingerprint || ''}`;
    if (matchCache.has(cacheKey)) return matchCache.get(cacheKey);

    const bioNormalized = normalize(bioName);
    const bioTokens = tokenize(bioName, knownTokens);

    // ── Strategy 1: Fingerprint + name cross-validation ──
    if (fingerprint) {
      const fpMatch = empByFP.get(fingerprint.trim());
      if (fpMatch) {
        const fpTokens = tokenize(fpMatch.full_name || '', knownTokens);
        const score = matchScore(bioTokens, fpTokens);
        if (score >= 55) { // Require decent name overlap even with FP match
          matchCache.set(cacheKey, { employee: fpMatch, score, method: 'fingerprint+name' });
          return matchCache.get(cacheKey);
        }
      }
    }

    // ── Strategy 2: Exact normalized name match ──
    const exactMatch = empTokenized.find(e => e.normalized === bioNormalized);
    if (exactMatch) {
      matchCache.set(cacheKey, { employee: exactMatch, score: 100, method: 'exact' });
      return matchCache.get(cacheKey);
    }

    // ── Strategy 3: Score all employees and pick best match ──
    let bestMatch = null;
    let bestScore = 0;

    for (const emp of empTokenized) {
      const score = matchScore(bioTokens, emp.tokens);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = emp;
      }
    }

    // ── Strategy 4: Try single-token matching for single-word biometric names ──
    // e.g., "Rajbali" should match "RAJBALI XXX", "MUHIRWA" should match "MUHIRWA"
    if (bioTokens.length === 1) {
      for (const emp of empTokenized) {
        if (emp.tokens.some(t => t === bioTokens[0] || levenshtein(t, bioTokens[0]) <= 1)) {
          const score = emp.tokens.length === 1 ? 95 : 75; // Higher if both are single-word
          if (score > bestScore) {
            bestScore = score;
            bestMatch = emp;
          }
        }
      }
    }

    // ── Strategy 5: Fingerprint-only match — DISABLED ──
    // Previously accepted fingerprint-only matches at 45%, but this caused
    // wrong matches like "HARINDINTWARI" → "HABAYIMANA" when fingerprints
    // were reassigned. Fingerprint must be validated with name overlap (Strategy 1).
    // if (bestScore < 50 && fingerprint) { ... }

    // Require minimum score of 60 to accept a fuzzy match
    // This prevents false positives from common given names
    if (bestScore >= 60 && bestMatch) {
      matchCache.set(cacheKey, { employee: bestMatch, score: bestScore, method: 'fuzzy' });
      return matchCache.get(cacheKey);
    }

    matchCache.set(cacheKey, null);
    return null;
  };
}

// ─── Date/Time Parsing ───

function parseDateTime(val) {
  if (!val) return null;
  
  // Excel serial number
  if (typeof val === 'number' || (typeof val === 'string' && /^\d+\.?\d*$/.test(val.trim()))) {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (num > 40000 && num < 60000) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + num * msPerDay);
    }
  }
  
  const str = String(val).trim();

  // "dd-MMM-yy HH:mm:ss" (e.g., "03-Feb-26 16:56:31")
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

  // "M/d/yyyy H:mm:ss" 
  const mdY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (mdY) {
    return new Date(parseInt(mdY[3]), parseInt(mdY[1]) - 1, parseInt(mdY[2]), parseInt(mdY[4]), parseInt(mdY[5]), parseInt(mdY[6] || '0'));
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function determineStatus(clockIn) {
  if (!clockIn) return 'absent';
  const totalMin = clockIn.getHours() * 60 + clockIn.getMinutes();
  if (totalMin > 8 * 60 + 15) return 'late';
  return 'present';
}

function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return { total: 0, regular: 0, overtime: 0, shiftType: 'day' };
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
  const inHour = clockIn.getHours();
  const shiftType = inHour >= 18 || inHour < 4 ? 'night' : 'day';
  const regularHours = Math.min(totalHours, 8);
  const overtimeHours = Math.max(0, totalHours - 8);
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
  console.log('║   Attendance Import v2 — Advanced Name Matching        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Fetch employees
  console.log('📥 Fetching employees from database...');
  const employees = await supabaseGet('employees', '?select=id,full_name,fingerprint_number,department_id,company_id&limit=500');
  console.log(`   Found ${employees.length} employees\n`);

  // 2. Build matcher
  console.log('🔧 Building advanced name matcher...');
  const matchEmployee = buildNameMatcher(employees);

  // 3. Collect files
  const attendanceDir = path.join(process.cwd(), 'Attendance');
  const files = [];

  const dirs = [
    { dir: path.join(attendanceDir, 'HQ Peat', 'January'), company: 'HQ Peat', period: 'Jan' },
    { dir: path.join(attendanceDir, 'HQ Peat', 'February'), company: 'HQ Peat', period: 'Feb' },
    { dir: path.join(attendanceDir, 'HQ Power'), company: 'HQ Power', period: 'Feb' },
  ];

  for (const { dir, company, period } of dirs) {
    if (!fs.existsSync(dir)) continue;
    fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).forEach(f => {
      files.push({ path: path.join(dir, f), company, period });
    });
  }

  console.log(`📂 Found ${files.length} daily attendance files\n`);

  // 4. Parse all files
  const grouped = new Map(); // "employeeId|date" → { events: [], employee, name, deptId }
  let totalRows = 0;
  let matchedRows = 0;
  const unmatchedNames = new Map(); // name → { fp, dept, count, bioName }
  const matchLog = []; // Track matches for reporting

  for (const file of files) {
    const wb = XLSX.readFile(file.path, { cellDates: false, raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dept = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();
      const fp = String(row[2] || '').trim();
      const dateTimeVal = row[3];

      if (!name || !dateTimeVal) continue;
      totalRows++;

      const dateTime = parseDateTime(dateTimeVal);
      if (!dateTime) {
        continue;
      }

      const result = matchEmployee(name, fp);
      if (!result) {
        const key = name.toLowerCase().trim();
        if (!unmatchedNames.has(key)) {
          unmatchedNames.set(key, { bioName: name, fp, dept, count: 0 });
        }
        unmatchedNames.get(key).count++;
        continue;
      }

      matchedRows++;
      const employee = result.employee;

      // Track match for logging (first occurrence only)
      const logKey = `${name}→${employee.full_name}`;
      if (!matchLog.some(l => l.key === logKey)) {
        matchLog.push({ key: logKey, bioName: name, hubName: employee.full_name, score: result.score, method: result.method });
      }

      const dateKey = formatDate(dateTime);
      const groupKey = `${employee.id}|${dateKey}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { events: [], employee, name, deptId: employee.department_id });
      }
      grouped.get(groupKey).events.push(dateTime);
    }
  }

  // 5. Report matching results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MATCHING RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`  Total biometric rows:  ${totalRows}`);
  console.log(`  Matched rows:          ${matchedRows} (${Math.round(matchedRows/totalRows*100)}%)`);
  console.log(`  Unmatched rows:        ${totalRows - matchedRows}`);
  console.log(`  Unique unmatched:      ${unmatchedNames.size}`);
  console.log(`  Employee-day records:  ${grouped.size}\n`);

  // Show match details sorted by method
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
      console.log(`     ${indicator} ${scoreBar} ${m.score}% "${m.bioName}" → "${m.hubName}"`);
    });
    console.log('');
  }

  // Show unmatched
  if (unmatchedNames.size > 0) {
    console.log(`  ❌ UNMATCHED (${unmatchedNames.size}):`);
    [...unmatchedNames.values()]
      .sort((a, b) => b.count - a.count)
      .forEach(u => {
        console.log(`     ❌ [${u.fp.padStart(4)}] ${u.dept.padEnd(18)} ${u.bioName} (${u.count} events)`);
      });
    console.log('');
  }

  // 6. Build attendance records
  const records = [];
  grouped.forEach((group, key) => {
    const [employeeId, dateStr] = key.split('|');
    const sortedEvents = group.events.sort((a, b) => a.getTime() - b.getTime());
    const clockIn = sortedEvents[0];
    const clockOut = sortedEvents.length > 1 ? sortedEvents[sortedEvents.length - 1] : null;
    const status = determineStatus(clockIn);
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
      notes: `Imported from biometric | ${group.name} | Events: ${sortedEvents.length}`,
    });
  });

  console.log(`📤 Prepared ${records.length} attendance records for import\n`);

  // 7. Upsert in batches
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
      console.error(`\n  ❌ Batch error: ${err.message.substring(0, 100)}`);
    }
  }

  // 8. Auto-save fingerprint numbers
  let fpSaved = 0;
  const fpSeen = new Set();
  for (const match of matchLog) {
    const emp = employees.find(e => e.full_name === match.hubName);
    if (emp && !emp.fingerprint_number && !fpSeen.has(emp.id)) {
      // Find the fingerprint from biometric data
      const bioEntry = [...unmatchedNames.values()].find(u => u.bioName === match.bioName);
      // Actually, look in the grouped data
      for (const [, group] of grouped) {
        if (group.employee.id === emp.id && group.name) {
          // Find the original file entry with fingerprint
          break;
        }
      }
      fpSeen.add(emp.id);
    }
  }

  console.log(`\n\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  IMPORT COMPLETE                                        ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  ✅ Imported:    ${String(imported).padStart(5)} records                       ║`);
  console.log(`║  ❌ Errors:      ${String(errors).padStart(5)} records                       ║`);
  console.log(`║  🔗 Matched:     ${String(matchLog.length).padStart(5)} unique employees               ║`);
  console.log(`║  ❓ Unmatched:   ${String(unmatchedNames.size).padStart(5)} unique employees               ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
