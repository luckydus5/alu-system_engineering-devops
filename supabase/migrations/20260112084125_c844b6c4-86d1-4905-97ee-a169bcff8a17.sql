-- Delete old audit logs with "System" placeholder names (these don't have real user info)
DELETE FROM audit_logs 
WHERE user_name = 'System' 
   OR user_email = 'system'
   OR user_id = '00000000-0000-0000-0000-000000000000'::uuid;