-- ============================================
-- Warehouse / Inventory Management Tables
-- ============================================

-- Drop existing tables to recreate with correct schema
DROP TABLE IF EXISTS public.stock_transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;

-- 1. Inventory Items Table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  item_number VARCHAR NOT NULL,
  item_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location VARCHAR,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (department_id, item_number)
);

-- 2. Stock Transactions Table
CREATE TABLE public.stock_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  transaction_type VARCHAR NOT NULL CHECK (transaction_type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX idx_inventory_items_department_id ON public.inventory_items(department_id);
CREATE INDEX idx_inventory_items_item_number ON public.inventory_items(item_number);
CREATE INDEX idx_inventory_items_quantity ON public.inventory_items(quantity);
CREATE INDEX idx_stock_transactions_item_id ON public.stock_transactions(inventory_item_id);
CREATE INDEX idx_stock_transactions_department_id ON public.stock_transactions(department_id);
CREATE INDEX idx_stock_transactions_type ON public.stock_transactions(transaction_type);
CREATE INDEX idx_stock_transactions_created_at ON public.stock_transactions(created_at);

-- 4. Update trigger for inventory_items
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for inventory_items

-- Users in department can view inventory
DROP POLICY IF EXISTS "Users in department can view inventory" ON public.inventory_items;
CREATE POLICY "Users in department can view inventory"
  ON public.inventory_items FOR SELECT
  USING (
    public.user_in_department(auth.uid(), department_id) 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can create inventory items
DROP POLICY IF EXISTS "Supervisors+ can create inventory items" ON public.inventory_items;
CREATE POLICY "Supervisors+ can create inventory items"
  ON public.inventory_items FOR INSERT
  WITH CHECK (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can update inventory items
DROP POLICY IF EXISTS "Supervisors+ can update inventory items" ON public.inventory_items;
CREATE POLICY "Supervisors+ can update inventory items"
  ON public.inventory_items FOR UPDATE
  USING (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can delete inventory items
DROP POLICY IF EXISTS "Supervisors+ can delete inventory items" ON public.inventory_items;
CREATE POLICY "Supervisors+ can delete inventory items"
  ON public.inventory_items FOR DELETE
  USING (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- 7. RLS Policies for stock_transactions

-- Users in department can view transactions
DROP POLICY IF EXISTS "Users in department can view stock transactions" ON public.stock_transactions;
CREATE POLICY "Users in department can view stock transactions"
  ON public.stock_transactions FOR SELECT
  USING (
    public.user_in_department(auth.uid(), department_id) 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- Supervisors+ can create transactions
DROP POLICY IF EXISTS "Supervisors+ can create stock transactions" ON public.stock_transactions;
CREATE POLICY "Supervisors+ can create stock transactions"
  ON public.stock_transactions FOR INSERT
  WITH CHECK (
    (public.user_in_department(auth.uid(), department_id) 
      AND (public.has_role(auth.uid(), 'supervisor') 
        OR public.has_role(auth.uid(), 'manager') 
        OR public.has_role(auth.uid(), 'director') 
        OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'director')
  );

-- 8. Create a Warehouse department if it doesn't exist
INSERT INTO public.departments (id, name, code, description, icon, color) VALUES
  ('66666666-6666-6666-6666-666666666666', 'Warehouse', 'WH', 'Warehouse & Inventory Management', 'Warehouse', '#6366F1')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- 9. Create Storage bucket for inventory images (run via Supabase dashboard or separate script)
-- This needs to be done in the Supabase dashboard:
-- 1. Go to Storage
-- 2. Create a new bucket called "inventory-images"
-- 3. Make it public or set appropriate policies
