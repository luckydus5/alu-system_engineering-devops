-- ============================================================================
-- Add requested_items JSONB column for multi-item requests
-- ============================================================================
-- This allows storing multiple items in a single request as JSON array
-- Example: [{"id": "uuid", "item_name": "...", "quantity": 2, ...}, ...]
-- 
-- SAFE: Only adds a column, does not delete anything
-- ============================================================================

-- Add the requested_items column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'item_requests' 
    AND column_name = 'requested_items'
  ) THEN
    ALTER TABLE item_requests 
    ADD COLUMN requested_items JSONB DEFAULT NULL;
  END IF;
END $$;

-- Add a comment to document the column
COMMENT ON COLUMN item_requests.requested_items IS 
'JSON array of items in the request. Each item has: id, item_number, item_name, quantity, previous_quantity, new_quantity';

-- Update the trigger to handle multi-item requests
DROP TRIGGER IF EXISTS trigger_reduce_inventory ON item_requests;
DROP FUNCTION IF EXISTS reduce_inventory_on_request();

-- Create new trigger function that handles both single and multi-item requests
CREATE OR REPLACE FUNCTION reduce_inventory_on_request()
RETURNS TRIGGER AS $$
DECLARE
  item_record JSONB;
BEGIN
  -- Handle multi-item requests (requested_items JSON array)
  IF NEW.requested_items IS NOT NULL AND jsonb_array_length(NEW.requested_items) > 0 THEN
    -- Loop through each item in the array and reduce inventory
    FOR item_record IN SELECT * FROM jsonb_array_elements(NEW.requested_items)
    LOOP
      UPDATE inventory_items 
      SET quantity = GREATEST(0, quantity - (item_record->>'quantity')::INTEGER),
          updated_at = NOW()
      WHERE id = (item_record->>'id')::UUID;
    END LOOP;
  -- Handle single item requests (backward compatibility)
  ELSIF NEW.inventory_item_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE inventory_items 
    SET quantity = GREATEST(0, quantity - NEW.quantity_requested),
        updated_at = NOW()
    WHERE id = NEW.inventory_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_reduce_inventory
AFTER INSERT ON item_requests
FOR EACH ROW
EXECUTE FUNCTION reduce_inventory_on_request();
