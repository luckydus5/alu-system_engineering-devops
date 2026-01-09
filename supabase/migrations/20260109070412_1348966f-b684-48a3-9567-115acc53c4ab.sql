-- Fix orphaned inventory items by assigning them to the "Warehouse" classification
-- Classification ID: f8991b39-80ce-421c-83c7-c65ac61a31da (Warehouse)
-- Location ID: 3a8648f0-6990-4d66-8962-f547f774769c (Block 6)

UPDATE inventory_items
SET 
  classification_id = 'f8991b39-80ce-421c-83c7-c65ac61a31da',
  location_id = '3a8648f0-6990-4d66-8962-f547f774769c',
  location = 'Block 6'
WHERE 
  department_id = '22222222-2222-2222-2222-222222222222'
  AND classification_id IS NULL;