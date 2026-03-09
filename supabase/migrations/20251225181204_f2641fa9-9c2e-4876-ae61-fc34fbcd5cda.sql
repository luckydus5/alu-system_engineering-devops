-- Add Peat Maintenance department
INSERT INTO public.departments (name, code, description, icon, color)
VALUES ('Peat Maintenance', 'PEAT', 'Fleet maintenance management for mechanical equipment and tractors', 'Wrench', '#1e3a5f');

-- Create fleet_status enum
CREATE TYPE public.fleet_status AS ENUM ('operational', 'under_maintenance', 'out_of_service');

-- Create service_type enum
CREATE TYPE public.service_type AS ENUM ('preventive', 'corrective', 'breakdown');

-- Create condition_type enum
CREATE TYPE public.condition_type AS ENUM ('good', 'fair', 'poor');

-- Create fleets table
CREATE TABLE public.fleets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fleet_number VARCHAR(20) NOT NULL UNIQUE,
    machine_type VARCHAR(100) NOT NULL,
    status fleet_status NOT NULL DEFAULT 'operational',
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_records table
CREATE TABLE public.maintenance_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    service_type service_type NOT NULL DEFAULT 'preventive',
    service_description TEXT NOT NULL,
    maintenance_date DATE NOT NULL,
    delivery_time_hours INTEGER,
    machine_hours INTEGER,
    condition_after_service condition_type DEFAULT 'good',
    current_status VARCHAR(50),
    remarks TEXT,
    checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    next_service_due DATE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for fleets
CREATE POLICY "Users in department can view fleets"
ON public.fleets FOR SELECT
USING (
    user_in_department(auth.uid(), department_id) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'director'::app_role)
);

CREATE POLICY "Supervisors+ can create fleets"
ON public.fleets FOR INSERT
WITH CHECK (
    (user_in_department(auth.uid(), department_id) AND (
        has_role(auth.uid(), 'supervisor'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'director'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role)
    ))
);

CREATE POLICY "Supervisors+ can update fleets"
ON public.fleets FOR UPDATE
USING (
    (user_in_department(auth.uid(), department_id) AND (
        has_role(auth.uid(), 'supervisor'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'director'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role)
    ))
);

-- RLS policies for maintenance_records
CREATE POLICY "Users in department can view maintenance records"
ON public.maintenance_records FOR SELECT
USING (
    user_in_department(auth.uid(), department_id) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'director'::app_role)
);

CREATE POLICY "Staff+ can create maintenance records"
ON public.maintenance_records FOR INSERT
WITH CHECK (
    user_in_department(auth.uid(), department_id) 
    OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Supervisors+ can update maintenance records"
ON public.maintenance_records FOR UPDATE
USING (
    (user_in_department(auth.uid(), department_id) AND (
        has_role(auth.uid(), 'supervisor'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'director'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role)
    ))
);

-- Create updated_at trigger for fleets
CREATE TRIGGER update_fleets_updated_at
BEFORE UPDATE ON public.fleets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for maintenance_records
CREATE TRIGGER update_maintenance_records_updated_at
BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();