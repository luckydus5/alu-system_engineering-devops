-- ============================================
-- Warehouse Classifications and Locations
-- ============================================

-- 1. Warehouse Classifications Table (IT Equipments, Land Survey, PPE, etc.)
CREATE TABLE IF NOT EXISTS public.warehouse_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  icon VARCHAR DEFAULT 'Folder',
  color VARCHAR DEFAULT '#6366F1',
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (department_id, name)
);

-- 2. Warehouse Locations Table (1B02, 2A-2, 3C01, etc.)
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classification_id UUID NOT NULL REFERENCES public.warehouse_classifications(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  min_items INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (classification_id, name)
);

-- 3. Add location_id to inventory_items (nullable for backwards compatibility)
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS classification_id UUID REFERENCES public.warehouse_classifications(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit VARCHAR DEFAULT 'pcs',
ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_classifications_department_id ON public.warehouse_classifications(department_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_classification_id ON public.warehouse_locations(classification_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_department_id ON public.warehouse_locations(department_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_classification_id ON public.inventory_items(classification_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_id ON public.inventory_items(location_id);

-- 5. Update triggers
DROP TRIGGER IF EXISTS update_warehouse_classifications_updated_at ON public.warehouse_classifications;
CREATE TRIGGER update_warehouse_classifications_updated_at
  BEFORE UPDATE ON public.warehouse_classifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouse_locations_updated_at ON public.warehouse_locations;
CREATE TRIGGER update_warehouse_locations_updated_at
  BEFORE UPDATE ON public.warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Enable Row Level Security
ALTER TABLE public.warehouse_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for warehouse_classifications

-- Users in department can view classifications
DROP POLICY IF EXISTS "Users in department can view classifications" ON public.warehouse_classifications;
CREATE POLICY "Users in department can view classifications"
  ON public.warehouse_classifications FOR SELECT
  USING (
    public.user_in_department(auth.uid(), department_id) 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can create classifications
DROP POLICY IF EXISTS "Supervisors+ can create classifications" ON public.warehouse_classifications;
CREATE POLICY "Supervisors+ can create classifications"
  ON public.warehouse_classifications FOR INSERT
  WITH CHECK (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can update classifications
DROP POLICY IF EXISTS "Supervisors+ can update classifications" ON public.warehouse_classifications;
CREATE POLICY "Supervisors+ can update classifications"
  ON public.warehouse_classifications FOR UPDATE
  USING (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can delete classifications
DROP POLICY IF EXISTS "Supervisors+ can delete classifications" ON public.warehouse_classifications;
CREATE POLICY "Supervisors+ can delete classifications"
  ON public.warehouse_classifications FOR DELETE
  USING (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- 8. RLS Policies for warehouse_locations

-- Users in department can view locations
DROP POLICY IF EXISTS "Users in department can view locations" ON public.warehouse_locations;
CREATE POLICY "Users in department can view locations"
  ON public.warehouse_locations FOR SELECT
  USING (
    public.user_in_department(auth.uid(), department_id) 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can create locations
DROP POLICY IF EXISTS "Supervisors+ can create locations" ON public.warehouse_locations;
CREATE POLICY "Supervisors+ can create locations"
  ON public.warehouse_locations FOR INSERT
  WITH CHECK (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can update locations
DROP POLICY IF EXISTS "Supervisors+ can update locations" ON public.warehouse_locations;
CREATE POLICY "Supervisors+ can update locations"
  ON public.warehouse_locations FOR UPDATE
  USING (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can delete locations
DROP POLICY IF EXISTS "Supervisors+ can delete locations" ON public.warehouse_locations;
CREATE POLICY "Supervisors+ can delete locations"
  ON public.warehouse_locations FOR DELETE
  USING (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- 9. Insert default classifications for Warehouse department (only if the department exists)
DO $$
DECLARE
  wh_dept_id UUID;
BEGIN
  -- Try to find the Warehouse department
  SELECT id INTO wh_dept_id FROM public.departments WHERE code IN ('WH', 'WAREHOUSE') LIMIT 1;
  
  IF wh_dept_id IS NOT NULL THEN
    INSERT INTO public.warehouse_classifications (department_id, name, description, icon, color, sort_order)
    VALUES
      (wh_dept_id, 'IT Equipments', 'Computers, monitors, keyboards, networking equipment', 'Monitor', '#3B82F6', 1),
      (wh_dept_id, 'Land Survey and Devices', 'GPS units, measuring tools, survey equipment', 'Compass', '#10B981', 2),
      (wh_dept_id, 'Personal Protective Items', 'Safety gear, helmets, gloves, boots, vests', 'Shield', '#F59E0B', 3),
      (wh_dept_id, 'Peat Containers', 'Containers and bags for peat storage', 'Box', '#8B5CF6', 4),
      (wh_dept_id, 'Spare Parts and Other Materials', 'Machine parts, tools, miscellaneous items', 'Wrench', '#EF4444', 5),
      (wh_dept_id, 'Warehouse Main', 'Main warehouse storage area', 'Warehouse', '#6366F1', 6)
    ON CONFLICT (department_id, name) DO UPDATE SET
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order;
  END IF;
END $$;
