-- Create comprehensive audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view audit logs
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can also view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to log audits
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email_val TEXT;
  user_name_val TEXT;
  dept_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Get user info
  IF current_user_id IS NOT NULL THEN
    SELECT email, full_name INTO user_email_val, user_name_val
    FROM public.profiles WHERE id = current_user_id;
  END IF;
  
  -- Try to get department_id from the record
  BEGIN
    IF TG_OP = 'DELETE' THEN
      dept_id := (OLD.department_id)::UUID;
    ELSE
      dept_id := (NEW.department_id)::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    dept_id := NULL;
  END;

  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_name,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    department_id
  ) VALUES (
    COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(user_email_val, 'system'),
    COALESCE(user_name_val, 'System'),
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    dept_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add audit triggers to key tables
CREATE TRIGGER audit_inventory_items
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_fleets
AFTER INSERT OR UPDATE OR DELETE ON public.fleets
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_maintenance_records
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_records
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_reports
AFTER INSERT OR UPDATE OR DELETE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_departments
AFTER INSERT OR UPDATE OR DELETE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_stock_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.stock_transactions
FOR EACH ROW EXECUTE FUNCTION public.log_audit();