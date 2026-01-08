-- Create a default "General Storage" location for Land Survey and Devices classification
INSERT INTO warehouse_locations (
  id,
  department_id,
  classification_id,
  name,
  description,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  '7783bae9-4ea9-49bf-815b-4ced9cb108e9',
  'General Storage',
  'Default storage location for Land Survey and Devices items',
  now(),
  now()
);

-- Update all items in Land Survey classification to use this new location
UPDATE inventory_items 
SET location_id = (
  SELECT id FROM warehouse_locations 
  WHERE classification_id = '7783bae9-4ea9-49bf-815b-4ced9cb108e9' 
  AND name = 'General Storage'
  LIMIT 1
),
updated_at = now()
WHERE classification_id = '7783bae9-4ea9-49bf-815b-4ced9cb108e9'
AND location_id IS NULL;