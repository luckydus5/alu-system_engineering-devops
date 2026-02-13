DELETE FROM leave_requests WHERE requester_id = (
  SELECT id FROM profiles WHERE full_name ILIKE '%charles irakiza%' LIMIT 1
);