// Script to generate SQL for bulk warehouse import
// Run with: node scripts/generate_warehouse_sql.js

const fs = require('fs');
const path = require('path');

const DEPARTMENT_ID = '22222222-2222-2222-2222-222222222222';
const CLASSIFICATION_ID = 'f8991b39-80ce-421c-83c7-c65ac61a31da'; // Warehouse
const LOCATION_ID = '3a8648f0-6990-4d66-8962-f547f774769c'; // Block 6

// Read CSV
const csvPath = path.join(__dirname, '..', 'exports', 'warehouse-import.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Parse CSV properly handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Escape single quotes for SQL
function escapeSql(str) {
  return str.replace(/'/g, "''");
}

// Generate SQL
let sql = `-- Bulk Import: Warehouse items into Block 6
-- Classification: Warehouse (${CLASSIFICATION_ID})
-- Location: Block 6 (${LOCATION_ID})
-- Department: Warehouse (${DEPARTMENT_ID})
-- Generated: ${new Date().toISOString()}

`;

const BATCH_SIZE = 500;
let itemCount = 0;
let batchNumber = 1;

// Skip header
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const fields = parseCSVLine(line);
  const itemName = fields[0] || '';
  const quantity = Math.round(parseFloat(fields[1]) || 0);
  const unit = fields[2] || 'pcs';
  const minQuantity = Math.round(parseFloat(fields[4]) || 0);
  
  if (!itemName) continue;
  
  if (itemCount % BATCH_SIZE === 0) {
    if (itemCount > 0) {
      // Remove trailing comma and close previous batch
      sql = sql.slice(0, -2) + ';\n\n';
    }
    sql += `-- Batch ${batchNumber}\nINSERT INTO inventory_items (department_id, classification_id, location_id, item_number, item_name, quantity, min_quantity, unit, location) VALUES\n`;
    batchNumber++;
  }
  
  const escapedName = escapeSql(itemName);
  sql += `('${DEPARTMENT_ID}', '${CLASSIFICATION_ID}', '${LOCATION_ID}', 'WH-' || substr(md5(random()::text), 1, 8), '${escapedName}', ${quantity}, ${minQuantity}, '${unit || 'pcs'}', 'Block 6'),\n`;
  itemCount++;
}

// Close final batch
if (itemCount > 0) {
  sql = sql.slice(0, -2) + ';\n';
}

sql += `\n-- Total items imported: ${itemCount}\n`;

// Write SQL file
const outputPath = path.join(__dirname, '..', 'exports', 'warehouse-bulk-import.sql');
fs.writeFileSync(outputPath, sql);

console.log(`Generated SQL for ${itemCount} items in ${batchNumber - 1} batches`);
console.log(`Output: ${outputPath}`);
