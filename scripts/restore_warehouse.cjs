/**
 * Warehouse Data Restore Script
 * Restores warehouse classifications, locations, and all 5,476 inventory items
 */

const XLSX = require('xlsx');
const fs = require('fs');

const SUPABASE_URL = 'https://edumcnnilpnbdxcjpchw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdW1jbm5pbHBuYmR4Y2pwY2h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMjU4MSwiZXhwIjoyMDgyOTA4NTgxfQ.K_h09txrwDdpnIZzT8d1sJOIRmlE3rQI94HcupKtY3U';

const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const WAREHOUSE_DEPT_ID = '9b936b64-2eda-4e47-bf2d-6e2317c1df2e';

async function supabaseRequest(path, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts = { method, headers: { ...HEADERS } };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${method} ${path} failed (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

function generateItemNumber(index) {
  return `WH-${String(index).padStart(5, '0')}`;
}

async function main() {
  console.log('=== WAREHOUSE DATA RESTORE ===\n');

  // 1. Create warehouse classification
  console.log('1. Creating warehouse classification...');
  const clsResult = await supabaseRequest('warehouse_classifications', 'POST', [{
    department_id: WAREHOUSE_DEPT_ID,
    name: 'Warehouse',
    description: 'Main warehouse inventory',
    icon: 'Package',
    color: '#2563eb'
  }]);
  const classificationId = clsResult[0].id;
  console.log(`   Classification ID: ${classificationId}`);

  // 2. Create warehouse location
  console.log('2. Creating warehouse location...');
  const locResult = await supabaseRequest('warehouse_locations', 'POST', [{
    department_id: WAREHOUSE_DEPT_ID,
    classification_id: classificationId,
    name: 'Block 6',
    description: 'Block 6 warehouse'
  }]);
  const locationId = locResult[0].id;
  console.log(`   Location ID: ${locationId}`);

  // 3. Read CSV
  console.log('3. Reading warehouse CSV...');
  const csvContent = fs.readFileSync('exports/warehouse-import.csv', 'utf-8');
  const lines = csvContent.split('\n');
  
  // Parse CSV manually for robustness
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted fields with commas
    let fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    const itemName = fields[0];
    const quantity = Math.floor(parseFloat(fields[1]) || 0);
    const unit = fields[2] || 'pcs';
    const minQuantity = Math.floor(parseFloat(fields[4]) || 0);
    
    if (!itemName) continue;
    
    items.push({
      department_id: WAREHOUSE_DEPT_ID,
      classification_id: classificationId,
      location_id: locationId,
      item_number: generateItemNumber(i),
      item_name: itemName,
      quantity: quantity,
      min_quantity: minQuantity,
      unit: unit || 'pcs',
      location: 'Block 6'
    });
  }
  console.log(`   Parsed ${items.length} items from CSV`);

  // 4. Insert in batches
  console.log('4. Inserting inventory items...');
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await supabaseRequest('inventory_items', 'POST', batch);
    inserted += batch.length;
    process.stdout.write(`   Inserted ${inserted}/${items.length}\r`);
  }
  console.log(`\n   All ${inserted} inventory items inserted.`);

  // 5. Verify
  console.log('\n5. Verification...');
  const invCount = await supabaseRequest('inventory_items?select=id');
  console.log(`   Inventory items: ${invCount.length}`);
  const clsCount = await supabaseRequest('warehouse_classifications?select=id');
  console.log(`   Classifications: ${clsCount.length}`);
  const locCount = await supabaseRequest('warehouse_locations?select=id');
  console.log(`   Locations: ${locCount.length}`);
  
  console.log('\n=== WAREHOUSE RESTORE COMPLETE ===');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
