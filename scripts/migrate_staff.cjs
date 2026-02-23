/**
 * Staff Migration Script - February 2026
 * 
 * Reads the Excel staff list and updates the Supabase database:
 * 1. Deletes all existing employees
 * 2. Removes the "Farmers" company
 * 3. Cleans/creates departments per the Excel
 * 4. Inserts all staff from the 3 sheets (YUMN → HQ Power, HQ PEAT → HQ Peat, HQS → HQ Service)
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

// Company mapping: Sheet name → existing company ID
const COMPANY_MAP = {
  'YUMN ': { id: '51f11cc8-cf98-44e8-b545-032c1b34b1c0', name: 'HQ Power' },
  'HQ PEAT LTD ': { id: '1e1a6299-9342-44b4-9912-cf702b1c85bf', name: 'HQ Peat' },
  'HQS ': { id: '07d543a6-9403-4156-931c-b77933ded242', name: 'HQ Service' },
};

const FARMERS_ID = 'eacdba4c-68cd-4a4f-acfb-517680c580d7';

// Normalize department names from the Excel
function normalizeDepartment(raw) {
  if (!raw) return 'Administration';
  let d = raw.trim();
  // Normalize casing
  const lower = d.toLowerCase();
  
  const mapping = {
    'administration': 'Administration',
    'admin': 'Administration',
    'camp': 'Camp',
    'supply chain': 'Supply Chain',
    'suppliy chain': 'Supply Chain',
    'supply chain ': 'Supply Chain',
    'plant maintenance': 'Plant Maintenance',
    'plant operations': 'Plant Operations',
    'mechanical': 'Mechanical',
    'operations': 'Operations',
    'hq peat operations': 'Peat Operations',
    'hq peat operations ': 'Peat Operations',
    'peat operations department': 'Peat Operations',
    'workshop': 'Workshop',
    'maintenance': 'Maintenance',
    'c&i': 'C&I',
    'electrical': 'Electrical',
  };
  
  return mapping[lower] || d; // fallback to original if not mapped
}

async function supabaseRequest(path, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts = { method, headers: { ...HEADERS } };
  if (method === 'PATCH') {
    opts.headers['Prefer'] = 'return=minimal';
  }
  if (body) opts.body = JSON.stringify(body);
  
  const resp = await fetch(url, opts);
  const text = await resp.text();
  
  if (!resp.ok) {
    throw new Error(`${method} ${path} failed (${resp.status}): ${text}`);
  }
  
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('=== STAFF MIGRATION SCRIPT ===\n');

  // 1. Read Excel
  console.log('1. Reading Excel file...');
  const wb = XLSX.readFile('Staff/ALL STAFF LIST FEBRUARY  2026.xlsx');
  console.log(`   Sheets: ${wb.SheetNames.join(', ')}`);

  // Parse all sheets
  const allStaff = [];
  for (const sheetName of wb.SheetNames) {
    const company = COMPANY_MAP[sheetName];
    if (!company) {
      console.log(`   Skipping unknown sheet: "${sheetName}"`);
      continue;
    }
    
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Find the header row (the one with "NAMES")
    let startRow = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.some(c => typeof c === 'string' && c.trim().toUpperCase().includes('NAMES'))) {
        startRow = i + 1; // data starts after header
        break;
      }
    }
    
    let count = 0;
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[1]) continue; // skip empty rows
      
      const name = String(row[1]).trim();
      if (!name || name.toUpperCase() === 'NAMES') continue;
      
      const dept = row[3] ? normalizeDepartment(String(row[3])) : 'Administration';
      
      allStaff.push({
        name,
        department: dept,
        companyId: company.id,
        companyName: company.name,
        sheetName,
      });
      count++;
    }
    console.log(`   ${company.name}: ${count} employees`);
  }
  console.log(`   Total: ${allStaff.length} employees\n`);

  // 2. Clean all dependent tables that reference departments or employees
  console.log('2. Cleaning dependent tables...');
  const dependentTables = [
    'item_request_approvers',
    'item_requests',
    'attendance_records',
    'user_department_access',
    'leave_requests',
    'leave_balances',
    'leave_approvers',
    'leave_managers',
    'employee_leave_entitlements',
    'performance_reviews',
    'performance_goals',
    'onboarding_checklists',
    'notifications',
    'support_tickets',
    'fleet_audit_log',
    'fleet_issues',
    'maintenance_records',
    'stock_transactions',
    'receiving_records',
    'office_activities',
    'report_comments',
    'reports',
    'audit_logs',
    'system_events',
    'system_reports',
    'positions',
    'warehouse_classifications',
    'warehouse_locations',
    'inventory_items',
    'admin_password_resets',
    'weekend_schedules',
    'company_leave_workflows',
    'company_policies',
  ];
  for (const table of dependentTables) {
    try {
      await supabaseRequest(`${table}?id=not.is.null`, 'DELETE');
      console.log(`   Cleared ${table}`);
    } catch (e) {
      // Some tables may not have data or may not exist, that's OK
      console.log(`   Skipped ${table}: ${e.message.slice(0, 80)}`);
    }
  }
  console.log('');

  // 3. Delete all existing employees
  console.log('3. Deleting all existing employees...');
  await supabaseRequest('employees?id=not.is.null', 'DELETE');
  console.log('   Done.\n');

  // 4. Delete Farmers company (need to delete its departments first)
  console.log('4. Removing Farmers company...');
  try {
    await supabaseRequest(`departments?company_id=eq.${FARMERS_ID}`, 'DELETE');
    await supabaseRequest(`companies?id=eq.${FARMERS_ID}`, 'DELETE');
    console.log('   Farmers company removed.\n');
  } catch (e) {
    console.log(`   Note: ${e.message}\n`);
  }

  // 5. Nullify department references in profiles, then delete all departments
  console.log('5. Cleaning existing departments...');
  // Nullify department_id in profiles so FK doesn't block
  try {
    await supabaseRequest('profiles?department_id=not.is.null', 'PATCH', { department_id: null });
    console.log('   Cleared department_id in profiles');
  } catch (e) {
    console.log(`   Note (profiles): ${e.message.slice(0, 100)}`);
  }
  // Nullify department_id in user_roles
  try {
    await supabaseRequest('user_roles?department_id=not.is.null', 'PATCH', { department_id: null });
    console.log('   Cleared department_id in user_roles');
  } catch (e) {
    console.log(`   Note (user_roles): ${e.message.slice(0, 100)}`);
  }
  // Cleared item_request_approvers
  try {
    await supabaseRequest('item_request_approvers?id=not.is.null', 'DELETE');
    console.log('   Cleared item_request_approvers');
  } catch (e) {
    console.log(`   Note (item_request_approvers): ${e.message.slice(0, 100)}`);
  }
  // Clear audit_logs again in case triggers re-created rows
  try {
    await supabaseRequest('audit_logs?id=not.is.null', 'DELETE');
    console.log('   Cleared audit_logs (re-check)');
  } catch (e) {
    console.log(`   Note (audit_logs re-check): ${e.message.slice(0, 100)}`);
  }
  await supabaseRequest('departments?id=not.is.null', 'DELETE');
  console.log('   All old departments deleted.\n');

  // 6. Collect unique departments per company
  console.log('6. Creating departments...');
  const deptsByCompany = {};
  let codeCounter = 1;
  for (const emp of allStaff) {
    const key = `${emp.companyId}::${emp.department}`;
    if (!deptsByCompany[key]) {
      // Generate a unique code from the department name
      const code = emp.department.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + '-' + String(codeCounter++).padStart(2, '0');
      deptsByCompany[key] = { name: emp.department, company_id: emp.companyId, code };
    }
  }
  
  const deptsToInsert = Object.values(deptsByCompany);
  console.log(`   ${deptsToInsert.length} unique departments to create`);
  
  // Insert departments one by one to handle unique name constraint
  // If a department already exists (same name), reuse it
  const deptLookup = {};
  for (const dept of deptsToInsert) {
    try {
      const created = await supabaseRequest('departments', 'POST', [dept]);
      deptLookup[`${dept.company_id}::${dept.name}`] = created[0].id;
      console.log(`   Created: ${dept.name} (${dept.company_id.slice(0,8)})`);
    } catch (e) {
      if (e.message.includes('23505')) {
        // Duplicate name — fetch existing
        const existing = await supabaseRequest(`departments?name=eq.${encodeURIComponent(dept.name)}&select=id`);
        if (existing && existing.length > 0) {
          deptLookup[`${dept.company_id}::${dept.name}`] = existing[0].id;
          console.log(`   Reused: ${dept.name} (already exists)`);
        }
      } else {
        throw e;
      }
    }
  }
  console.log('   Departments done.\n');

  // 7. Insert employees in batches
  console.log('7. Inserting employees...');
  
  // Generate employee numbers
  let empCounter = 1;
  const employeesToInsert = allStaff.map(emp => {
    const num = String(empCounter).padStart(4, '0');
    const record = {
      employee_number: `YM-${num}`,
      full_name: emp.name,
      department_id: deptLookup[`${emp.companyId}::${emp.department}`],
      company_id: emp.companyId,
      hire_date: '2026-02-23',
      employment_status: 'active',
      employment_type: 'full_time',
    };
    empCounter++;
    return record;
  });

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < employeesToInsert.length; i += BATCH_SIZE) {
    const batch = employeesToInsert.slice(i, i + BATCH_SIZE);
    await supabaseRequest('employees', 'POST', batch);
    inserted += batch.length;
    process.stdout.write(`   Inserted ${inserted}/${employeesToInsert.length}\r`);
  }
  console.log(`\n   All ${inserted} employees inserted.\n`);

  // 8. Verify
  console.log('8. Verification...');
  const companies = await supabaseRequest('companies?select=id,name');
  console.log('   Companies:', companies.map(c => c.name).join(', '));
  
  const depts = await supabaseRequest('departments?select=id,name,company_id');
  console.log(`   Departments: ${depts.length} total`);
  
  const empCount = await supabaseRequest('employees?select=id');
  console.log(`   Employees: ${empCount.length} total`);
  
  // Count per company
  for (const company of companies) {
    const compEmps = await supabaseRequest(`employees?select=id&company_id=eq.${company.id}`);
    const compDepts = depts.filter(d => d.company_id === company.id);
    console.log(`   ${company.name}: ${compEmps.length} employees, ${compDepts.length} departments (${compDepts.map(d => d.name).join(', ')})`);
  }
  
  console.log('\n=== MIGRATION COMPLETE ===');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
