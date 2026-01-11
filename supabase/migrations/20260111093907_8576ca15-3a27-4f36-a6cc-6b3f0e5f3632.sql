-- Grant super_admin full access to all tables

-- DEPARTMENTS
CREATE POLICY "Super admins can do all on departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- FLEETS
CREATE POLICY "Super admins can do all on fleets"
ON public.fleets FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- FLEET_AUDIT_LOG
CREATE POLICY "Super admins can do all on fleet_audit_log"
ON public.fleet_audit_log FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- FLEET_ISSUES
CREATE POLICY "Super admins can do all on fleet_issues"
ON public.fleet_issues FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- INVENTORY_ITEMS
CREATE POLICY "Super admins can do all on inventory_items"
ON public.inventory_items FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- MAINTENANCE_RECORDS
CREATE POLICY "Super admins can do all on maintenance_records"
ON public.maintenance_records FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- NOTIFICATIONS
CREATE POLICY "Super admins can do all on notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- PROFILES
CREATE POLICY "Super admins can do all on profiles"
ON public.profiles FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- REPORTS
CREATE POLICY "Super admins can do all on reports"
ON public.reports FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- REPORT_COMMENTS
CREATE POLICY "Super admins can do all on report_comments"
ON public.report_comments FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- STOCK_TRANSACTIONS
CREATE POLICY "Super admins can do all on stock_transactions"
ON public.stock_transactions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- USER_DEPARTMENT_ACCESS
CREATE POLICY "Super admins can do all on user_department_access"
ON public.user_department_access FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- USER_ROLES
CREATE POLICY "Super admins can do all on user_roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- WAREHOUSE_CLASSIFICATIONS
CREATE POLICY "Super admins can do all on warehouse_classifications"
ON public.warehouse_classifications FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- WAREHOUSE_LOCATIONS
CREATE POLICY "Super admins can do all on warehouse_locations"
ON public.warehouse_locations FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- AUDIT_LOGS - Super admins can also delete audit logs if needed
CREATE POLICY "Super admins can delete audit_logs"
ON public.audit_logs FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update audit_logs"
ON public.audit_logs FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));