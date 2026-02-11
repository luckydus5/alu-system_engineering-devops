
-- ==========================================
-- Performance Reviews & Goals
-- ==========================================
CREATE TABLE public.performance_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  review_period TEXT NOT NULL, -- e.g. 'Q1 2026', 'Annual 2025'
  score INTEGER CHECK (score >= 0 AND score <= 100),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can manage performance reviews"
  ON public.performance_reviews FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    EXISTS (
      SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id 
      WHERE ur.user_id = auth.uid() AND d.code = 'HR'
    )
  );

CREATE POLICY "Managers can view department reviews"
  ON public.performance_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e 
      JOIN user_roles ur ON ur.department_id = e.department_id
      WHERE e.id = performance_reviews.employee_id 
        AND ur.user_id = auth.uid() 
        AND ur.role IN ('manager', 'director', 'supervisor')
    )
  );

CREATE POLICY "Authenticated users can view reviews"
  ON public.performance_reviews FOR SELECT
  USING (true);

CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Performance Goals
-- ==========================================
CREATE TABLE public.performance_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can manage goals"
  ON public.performance_goals FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    EXISTS (
      SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id 
      WHERE ur.user_id = auth.uid() AND d.code = 'HR'
    )
  );

CREATE POLICY "Authenticated users can view goals"
  ON public.performance_goals FOR SELECT
  USING (true);

CREATE TRIGGER update_performance_goals_updated_at
  BEFORE UPDATE ON public.performance_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Onboarding Checklists
-- ==========================================
CREATE TABLE public.onboarding_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  task_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'admin', -- admin, it, hr, training, team, facilities
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can manage onboarding"
  ON public.onboarding_checklists FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    EXISTS (
      SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id 
      WHERE ur.user_id = auth.uid() AND d.code = 'HR'
    )
  );

CREATE POLICY "Authenticated users can view onboarding"
  ON public.onboarding_checklists FOR SELECT
  USING (true);

CREATE TRIGGER update_onboarding_checklists_updated_at
  BEFORE UPDATE ON public.onboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
