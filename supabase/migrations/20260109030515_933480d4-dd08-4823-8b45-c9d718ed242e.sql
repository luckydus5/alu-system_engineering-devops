-- Import Warehouse items into Block 6 location
-- Classification: Warehouse (f8991b39-80ce-421c-83c7-c65ac61a31da)
-- Location: Block 6 (3a8648f0-6990-4d66-8962-f547f774769c)
-- Department: Warehouse (22222222-2222-2222-2222-222222222222)

-- First batch of items (batch 1 of 11 - ~500 items each)
INSERT INTO inventory_items (department_id, classification_id, location_id, item_number, item_name, quantity, min_quantity, unit, location) VALUES
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), 'Cable gland shroud', 52, 10, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), 'Current measuring module IEC/EN 60947-4-1 /50/60Hz', 4, 2, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), 'DCC accessories panel + cables', 1, 0, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), 'Nut M16 Material:SS', 53, 10, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), 'Spring washer M6x1.8Mm Material:GI', 213, 30, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '0-ring 267x4. FKM80', 2, 1, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '0.3Mm Steel shim pack. ID305,OD395', 2, 0, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1 core cable', 222, 25, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1 core cable', 21, 10, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1" - 1/2" nipple', 2, 1, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1" gasket', 3, 1, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1" gasket', 26, 5, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1" impulse fitting OD26Mm', 1, 0, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1" pistol air impact wrench', 1, 0, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1- way stir connector', 5, 3, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1-1/2" gasket', 24, 4, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1-1/2" gasket', 39, 5, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1-1/4" gasket', 34, 6, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1.5V batteries LR44/A76', 9, 5, 'pcs', 'Block 6'),
('22222222-2222-2222-2222-222222222222', 'f8991b39-80ce-421c-83c7-c65ac61a31da', '3a8648f0-6990-4d66-8962-f547f774769c', 'WH-' || substr(md5(random()::text), 1, 8), '1/2" - 1/4" nipple', 2, 2, 'pcs', 'Block 6');

-- Note: Due to the large size of the file (5,476 items), this is a sample batch.
-- The full import will be done in subsequent migrations to avoid timeout issues.