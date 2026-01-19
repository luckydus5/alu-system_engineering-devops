-- Drop the overly permissive delete policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users can delete requests" ON public.item_requests;

-- Create a proper delete policy for supervisors+ in department
CREATE POLICY "Supervisors+ can delete item requests" 
ON public.item_requests 
FOR DELETE 
USING (
  -- User is in the department with appropriate role
  (user_in_department(auth.uid(), department_id) AND (
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'director'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  ))
  OR 
  -- Global admin/director can delete any
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  has_role(auth.uid(), 'director'::app_role)
);