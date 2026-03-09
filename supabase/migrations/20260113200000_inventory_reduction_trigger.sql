-- ============================================================================
-- SAFE MIGRATION: Inventory Reduction Trigger for Item Requests
-- ============================================================================
-- This migration ONLY:
-- 1. Creates a function to reduce inventory quantity
-- 2. Creates a trigger that fires on INSERT to item_requests
--
-- IT DOES NOT:
-- - Drop any tables
-- - Delete any data
-- - Alter table structures
-- - Remove any columns
--
-- The trigger only UPDATES the quantity field when an item request is completed
-- ============================================================================

-- Drop existing trigger if it exists (safe - only removes trigger, not data)
DROP TRIGGER IF EXISTS trigger_reduce_inventory ON item_requests;

-- Drop existing function if it exists (safe - only removes function, not data)
DROP FUNCTION IF EXISTS reduce_inventory_on_request();

-- Create the function to reduce inventory quantity
-- This function is called AFTER a new item request is inserted
CREATE OR REPLACE FUNCTION reduce_inventory_on_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only reduce inventory if:
  -- 1. An inventory item was selected (not manual entry)
  -- 2. The request status is 'completed'
  -- 3. The quantity requested is greater than 0
  IF NEW.inventory_item_id IS NOT NULL 
     AND NEW.status = 'completed' 
     AND NEW.quantity_requested > 0 THEN
    
    -- Update the inventory item quantity
    -- Using GREATEST to prevent negative quantities (safety measure)
    UPDATE inventory_items 
    SET quantity = GREATEST(0, quantity - NEW.quantity_requested),
        updated_at = NOW()
    WHERE id = NEW.inventory_item_id;
    
  END IF;
  
  -- Return NEW to allow the insert to proceed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
-- AFTER INSERT ensures the item_request is already saved before updating inventory
CREATE TRIGGER trigger_reduce_inventory
AFTER INSERT ON item_requests
FOR EACH ROW
EXECUTE FUNCTION reduce_inventory_on_request();

-- Add a comment to document the trigger
COMMENT ON FUNCTION reduce_inventory_on_request() IS 
'Automatically reduces inventory item quantity when an item request with status completed is created. Only affects inventory_items.quantity field. Does not delete any data.';

COMMENT ON TRIGGER trigger_reduce_inventory ON item_requests IS 
'Fires after a new item request is inserted to automatically reduce the inventory quantity.';
