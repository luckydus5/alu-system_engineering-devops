-- Inventory import from Excel file
-- Generated on: 2026-01-08T11:53:46.986443

DO $$
DECLARE
  wh_dept_id UUID;
  it_class_id UUID;
  it_loc_id UUID;
BEGIN
  -- Get Warehouse department
  SELECT id INTO wh_dept_id FROM public.departments WHERE code IN ('WH', 'WAREHOUSE') LIMIT 1;

  IF wh_dept_id IS NULL THEN
    RAISE EXCEPTION 'Warehouse department not found';
  END IF;

  -- Get IT Equipments classification
  SELECT id INTO it_class_id FROM public.warehouse_classifications
  WHERE department_id = wh_dept_id AND name ILIKE '%IT Equipment%' LIMIT 1;

  IF it_class_id IS NULL THEN
    RAISE EXCEPTION 'IT Equipments classification not found';
  END IF;

  -- Get or create location
  SELECT id INTO it_loc_id FROM public.warehouse_locations
  WHERE classification_id = it_class_id AND parent_id IS NULL LIMIT 1;

  IF it_loc_id IS NULL THEN
    INSERT INTO public.warehouse_locations (department_id, classification_id, name)
    VALUES (wh_dept_id, it_class_id, 'Main Storage')
    RETURNING id INTO it_loc_id;
  END IF;

  -- Insert inventory items
  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '12V Power supply for routers', 'IT-20260108-7F1FB059', 9, 4, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '12V power supply', 'IT-20260108-7F22C2F1', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '12V power supply for DS TV', 'IT-20260108-5A450870', 0, 3, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '12V, 65Ah damaged car battery', 'IT-20260108-D842FC66', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '20V Lenovo laptop power supply', 'IT-20260108-EE14F250', 2, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '20V Lenovo laptop power supply, USB C type', 'IT-20260108-E697C029', 1, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '20V power supply for Dell laptop', 'IT-20260108-053332CA', 0, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '20V power supply for HP laptop', 'IT-20260108-D8E1819C', 0, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '21" HP computer monitor - Damaged screen', 'IT-20260108-520A46F0', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '21" HP computer monitor - damaged mother board', 'IT-20260108-2CD96B43', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '24" HP computer monitor', 'IT-20260108-385C7E41', 3, 3, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '24" HP computer monitor - damaged', 'IT-20260108-3DE55005', 3, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '43 inches TV', 'IT-20260108-286E1630', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, '9V batteries', 'IT-20260108-14ABCFDC', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Accessories for GoPro camera', 'IT-20260108-619E0795', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Adapter cable for UPS', 'IT-20260108-5F90FF97', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Automatic voltage regulator, 140V & 220V', 'IT-20260108-45B8926E', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Battery charger for Walkie talkie - old model', 'IT-20260108-CD09114A', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Battery charger for camera', 'IT-20260108-CEEEB208', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Battery for old model laptops', 'IT-20260108-B8CADC06', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Blank ID cards for ID card printer', 'IT-20260108-108FB2E5', 569, 100, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Cable for Star link', 'IT-20260108-2AE1278B', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Calculator with big size display', 'IT-20260108-A610157A', 3, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Calculator with medel size display', 'IT-20260108-C9B1EB06', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Canon 2520 printer. not working.', 'IT-20260108-F652599A', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Cartridge HP 17A', 'IT-20260108-914DE0D2', 0, 4, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Cartridge HP410A', 'IT-20260108-A6C9437D', 1, 4, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Cartridge Kyocera TK1170', 'IT-20260108-F3595F69', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Cartridge TK6115', 'IT-20260108-ADD22CEB', 3, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Computer bag', 'IT-20260108-26D4D0C2', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Computer keyboards - used but working perfect', 'IT-20260108-E3D62DE8', 10, 4, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Computer mouse (damaged)', 'IT-20260108-C75F9929', 0, 3, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Console cable', 'IT-20260108-EDDF5D5D', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'D-Link switches (Unknown condition)', 'IT-20260108-BBDB4DB6', 8, 3, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'DJI phantom drone', 'IT-20260108-37A05EAE', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'DP to HDMI adapter', 'IT-20260108-626C0BC2', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'DP to VGA adapter', 'IT-20260108-8C209546', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Damaged Aruba access point', 'IT-20260108-82D3AB4C', 2, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Damaged keyboard', 'IT-20260108-77B625A2', 3, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Display port cable', 'IT-20260108-8347AB29', 3, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Empty cartridge for laser printer, made by HP', 'IT-20260108-1935FAA6', 5, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Extension cable for power supplies and Computers', 'IT-20260108-319E3B12', 3, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Fire alarm (damaged)', 'IT-20260108-7C0CCA80', 2, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Fujisto 24" computer monitor', 'IT-20260108-A756DA18', 3, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HDMI cable for TV', 'IT-20260108-00B2B05B', 0, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HDMI cable for projector', 'IT-20260108-C6969C53', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HDMI to display port adapter', 'IT-20260108-D51980F4', 9, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HP computer monitor', 'IT-20260108-0A9644FE', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HP laptop without charger (unknown condition)', 'IT-20260108-2749DEFD', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HP laser jet pro MFP M177fw, damaged', 'IT-20260108-943EFAAD', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HP laser jet pro printer, damaged', 'IT-20260108-8E443882', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HP printer (Unknown condition)', 'IT-20260108-CA245ECD', 2, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HP small printer - damaged', 'IT-20260108-C3D107EF', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'HP small printer- broken scanning and LCD unit', 'IT-20260108-F7385D24', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'High quality internet cable 50 meters long', 'IT-20260108-403CC65E', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Household fan', 'IT-20260108-EF107540', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Inc cartridge for HP design jet 711 printer - Black', 'IT-20260108-884DE628', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Inc cartridge for HP design jet 711 printer - Blue', 'IT-20260108-F8CF454F', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Inc cartridge for HP design jet 711 printer - Red', 'IT-20260108-503163A7', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Internet cable (used)', 'IT-20260108-D8D97C00', 8, 3, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Internet cable, 0.5 meters long', 'IT-20260108-CD905E88', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Internet cable, 2 meters long', 'IT-20260108-5103ED6A', 1, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Internet cable, 2.5 meters long', 'IT-20260108-146B53BA', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Internet cable, 20 meters long', 'IT-20260108-75B675A7', 1, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Internet router TP link ARCHER - C86', 'IT-20260108-EBA85D14', 0, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Key tags', 'IT-20260108-DC32AD6D', 29, 10, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Laptop HP ProBook 440 G10 core i7 16GB ram / 1TB SSD', 'IT-20260108-318CBA61', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Laptop batteries Lenovo Thinkpad T480', 'IT-20260108-A3437A5E', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Laptop keyboard and touch pad', 'IT-20260108-5953BAFE', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Linksys internet router used but working', 'IT-20260108-89E3DBD7', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Mobile WiFi with damaged battery', 'IT-20260108-ACB4540C', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'New Aruba access point', 'IT-20260108-6B6DE02F', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'New printer cartridge for HP, 83A', 'IT-20260108-8D0CB8E0', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'New printer cartridge, C3320/C3330/C3025', 'IT-20260108-56EBC02E', 3, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Notebook power adapter. With different connectors', 'IT-20260108-7803C3E8', 1, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Oxygen cylinder', 'IT-20260108-340E48EB', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Power cable for camera charger', 'IT-20260108-5BA1576D', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Power cord', 'IT-20260108-DC32F92B', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Power cord with surge protector ability', 'IT-20260108-805EFB84', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Power supply for D-Link router', 'IT-20260108-DDB40231', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Remote control for DS TV', 'IT-20260108-75AD17B4', 4, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Ricoh MP2501SP printer smaller size. Not working', 'IT-20260108-728A7090', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Ricoh MP2501SP printer. Not working.', 'IT-20260108-210B8116', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Sampling kit from AGCO. part number:3909795M91', 'IT-20260108-1A369575', 4, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Service kit for Drone', 'IT-20260108-A29190A8', 0, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Star link modem and receiver (Locked by Fortum)', 'IT-20260108-FCC18B97', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Stickers', 'IT-20260108-FC63FB02', 4, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Switching mode power supply -POE', 'IT-20260108-1A02E708', 3, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'TV stand 1 pair in Fortum.', 'IT-20260108-CFFEFA95', 3, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Toolset for IT related jobs', 'IT-20260108-29D12A17', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'UPS batteries', 'IT-20260108-1E894538', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'UPS with damaged battery', 'IT-20260108-0805A466', 2, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'UPS with damaged battery (bigger size)', 'IT-20260108-C8FE5925', 2, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'UPS with damaged battery (smaller size)', 'IT-20260108-83CD15A5', 2, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'USB HOST to HOST Link adapter', 'IT-20260108-B10B1F52', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'USB cable for printer', 'IT-20260108-B1DC42B4', 3, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'USB cables for printer', 'IT-20260108-1DB633C8', 3, 2, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'USB to USB 2.0 cable', 'IT-20260108-BC6FFB06', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'USB to USB cable', 'IT-20260108-22486991', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'USB type A cable', 'IT-20260108-5A121F8F', 1, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'UTP crimping tool', 'IT-20260108-739E2E2A', 3, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Unifi (damaged)', 'IT-20260108-F4325746', 3, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Used routers (unknown condition)', 'IT-20260108-E091DE5E', 12, 5, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'VGA cable', 'IT-20260108-115C202A', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Waterproofing cover for action camera', 'IT-20260108-34D20240', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Zebra ZXP card printer ribbons (new)', 'IT-20260108-FCE77E46', 3, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Zebra ZXP card printer ribbons (used)', 'IT-20260108-62D59849', 1, 0, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'Zebra ZXP single - sided card printer', 'IT-20260108-1656DA3F', 2, 1, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'empty printer cartridge, 17A, made by ASTA', 'IT-20260108-5AD71C92', 10, 5, 'pcs')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.inventory_items (department_id, classification_id, location_id, item_name, item_number, quantity, min_quantity, unit)
  VALUES (wh_dept_id, it_class_id, it_loc_id, 'wall clock - Quartz movement', 'IT-20260108-A31037D7', 0, 0, 'pcs')
  ON CONFLICT DO NOTHING;

END $$;