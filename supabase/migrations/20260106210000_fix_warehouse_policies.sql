-- Fix RLS policies for inventory to allow admins to view all inventory
-- Also ensure warehouse department exists

-- More permissive SELECT policy - allow authenticated users with appropriate roles
DROP POLICY IF EXISTS "Users in department can view inventory" ON public.inventory_items;
CREATE POLICY "Users can view inventory"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (
    public.user_in_department(auth.uid(), department_id) 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Same for stock_transactions
DROP POLICY IF EXISTS "Users in department can view stock transactions" ON public.stock_transactions;
CREATE POLICY "Users can view stock transactions"
  ON public.stock_transactions FOR SELECT
  TO authenticated
  USING (
    public.user_in_department(auth.uid(), department_id) 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Ensure Warehouse department exists
INSERT INTO public.departments (id, name, code, description, icon, color) VALUES
  ('66666666-6666-6666-6666-666666666666', 'Warehouse', 'WH', 'Warehouse & Inventory Management', 'Warehouse', '#6366F1')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;
