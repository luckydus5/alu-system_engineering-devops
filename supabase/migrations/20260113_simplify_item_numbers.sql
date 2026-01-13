-- Migration to simplify item numbers from UUID format to short format
-- Example: IT-20260108-0011-C49A8B becomes IT-001

-- Step 1: Add a prefix column to warehouse_classifications if not exists
ALTER TABLE warehouse_classifications 
ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(10) DEFAULT NULL;

-- Step 2: Update prefixes based on classification names (only if not already set)
-- Priority order: IT > SP > PC > OF > EL > GN
UPDATE warehouse_classifications SET code_prefix = 'IT' 
WHERE (LOWER(name) LIKE '%it %' OR LOWER(name) LIKE '%it-%' OR LOWER(name) LIKE '%tech%' OR LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%equipment%')
AND code_prefix IS NULL;

UPDATE warehouse_classifications SET code_prefix = 'SP' 
WHERE (LOWER(name) LIKE '%spare%' OR LOWER(name) LIKE '%part%')
AND code_prefix IS NULL;

UPDATE warehouse_classifications SET code_prefix = 'PC' 
WHERE (LOWER(name) LIKE '%vehicle%' OR LOWER(name) LIKE '%machine%' OR LOWER(name) LIKE '%heavy%')
AND code_prefix IS NULL;

UPDATE warehouse_classifications SET code_prefix = 'OF' 
WHERE (LOWER(name) LIKE '%office%' OR LOWER(name) LIKE '%supply%' OR LOWER(name) LIKE '%stationery%')
AND code_prefix IS NULL;

UPDATE warehouse_classifications SET code_prefix = 'EL' 
WHERE (LOWER(name) LIKE '%electr%')
AND code_prefix IS NULL;

UPDATE warehouse_classifications SET code_prefix = 'GN' 
WHERE code_prefix IS NULL; -- General for anything else

-- Step 3: Create a function to generate the next item number for a classification
CREATE OR REPLACE FUNCTION generate_item_number(p_classification_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INTEGER;
    v_item_number TEXT;
BEGIN
    -- Get the prefix for this classification
    SELECT COALESCE(code_prefix, 'GN') INTO v_prefix
    FROM warehouse_classifications
    WHERE id = p_classification_id;
    
    -- If no classification found, use 'GN' (General)
    IF v_prefix IS NULL THEN
        v_prefix := 'GN';
    END IF;
    
    -- Find the highest existing number for this prefix
    SELECT COALESCE(MAX(
        CASE 
            WHEN item_number ~ ('^' || v_prefix || '-[0-9]+$') 
            THEN CAST(SUBSTRING(item_number FROM v_prefix || '-([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1 INTO v_next_num
    FROM inventory_items
    WHERE item_number LIKE v_prefix || '-%';
    
    -- Format the item number with leading zeros (e.g., IT-001)
    v_item_number := v_prefix || '-' || LPAD(v_next_num::TEXT, 3, '0');
    
    RETURN v_item_number;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update all existing items with new short item numbers
-- This uses a CTE to assign sequential numbers per classification prefix
WITH numbered_items AS (
    SELECT 
        i.id,
        i.classification_id,
        COALESCE(c.code_prefix, 'GN') as prefix,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(c.code_prefix, 'GN') 
            ORDER BY i.created_at ASC
        ) as row_num
    FROM inventory_items i
    LEFT JOIN warehouse_classifications c ON i.classification_id = c.id
)
UPDATE inventory_items 
SET item_number = numbered_items.prefix || '-' || LPAD(numbered_items.row_num::TEXT, 3, '0')
FROM numbered_items
WHERE inventory_items.id = numbered_items.id;

-- Step 5: Create a trigger to auto-generate item numbers for new items
CREATE OR REPLACE FUNCTION auto_generate_item_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if item_number is empty or null
    IF NEW.item_number IS NULL OR NEW.item_number = '' THEN
        NEW.item_number := generate_item_number(NEW.classification_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_auto_item_number ON inventory_items;
CREATE TRIGGER trg_auto_item_number
    BEFORE INSERT ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_item_number();
