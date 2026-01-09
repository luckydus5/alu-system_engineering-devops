-- Remove duplicate inventory items, keeping only one record per (item_name, quantity) combo
-- This keeps the record with the oldest created_at (first imported)

DELETE FROM inventory_items
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY item_name, quantity, department_id
             ORDER BY created_at ASC
           ) AS rn
    FROM inventory_items
    WHERE department_id = '22222222-2222-2222-2222-222222222222'
  ) sub
  WHERE rn > 1
);