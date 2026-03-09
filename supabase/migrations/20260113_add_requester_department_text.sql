-- Add text column for requester department (allows custom department names)
ALTER TABLE public.item_requests 
ADD COLUMN IF NOT EXISTS requester_department_text TEXT;

-- Add comment
COMMENT ON COLUMN public.item_requests.requester_department_text IS 'Text field for requester department name (can be custom or from predefined list)';
