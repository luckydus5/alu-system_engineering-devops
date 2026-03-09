-- Create positions table for HR to manage job titles/positions
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add position_id to profiles for employee position assignment
ALTER TABLE public.profiles ADD COLUMN position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for positions
CREATE POLICY "Authenticated users can view positions"
ON public.positions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "HR/Admin can manage positions"
ON public.positions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid()
    AND (d.code = 'HR' OR ur.role IN ('admin', 'super_admin'))
  )
);

-- Create index for faster lookups
CREATE INDEX idx_positions_department ON public.positions(department_id);
CREATE INDEX idx_positions_active ON public.positions(is_active) WHERE is_active = true;
CREATE INDEX idx_profiles_position ON public.profiles(position_id);

-- Trigger for updated_at
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default positions
INSERT INTO public.positions (name, description, level) VALUES
  ('General Staff', 'Standard staff position', 1),
  ('Team Lead', 'Leads a small team within department', 2),
  ('Supervisor', 'Supervises multiple team members', 3),
  ('Manager', 'Department manager', 4),
  ('Senior Manager', 'Senior department management', 5),
  ('Director', 'Director level position', 6),
  ('Executive', 'Executive leadership', 7);