-- Make user Olivier Dusabamahoro a super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = 'd5451ba0-36a5-4a83-8172-8746ee1ccee0';