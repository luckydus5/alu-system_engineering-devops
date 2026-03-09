-- Drop existing policies and recreate proper ones

-- USER_ROLES table policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- DEPARTMENTS table policies
DROP POLICY IF EXISTS "Departments are viewable by authenticated users" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;

CREATE POLICY "Departments are viewable by authenticated users"
ON public.departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- REPORTS table policies
DROP POLICY IF EXISTS "Users can view reports in their department" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can manage all reports" ON public.reports;

CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can view reports in their department"
ON public.reports FOR SELECT
TO authenticated
USING (public.user_in_department(auth.uid(), department_id));

CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own reports"
ON public.reports FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can update all reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- USER_DEPARTMENT_ACCESS policies
DROP POLICY IF EXISTS "Users can view own department access" ON public.user_department_access;
DROP POLICY IF EXISTS "Admins can manage department access" ON public.user_department_access;

CREATE POLICY "Users can view own department access"
ON public.user_department_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all department access"
ON public.user_department_access FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert department access"
ON public.user_department_access FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete department access"
ON public.user_department_access FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);