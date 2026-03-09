-- Create a table for receiving records (incoming purchases)
CREATE TABLE public.receiving_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  record_name TEXT NOT NULL,
  receiving_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receiving_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view receiving records in their department"
ON public.receiving_records
FOR SELECT
USING (
  department_id IN (
    SELECT department_id FROM public.user_roles WHERE user_id = auth.uid()
    UNION
    SELECT department_id FROM public.user_department_access WHERE user_id = auth.uid()
  )
  OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Users can create receiving records"
ON public.receiving_records
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update receiving records"
ON public.receiving_records
FOR UPDATE
USING (
  department_id IN (
    SELECT department_id FROM public.user_roles WHERE user_id = auth.uid()
    UNION
    SELECT department_id FROM public.user_department_access WHERE user_id = auth.uid()
  )
  OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Users can delete receiving records"
ON public.receiving_records
FOR DELETE
USING (
  department_id IN (
    SELECT department_id FROM public.user_roles WHERE user_id = auth.uid()
    UNION
    SELECT department_id FROM public.user_department_access WHERE user_id = auth.uid()
  )
  OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Create index for faster lookups
CREATE INDEX idx_receiving_records_department_id ON public.receiving_records(department_id);
CREATE INDEX idx_receiving_records_receiving_date ON public.receiving_records(receiving_date);
CREATE INDEX idx_receiving_records_status ON public.receiving_records(status);

-- Create trigger for updated_at
CREATE TRIGGER update_receiving_records_updated_at
BEFORE UPDATE ON public.receiving_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();