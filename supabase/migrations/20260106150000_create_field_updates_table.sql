-- Create field_updates table for Operations department updates
CREATE TABLE IF NOT EXISTS public.field_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'on_hold', 'issue')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    location VARCHAR(255),
    photos TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_field_updates_department ON public.field_updates(department_id);
CREATE INDEX IF NOT EXISTS idx_field_updates_created_by ON public.field_updates(created_by);
CREATE INDEX IF NOT EXISTS idx_field_updates_created_at ON public.field_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_updates_status ON public.field_updates(status);

-- Create field_update_comments table for comments on updates
CREATE TABLE IF NOT EXISTS public.field_update_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_update_id UUID NOT NULL REFERENCES public.field_updates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_update_comments_update ON public.field_update_comments(field_update_id);

-- Enable RLS
ALTER TABLE public.field_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_update_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for field_updates
CREATE POLICY "Users can view field updates in their department or if admin/director" 
ON public.field_updates FOR SELECT 
USING (
    auth.uid() IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'director'))
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND department_id = field_updates.department_id)
        OR EXISTS (SELECT 1 FROM public.user_department_access WHERE user_id = auth.uid() AND department_id = field_updates.department_id)
    )
);

CREATE POLICY "Users can create field updates in their department" 
ON public.field_updates FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'director'))
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND department_id = field_updates.department_id)
        OR EXISTS (SELECT 1 FROM public.user_department_access WHERE user_id = auth.uid() AND department_id = field_updates.department_id)
    )
);

CREATE POLICY "Users can update their own field updates or if supervisor+" 
ON public.field_updates FOR UPDATE 
USING (
    auth.uid() IS NOT NULL AND (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'director', 'manager', 'supervisor'))
    )
);

CREATE POLICY "Supervisors+ can delete field updates" 
ON public.field_updates FOR DELETE 
USING (
    auth.uid() IS NOT NULL AND (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'director', 'manager', 'supervisor'))
    )
);

-- RLS Policies for field_update_comments
CREATE POLICY "Users can view comments on accessible updates" 
ON public.field_update_comments FOR SELECT 
USING (
    auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.field_updates 
        WHERE id = field_update_comments.field_update_id
    )
);

CREATE POLICY "Users can create comments" 
ON public.field_update_comments FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own comments" 
ON public.field_update_comments FOR DELETE 
USING (user_id = auth.uid());

-- Create storage bucket for field update photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'field-updates',
    'field-updates',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for field-updates bucket
CREATE POLICY "Anyone can view field update photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'field-updates');

CREATE POLICY "Authenticated users can upload field update photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'field-updates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'field-updates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'field-updates' AND auth.uid() IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_field_updates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_field_updates_timestamp
    BEFORE UPDATE ON public.field_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_field_updates_timestamp();
