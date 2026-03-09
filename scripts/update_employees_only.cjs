/**
 * Employee-Only Update Script
 * ONLY touches the employees table. Nothing else.
 * 
 * 1. Deletes all existing employees
 * 2. Inserts new employees from Excel, mapped to existing departments
 */

const XLSX = require('xlsx');

const SUPABASE_URL = 'https://edumcnnilpnbdxcjpchw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdW1jbm5pbHBuYmR4Y2pwY2h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMjU4MSwiZXhwIjoyMDgyOTA4NTgxfQ.K_h09txrwDdpnIZzT8d1sJOIRmlE3rQI94HcupKtY3U';

const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Company IDs
const HQ_POWER  = '51f11cc8-cf98-44e8-b545-032c1b34b1c0';
const HQ_PEAT   = '1e1a6299-9342-44b4-9912-cf702b1c85bf';
const HQ_SERVICE = '07d543a6-9403-4156-931c-b77933ded242';

// Sheet → Company mapping
const SHEET_COMPANY = {
  'YUMN ':         HQ_POWER,
  'HQ PEAT LTD ':  HQ_PEAT,
  'HQS ':          HQ_SERVICE,
};

// Company code prefixes for employee numbers
const COMPANY_PREFIX = {
  [HQ_POWER]:   'HQP',
  [HQ_PEAT]:    'HQPT',
  [HQ_SERVICE]: 'HQS',
};

// Existing department IDs (from restored DB)
const DEPT_IDS = {
  // HQ Power departments
  'administration':     '8cc4c2fd-5513-49d2-8ea8-cc8b7a84c4d3',
  'admin':              '8cc4c2fd-5513-49d2-8ea8-cc8b7a84c4d3',
  'camp':               null, // No "Camp" dept in DB — map to Administration
  'supply chain':       null, // No "Supply Chain" dept in DB — map to Warehouse 
  'suppliy chain':      null,
  'plant maintenance':  '11111111-1111-1111-1111-111111111111', // Peat Maintenance
  'plant operations':   '44444444-4444-4444-4444-444444444444', // Operations
  'mechanical':         'b3b602e8-4b4e-4247-9fa4-b67023275ee0',
  
  // HQ Peat departments
  'peat operations':    '49f8a17e-0bf8-4050-95dc-c012b17f003c',
  'hq peat operations': '49f8a17e-0bf8-4050-95dc-c012b17f003c',
  'hq peat operations ': '49f8a17e-0bf8-4050-95dc-c012b17f003c',
  'peat operations department': '49f8a17e-0bf8-4050-95dc-c012b17f003c',
  'operations':         '44444444-4444-4444-4444-444444444444',
  'workshop':           null, // Will need to check
  'maintenance':        '516a22a0-0b6b-4f3b-824e-d0b334572934',
  
  // HQ Service departments
  'c&i':                '7d6a818d-0c28-4e22-926b-6a4b27d5d69d',
  'electrical':         '89732173-39b4-49f6-8787-711f8c9c159f',
};

async function supabaseRequest(path, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts = { method, headers: { ...HEADERS } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${method} ${path} failed (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

function normalizeDept(raw) {
  if (!raw) return 'administration';
  return raw.trim().toLowerCase();
}

function resolveDeptId(deptName, companyId) {
  const key = normalizeDept(deptName);
  
  // Check exact match first
  if (DEPT_IDS[key] !== undefined) {
    return DEPT_IDS[key] || '8cc4c2fd-5513-49d2-8ea8-cc8b7a84c4d3'; // fallback to Administration
  }
  
  // Default to Administration for unmapped departments
  console.log(`   WARNING: Unmapped department "${deptName}" → Administration`);
  return '8cc4c2fd-5513-49d2-8ea8-cc8b7a84c4d3';
}

async function main() {
  console.log('=== EMPLOYEE-ONLY UPDATE ===');
  console.log('(Only touches employees table)\n');

  // 1. Read Excel
  console.log('1. Reading Excel file...');
  const wb = XLSX.readFile('Staff/ALL STAFF LIST FEBRUARY  2026.xlsx');
  
  const allStaff = [];
  const counters = {}; // per-company counters
  
  for (const sheetName of wb.SheetNames) {
    const companyId = SHEET_COMPANY[sheetName];
    if (!companyId) {
      console.log(`   Skipping sheet: "${sheetName}"`);
      continue;
    }
    
    if (!counters[companyId]) counters[companyId] = 0;
    
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Find header row
    let startRow = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].some(c => typeof c === 'string' && c.trim().toUpperCase().includes('NAMES'))) {
        startRow = i + 1;
        break;
      }
    }
    
    let count = 0;
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[1]) continue;
      const name = String(row[1]).trim();
      if (!name || name.toUpperCase() === 'NAMES') continue;
      
      const dept = row[3] ? String(row[3]).trim() : 'Administration';
      counters[companyId]++;
      const num = String(counters[companyId]).padStart(4, '0');
      const prefix = COMPANY_PREFIX[companyId];
      
      allStaff.push({
        full_name: name,
        employee_number: `${prefix}-${num}`,
        department_id: resolveDeptId(dept, companyId),
        company_id: companyId,
        hire_date: '2026-02-23',
        employment_status: 'active',
        employment_type: 'full_time',
      });
      count++;
    }
    console.log(`   ${COMPANY_PREFIX[companyId]}: ${count} employees`);
  }
  console.log(`   Total: ${allStaff.length}\n`);

  // 2. Delete existing employees ONLY
  console.log('2. Deleting existing employees...');
  await supabaseRequest('employees?id=not.is.null', 'DELETE');
  console.log('   Done.\n');

  // 3. Insert new employees in batches
  console.log('3. Inserting new employees...');
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < allStaff.length; i += BATCH_SIZE) {
    const batch = allStaff.slice(i, i + BATCH_SIZE);
    await supabaseRequest('employees', 'POST', batch);
    inserted += batch.length;
    process.stdout.write(`   Inserted ${inserted}/${allStaff.length}\r`);
  }
  console.log(`\n   All ${inserted} employees inserted.\n`);

  // 4. Quick verify
  console.log('4. Verification...');
  const companies = await supabaseRequest('companies?select=id,name');
  for (const c of companies) {
    const emps = await supabaseRequest(`employees?select=id&company_id=eq.${c.id}`);
    console.log(`   ${c.name}: ${emps.length} employees`);
  }
  
  console.log('\n=== DONE (only employees table was modified) ===');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
