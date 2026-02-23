-- Index for fast item_requests filtering by department + date
CREATE INDEX IF NOT EXISTS idx_item_requests_dept_created 
ON public.item_requests (department_id, created_at DESC);