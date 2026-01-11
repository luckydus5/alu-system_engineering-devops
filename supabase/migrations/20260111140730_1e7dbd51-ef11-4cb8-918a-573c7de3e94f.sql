-- Create office_activities table for department activities
CREATE TABLE public.office_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('meeting', 'task', 'announcement', 'update', 'milestone', 'event')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attendees UUID[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.office_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activities in their department or departments they have access to
CREATE POLICY "Users can view department activities"
ON public.office_activities
FOR SELECT
USING (
  department_id IN (
    SELECT department_id FROM public.user_roles WHERE user_id = auth.uid()
    UNION
    SELECT department_id FROM public.user_department_access WHERE user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Policy: Users can create activities in their department
CREATE POLICY "Users can create activities in their department"
ON public.office_activities
FOR INSERT
WITH CHECK (
  department_id IN (
    SELECT department_id FROM public.user_roles WHERE user_id = auth.uid()
    UNION
    SELECT department_id FROM public.user_department_access WHERE user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Policy: Users can update activities they created or if admin
CREATE POLICY "Users can update activities"
ON public.office_activities
FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'director'))
);

-- Policy: Users can delete activities they created or if admin
CREATE POLICY "Users can delete activities"
ON public.office_activities
FOR DELETE
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_office_activities_updated_at
BEFORE UPDATE ON public.office_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_office_activities_department ON public.office_activities(department_id);
CREATE INDEX idx_office_activities_scheduled ON public.office_activities(scheduled_at);
CREATE INDEX idx_office_activities_status ON public.office_activities(status);