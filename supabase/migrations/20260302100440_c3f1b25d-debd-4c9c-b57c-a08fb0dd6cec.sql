-- Cancel Olivier's leave request
UPDATE leave_requests 
SET status = 'cancelled', updated_at = now()
WHERE id = 'ee5b0937-ff41-4410-9573-dd418eb9121b';

-- Restore 1 used day back to annual balance
UPDATE leave_balances 
SET used_days = used_days - 1, updated_at = now()
WHERE id = '75589fb8-6be4-4761-be33-84717d6d0b5e' 
AND user_id = 'd5451ba0-36a5-4a83-8172-8746ee1ccee0'
AND leave_type = 'annual';