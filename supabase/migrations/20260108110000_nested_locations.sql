-- Add parent_id column to warehouse_locations for nested folder support
ALTER TABLE public.warehouse_locations
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.warehouse_locations(id) ON DELETE CASCADE;

-- Create index for faster parent lookups
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_parent_id ON public.warehouse_locations(parent_id);

-- Add a check to prevent circular references (a location cannot be its own parent)
ALTER TABLE public.warehouse_locations
ADD CONSTRAINT warehouse_locations_no_self_parent 
CHECK (parent_id IS NULL OR parent_id != id);
