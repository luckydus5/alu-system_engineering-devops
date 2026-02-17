
-- Hide Peat Maintenance and Peat Operations from dashboard (HR-only classification departments)
UPDATE departments SET is_hr_only = true WHERE code IN ('MAINT_P', 'OPS_P');
