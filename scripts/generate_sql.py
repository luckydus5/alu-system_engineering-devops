import pandas as pd
import uuid
from datetime import datetime

# Read Excel
df = pd.read_excel('./2026_01_08_10_33_25_tovars_IT equipment and devices.xls')

# Generate SQL
sql_lines = []
sql_lines.append('-- Inventory import from Excel file')
sql_lines.append('-- Generated on: ' + datetime.now().isoformat())
sql_lines.append('')
sql_lines.append('DO $$')
sql_lines.append('DECLARE')
sql_lines.append('  wh_dept_id UUID;')
sql_lines.append('  it_class_id UUID;')
sql_lines.append('  it_loc_id UUID;')
sql_lines.append('BEGIN')
sql_lines.append("  -- Get Warehouse department")
sql_lines.append("  SELECT id INTO wh_dept_id FROM public.departments WHERE code IN ('WH', 'WAREHOUSE') LIMIT 1;")
sql_lines.append('')
sql_lines.append('  IF wh_dept_id IS NULL THEN')
sql_lines.append("    RAISE EXCEPTION 'Warehouse department not found';")
sql_lines.append('  END IF;')
sql_lines.append('')
sql_lines.append('  -- Get IT Equipments classification')
sql_lines.append('  SELECT id INTO it_class_id FROM public.warehouse_classifications')
sql_lines.append("  WHERE department_id = wh_dept_id AND name ILIKE '%IT Equipment%' LIMIT 1;")
sql_lines.append('')
sql_lines.append('  IF it_class_id IS NULL THEN')
sql_lines.append("    RAISE EXCEPTION 'IT Equipments classification not found';")
sql_lines.append('  END IF;')
sql_lines.append('')
sql_lines.append('  -- Get or create location')
sql_lines.append('  SELECT id INTO it_loc_id FROM public.warehouse_locations')
sql_lines.append('  WHERE classification_id = it_class_id AND parent_id IS NULL LIMIT 1;')
sql_lines.append('')
sql_lines.append('  IF it_loc_id IS NULL THEN')
sql_lines.append('    INSERT INTO public.warehouse_locations (department_id, classification_id, name)')
sql_lines.append("    VALUES (wh_dept_id, it_class_id, 'Main Storage')")
sql_lines.append('    RETURNING id INTO it_loc_id;')
sql_lines.append('  END IF;')
sql_lines.append('')
sql_lines.append('  -- Insert inventory items')

for idx, row in df.iterrows():
    item_name = str(row['Item name']).strip() if pd.notna(row['Item name']) else ''
    if not item_name:
        continue
    
    # Escape single quotes for SQL
    item_name_escaped = item_name.replace("'", "''")
    quantity = int(row['Quantity']) if pd.notna(row['Quantity']) else 0
    min_qty = int(row['Min.Quantity']) if pd.notna(row['Min.Quantity']) else 0
    item_number = f"IT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    sql_lines.append(f"  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)")
    sql_lines.append(f"  VALUES (wh_dept_id, it_class_id, it_loc_id, '{item_name_escaped}', '{item_number}', {quantity}, {min_qty}, 'pcs')")
    sql_lines.append(f"  ON CONFLICT DO NOTHING;")
    sql_lines.append('')

sql_lines.append('END $$;')

with open('supabase/migrations/20260108150000_import_it_inventory.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f'SQL file created successfully with {len(df)} items')
