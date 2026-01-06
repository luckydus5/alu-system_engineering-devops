-- Update olivierdusa5@gmail.com to admin role with access to all departments
UPDATE public.user_roles 
SET role = 'admin', department_id = '11111111-1111-1111-1111-111111111111'
WHERE user_id = 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a';

-- Also update their profile with a proper name
UPDATE public.profiles 
SET full_name = 'Olivier Dusabamahoro', department_id = '11111111-1111-1111-1111-111111111111'
WHERE id = 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a';