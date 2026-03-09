// Script to import inventory items from Excel file to Supabase
// Run with: npx tsx scripts/import_inventory.ts
// Requires: EMAIL and PASSWORD environment variables for authentication

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://edumcnnilpnbdxcjpchw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdW1jbm5pbHBuYmR4Y2pwY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzI1ODEsImV4cCI6MjA4MjkwODU4MX0.nRPDvserHqLnNx78UArKHuzJp5J4C0-FT9noHtmXfFU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ExcelRow {
  'Item name': string;
  'Quantity': number;
  'Unit of Measure'?: string;
  'Min.Quantity': number;
}

function generateItemNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `IT-${date}-${random}`;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Inventory Import Script');
  console.log('='.repeat(60));
  console.log('\nThis script requires authentication to access the database.');
  console.log('Please enter your Supabase credentials:\n');

  // Get credentials
  const email = process.env.EMAIL || await prompt('Email: ');
  const password = process.env.PASSWORD || await prompt('Password: ');

  // Sign in
  console.log('\nSigning in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error('Authentication failed:', authError.message);
    return;
  }

  console.log(`✓ Signed in as: ${authData.user?.email}\n`);

  console.log('Starting inventory import...\n');

  // Read Excel file
  const excelPath = path.join(__dirname, '..', '2026_01_08_10_33_25_tovars_IT equipment and devices.xls');
  
  if (!fs.existsSync(excelPath)) {
    console.error(`Excel file not found: ${excelPath}`);
    return;
  }

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Found ${data.length} items in Excel file\n`);

  // Get all departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*');

  if (deptError) {
    console.error('Error fetching departments:', deptError.message);
    return;
  }

  console.log('Available departments:');
  departments?.forEach(dept => {
    console.log(`  - ${dept.name} (code: ${dept.code}, id: ${dept.id})`);
  });

  // Find Warehouse department
  const warehouseDept = departments?.find(d => 
    d.code === 'WH' || d.code === 'WAREHOUSE' || d.name.toLowerCase().includes('warehouse')
  );

  if (!warehouseDept) {
    console.error('\nWarehouse department not found!');
    console.log('Available department codes:', departments?.map(d => d.code));
    return;
  }

  console.log(`\nUsing department: ${warehouseDept.name} (${warehouseDept.id})`);

  // Get classifications for Warehouse department
  const { data: classifications, error: classError } = await supabase
    .from('warehouse_classifications')
    .select('*')
    .eq('department_id', warehouseDept.id);

  if (classError) {
    console.error('Error fetching classifications:', classError.message);
    return;
  }

  console.log('\nAvailable classifications:');
  classifications?.forEach(cls => {
    console.log(`  - ${cls.name} (id: ${cls.id})`);
  });

  // Find "IT Equipments" classification
  const targetClassification = classifications?.find(c => 
    c.name.toLowerCase().includes('it equipment') || 
    c.name.toLowerCase().includes('it equipments')
  );

  if (!targetClassification) {
    console.error('\nIT Equipment classification not found!');
    return;
  }

  console.log(`\nUsing classification: ${targetClassification.name} (${targetClassification.id})`);

  // Get locations for this classification
  const { data: locations, error: locError } = await supabase
    .from('warehouse_locations')
    .select('*')
    .eq('classification_id', targetClassification.id)
    .is('parent_id', null);

  if (locError) {
    console.error('Error fetching locations:', locError.message);
    return;
  }

  console.log('\nAvailable locations:');
  locations?.forEach(loc => {
    console.log(`  - ${loc.name} (id: ${loc.id})`);
  });

  let targetLocation = locations?.[0];

  // Create a location if none exists
  if (!targetLocation) {
    console.log('\nNo location found. Creating "Main Storage"...');
    const { data: newLoc, error: createLocError } = await supabase
      .from('warehouse_locations')
      .insert({
        department_id: warehouseDept.id,
        classification_id: targetClassification.id,
        name: 'Main Storage'
      })
      .select()
      .single();

    if (createLocError) {
      console.error('Error creating location:', createLocError.message);
      return;
    }
    targetLocation = newLoc;
    console.log(`Created location: ${targetLocation.name}`);
  }

  console.log(`\nUsing location: ${targetLocation.name} (${targetLocation.id})`);

  console.log('\n' + '='.repeat(60));
  console.log('Starting item import...');
  console.log('='.repeat(60) + '\n');

  // Import items
  let successCount = 0;
  let errorCount = 0;

  for (const row of data) {
    const itemName = row['Item name']?.toString().trim();
    if (!itemName) continue;

    const quantity = Number(row['Quantity']) || 0;
    const minQuantity = Number(row['Min.Quantity']) || 0;
    const unit = row['Unit of Measure']?.toString().trim() || 'pcs';

    const itemData = {
      department_id: warehouseDept.id,
      classification_id: targetClassification.id,
      location_id: targetLocation.id,
      item_name: itemName,
      item_number: generateItemNumber(),
      quantity: quantity,
      min_quantity: minQuantity,
      unit: unit === 'nan' || unit === '' ? 'pcs' : unit
    };

    const { data: inserted, error: insertError } = await supabase
      .from('inventory_items')
      .insert(itemData)
      .select()
      .single();

    if (insertError) {
      console.log(`✗ Failed: ${itemName} - ${insertError.message}`);
      errorCount++;
    } else {
      console.log(`✓ Imported: ${itemName} (qty: ${quantity})`);
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Import completed!');
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
