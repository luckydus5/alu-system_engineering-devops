-- Insert Warehouse department
INSERT INTO public.departments (id, code, name, description, icon, color)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'WAREHOUSE',
  'Warehouse',
  'Warehouse Inventory Management',
  'Warehouse',
  '#6366F1'
);

-- Create inventory table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  item_number VARCHAR(50) NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(department_id, item_number)
);

-- Create index for performance
CREATE INDEX idx_inventory_items_department ON public.inventory_items(department_id);
CREATE INDEX idx_inventory_items_item_number ON public.inventory_items(item_number);
CREATE INDEX idx_inventory_items_location ON public.inventory_items(location);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users in department can view inventory items"
ON public.inventory_items
FOR SELECT
USING (
  user_in_department(auth.uid(), department_id) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'director'::app_role)
);

CREATE POLICY "Staff+ can create inventory items"
ON public.inventory_items
FOR INSERT
WITH CHECK (
  user_in_department(auth.uid(), department_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Supervisors+ can update inventory items"
ON public.inventory_items
FOR UPDATE
USING (
  (user_in_department(auth.uid(), department_id) AND (
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'director'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'director'::app_role)
);

CREATE POLICY "Supervisors+ can delete inventory items"
ON public.inventory_items
FOR DELETE
USING (
  (user_in_department(auth.uid(), department_id) AND (
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'director'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'director'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;

-- Grant access to user for warehouse department
INSERT INTO public.user_department_access (user_id, department_id, granted_by)
SELECT 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a', '66666666-6666-6666-6666-666666666666', 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_department_access 
  WHERE user_id = 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a' 
  AND department_id = '66666666-6666-6666-6666-666666666666'
);