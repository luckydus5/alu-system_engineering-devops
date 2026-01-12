-- Drop and recreate the log_audit function with better user detection
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
  affected_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- For user_roles table, try to get info about the user being modified
  IF TG_TABLE_NAME = 'user_roles' THEN
    IF TG_OP = 'DELETE' THEN
      affected_user_id := OLD.user_id;
    ELSE
      affected_user_id := NEW.user_id;
    END IF;
  END IF;
  
  -- Get current user info (the person performing the action)
  IF current_user_id IS NOT NULL THEN
    SELECT email, full_name INTO user_email_val, user_name_val
    FROM public.profiles WHERE id = current_user_id;
  END IF;
  
  -- If we still don't have user info but this is a user_roles operation,
  -- try to get info from the affected user's profile for context
  IF user_name_val IS NULL AND TG_TABLE_NAME = 'user_roles' AND affected_user_id IS NOT NULL THEN
    SELECT 
      COALESCE(p.full_name, p.email, 'Unknown User'),
      COALESCE(p.email, 'unknown')
    INTO user_name_val, user_email_val
    FROM public.profiles p WHERE p.id = affected_user_id;
    
    -- Mark that this was an admin action affecting this user
    IF user_name_val IS NOT NULL THEN
      user_name_val := 'Admin action on: ' || user_name_val;
      user_email_val := 'affected: ' || COALESCE(user_email_val, 'unknown');
    END IF;
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
    COALESCE(current_user_id, affected_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
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