
-- First clear all fingerprint numbers to avoid unique constraint conflicts
UPDATE employees SET fingerprint_number = NULL WHERE id IN (
  'f4172d32-734e-42ff-8db3-c16f99f56ab9', 'd5cacd2e-083b-4165-9dd2-507eef6982a8',
  '5f99fcdf-704d-42dc-a25d-2b3d348edf5b', '06acdd7a-caeb-4786-a3ab-3228e1349e7f',
  '2ab94cb7-076f-4f71-b9e6-d3bd3b2e3bcc', 'fbc98cce-c995-450e-9a3f-177cc3f87cb3',
  '80381437-eec0-43a4-849a-86116be57fae', 'f0a8165c-55e0-4b2c-899f-da0ac6704dd4',
  '2d438d99-8624-4ea2-9647-46bcb2c2f6f1', 'cdff263b-c425-48b8-83c6-add379c1be63',
  '7b89c870-2880-441f-8798-5ca6f7f593a1', '8be24fe4-1e9a-47dc-a156-7c8340d5318c',
  '9f8f9778-d082-4bc1-8903-242a3c7e206c', 'e9d7817c-2d56-4eca-bb0a-39f904f25676',
  '31fd6c26-e79f-45c8-89b6-16e1dfb0cd20', 'bcea37a1-96d0-4954-b658-15885b59efd8',
  '7c370cde-310f-4b84-ad44-153f36dadf13', '43c830fc-fb37-4c93-bc90-4efda214f6d4',
  '5f852c89-47e7-4b90-85db-03d72f5bc20e', 'b6bf05f0-b1da-4700-9eaa-884e7e58e11e',
  '8a0a89b6-9bf3-478d-97ea-20fcb44e768f', 'f277e635-e652-4ec0-8dc2-a257060b6ede',
  '6e39b09f-8e46-473d-a2e2-7eea07cdda12', '8792c749-ea8d-47eb-88e2-df683ebb6696',
  '0b0d737e-3beb-42d9-ae86-4bfd32d56d4f', '919520dc-0165-48c0-a533-67ed9e84d838',
  '01817717-6019-41bf-9d20-94375183f309', '9e4c984b-59d7-4e9f-8e23-18c7ce82507e',
  'd88e0203-b23c-4be0-8217-ddfe0c48da6e', '770eeb1b-86ad-4d48-9cec-f73d42057d0f',
  '4a872aa4-6932-4c5d-b81d-f48275f9acbb', '9828745a-3aea-4bff-8ddd-8cbd57ca8c3e',
  'dff43e96-f191-40df-be06-03363737350c', '75657304-2adb-488d-918b-3fb76416ea69',
  '8c7c2e19-460a-4a74-b9f0-47aa36efca21', '1bd724b0-403b-4fd0-8d61-a4e6f520a67b',
  '0501ad2c-d5d7-41db-a56e-521400aacdaa', 'c3b4a830-7b90-442d-8fa7-00c816d6accb',
  'b6c1e247-59d6-48ce-a48e-46eb68bbe5cc', 'f9dd5f76-072e-47b4-9bf6-f577c8f25e8a',
  'fdbd9349-59fc-4801-9ed0-b27d6bd645ea', '08e04fd2-8378-4fe5-a0ab-3fda0b153ad0',
  '0224e3cd-d0c0-43f2-81d4-575a7815adc7', '3cdfacf0-6c18-4472-8213-165c6815382a',
  '3fd310e5-6e64-4c86-bf29-dd78a60904a4', '1900570d-af46-46b6-8120-81a275dbc762',
  'd7066b5b-fc95-43d0-a0d9-7c5815939ebc', '6387fa8c-d96c-44d2-8a54-f26ca028125f',
  'ed4d1b4a-40bb-4cda-ac72-d4da3dbfac6b', '25dda15e-ef33-44ec-a02f-7fa079666ea3',
  '27ff4e1e-181f-4136-a5be-a079789754b5', '531701bd-4324-459f-b1ab-3680c18a6f86',
  '231855a9-5690-493e-b957-3add0c893b00', '31505f66-9ff8-4be2-90b2-27024fb31a20',
  '5e0fd2c0-1c22-4caf-8ab3-b83b40fd7d44', 'a48880d8-095a-4ed6-a908-73771052dd7e',
  'efc46fc5-b7f0-47a4-97d8-6e2755adc3ce', '46cc0108-daf7-4022-887a-00f32410f9d3',
  'b5ccac19-bd20-487c-ab88-eb100062ded4', '6be89040-4802-48cb-b784-7e80b6dbdb2f',
  'c6e023cf-f4e1-448e-92ce-02ca9f6cefd0', '7e9d351e-9c15-4cdf-bc4b-2b7ba0d844c3',
  'd58fa2db-622a-4ea4-b844-0974a87967be', '52d9a0a9-fe5c-451d-95ca-c665e8c29a4a',
  '0a1a5e2a-feb4-4d0b-97f5-921adb6ae182', '03d277db-a422-4625-aba0-2f0ca041e612',
  'e3135944-f740-443b-8744-4fdd07183d4e', '5e07df62-22ed-4c45-ad94-451a944ae482',
  '707b06c1-6bc4-43f5-8ac5-f45054ba00f8',
  'c7463c02-80e3-42cb-b278-3a60aff0eff8', '38e3df1d-2193-4436-9377-733e0ec286ca',
  '05ac5b53-2f42-4783-931a-3dffcf7f608b', '9f5a7291-2ee9-4971-aad6-168cee15ba7f',
  '13446873-6214-43df-b6f3-7b233db0153f', 'f6e35dc7-7b55-4d76-9542-cd69f7a51e52'
);

-- Now set correct fingerprint numbers from real device
UPDATE employees SET fingerprint_number = CASE id
  WHEN 'f4172d32-734e-42ff-8db3-c16f99f56ab9' THEN '87'
  WHEN 'd5cacd2e-083b-4165-9dd2-507eef6982a8' THEN '241'
  WHEN '5f99fcdf-704d-42dc-a25d-2b3d348edf5b' THEN '247'
  WHEN '06acdd7a-caeb-4786-a3ab-3228e1349e7f' THEN '85'
  WHEN '2ab94cb7-076f-4f71-b9e6-d3bd3b2e3bcc' THEN '32'
  WHEN 'fbc98cce-c995-450e-9a3f-177cc3f87cb3' THEN '11'
  WHEN '80381437-eec0-43a4-849a-86116be57fae' THEN '98'
  WHEN 'f0a8165c-55e0-4b2c-899f-da0ac6704dd4' THEN '99'
  WHEN '2d438d99-8624-4ea2-9647-46bcb2c2f6f1' THEN '212'
  WHEN 'cdff263b-c425-48b8-83c6-add379c1be63' THEN '193'
  WHEN '7b89c870-2880-441f-8798-5ca6f7f593a1' THEN '245'
  WHEN '8be24fe4-1e9a-47dc-a156-7c8340d5318c' THEN '243'
  WHEN '9f8f9778-d082-4bc1-8903-242a3c7e206c' THEN '163'
  WHEN 'e9d7817c-2d56-4eca-bb0a-39f904f25676' THEN '154'
  WHEN '31fd6c26-e79f-45c8-89b6-16e1dfb0cd20' THEN '102'
  WHEN 'bcea37a1-96d0-4954-b658-15885b59efd8' THEN '103'
  WHEN '7c370cde-310f-4b84-ad44-153f36dadf13' THEN '254'
  WHEN '43c830fc-fb37-4c93-bc90-4efda214f6d4' THEN '215'
  WHEN '5f852c89-47e7-4b90-85db-03d72f5bc20e' THEN '61'
  WHEN 'b6bf05f0-b1da-4700-9eaa-884e7e58e11e' THEN '178'
  WHEN '8a0a89b6-9bf3-478d-97ea-20fcb44e768f' THEN '225'
  WHEN 'f277e635-e652-4ec0-8dc2-a257060b6ede' THEN '232'
  WHEN '6e39b09f-8e46-473d-a2e2-7eea07cdda12' THEN '20'
  WHEN '8792c749-ea8d-47eb-88e2-df683ebb6696' THEN '230'
  WHEN '0b0d737e-3beb-42d9-ae86-4bfd32d56d4f' THEN '26'
  WHEN '919520dc-0165-48c0-a533-67ed9e84d838' THEN '112'
  WHEN '01817717-6019-41bf-9d20-94375183f309' THEN '252'
  WHEN '9e4c984b-59d7-4e9f-8e23-18c7ce82507e' THEN '57'
  WHEN 'd88e0203-b23c-4be0-8217-ddfe0c48da6e' THEN '23'
  WHEN '770eeb1b-86ad-4d48-9cec-f73d42057d0f' THEN '116'
  WHEN '4a872aa4-6932-4c5d-b81d-f48275f9acbb' THEN '248'
  WHEN '9828745a-3aea-4bff-8ddd-8cbd57ca8c3e' THEN '155'
  WHEN 'dff43e96-f191-40df-be06-03363737350c' THEN '34'
  WHEN '75657304-2adb-488d-918b-3fb76416ea69' THEN '119'
  WHEN '8c7c2e19-460a-4a74-b9f0-47aa36efca21' THEN '156'
  WHEN '1bd724b0-403b-4fd0-8d61-a4e6f520a67b' THEN '13'
  WHEN '0501ad2c-d5d7-41db-a56e-521400aacdaa' THEN '191'
  WHEN 'c3b4a830-7b90-442d-8fa7-00c816d6accb' THEN '219'
  WHEN 'b6c1e247-59d6-48ce-a48e-46eb68bbe5cc' THEN '122'
  WHEN 'f9dd5f76-072e-47b4-9bf6-f577c8f25e8a' THEN '127'
  WHEN 'fdbd9349-59fc-4801-9ed0-b27d6bd645ea' THEN '160'
  WHEN '08e04fd2-8378-4fe5-a0ab-3fda0b153ad0' THEN '196'
  WHEN '0224e3cd-d0c0-43f2-81d4-575a7815adc7' THEN '250'
  WHEN '3cdfacf0-6c18-4472-8213-165c6815382a' THEN '249'
  WHEN '3fd310e5-6e64-4c86-bf29-dd78a60904a4' THEN '24'
  WHEN '1900570d-af46-46b6-8120-81a275dbc762' THEN '136'
  WHEN 'd7066b5b-fc95-43d0-a0d9-7c5815939ebc' THEN '253'
  WHEN '6387fa8c-d96c-44d2-8a54-f26ca028125f' THEN '240'
  WHEN 'ed4d1b4a-40bb-4cda-ac72-d4da3dbfac6b' THEN '255'
  WHEN '25dda15e-ef33-44ec-a02f-7fa079666ea3' THEN '29'
  WHEN '27ff4e1e-181f-4136-a5be-a079789754b5' THEN '12'
  WHEN '531701bd-4324-459f-b1ab-3680c18a6f86' THEN '41'
  WHEN '231855a9-5690-493e-b957-3add0c893b00' THEN '73'
  WHEN '31505f66-9ff8-4be2-90b2-27024fb31a20' THEN '143'
  WHEN '5e0fd2c0-1c22-4caf-8ab3-b83b40fd7d44' THEN '9'
  WHEN 'a48880d8-095a-4ed6-a908-73771052dd7e' THEN '194'
  WHEN 'efc46fc5-b7f0-47a4-97d8-6e2755adc3ce' THEN '148'
  WHEN '46cc0108-daf7-4022-887a-00f32410f9d3' THEN '31'
  WHEN 'b5ccac19-bd20-487c-ab88-eb100062ded4' THEN '43'
  WHEN '6be89040-4802-48cb-b784-7e80b6dbdb2f' THEN '244'
  WHEN 'c6e023cf-f4e1-448e-92ce-02ca9f6cefd0' THEN '65'
  WHEN '7e9d351e-9c15-4cdf-bc4b-2b7ba0d844c3' THEN '198'
  WHEN 'd58fa2db-622a-4ea4-b844-0974a87967be' THEN '150'
  WHEN '52d9a0a9-fe5c-451d-95ca-c665e8c29a4a' THEN '91'
  WHEN '0a1a5e2a-feb4-4d0b-97f5-921adb6ae182' THEN '152'
  WHEN '03d277db-a422-4625-aba0-2f0ca041e612' THEN '257'
  WHEN 'e3135944-f740-443b-8744-4fdd07183d4e' THEN '220'
  WHEN '5e07df62-22ed-4c45-ad94-451a944ae482' THEN '238'
  WHEN '707b06c1-6bc4-43f5-8ac5-f45054ba00f8' THEN '45'
END
WHERE id IN (
  'f4172d32-734e-42ff-8db3-c16f99f56ab9', 'd5cacd2e-083b-4165-9dd2-507eef6982a8',
  '5f99fcdf-704d-42dc-a25d-2b3d348edf5b', '06acdd7a-caeb-4786-a3ab-3228e1349e7f',
  '2ab94cb7-076f-4f71-b9e6-d3bd3b2e3bcc', 'fbc98cce-c995-450e-9a3f-177cc3f87cb3',
  '80381437-eec0-43a4-849a-86116be57fae', 'f0a8165c-55e0-4b2c-899f-da0ac6704dd4',
  '2d438d99-8624-4ea2-9647-46bcb2c2f6f1', 'cdff263b-c425-48b8-83c6-add379c1be63',
  '7b89c870-2880-441f-8798-5ca6f7f593a1', '8be24fe4-1e9a-47dc-a156-7c8340d5318c',
  '9f8f9778-d082-4bc1-8903-242a3c7e206c', 'e9d7817c-2d56-4eca-bb0a-39f904f25676',
  '31fd6c26-e79f-45c8-89b6-16e1dfb0cd20', 'bcea37a1-96d0-4954-b658-15885b59efd8',
  '7c370cde-310f-4b84-ad44-153f36dadf13', '43c830fc-fb37-4c93-bc90-4efda214f6d4',
  '5f852c89-47e7-4b90-85db-03d72f5bc20e', 'b6bf05f0-b1da-4700-9eaa-884e7e58e11e',
  '8a0a89b6-9bf3-478d-97ea-20fcb44e768f', 'f277e635-e652-4ec0-8dc2-a257060b6ede',
  '6e39b09f-8e46-473d-a2e2-7eea07cdda12', '8792c749-ea8d-47eb-88e2-df683ebb6696',
  '0b0d737e-3beb-42d9-ae86-4bfd32d56d4f', '919520dc-0165-48c0-a533-67ed9e84d838',
  '01817717-6019-41bf-9d20-94375183f309', '9e4c984b-59d7-4e9f-8e23-18c7ce82507e',
  'd88e0203-b23c-4be0-8217-ddfe0c48da6e', '770eeb1b-86ad-4d48-9cec-f73d42057d0f',
  '4a872aa4-6932-4c5d-b81d-f48275f9acbb', '9828745a-3aea-4bff-8ddd-8cbd57ca8c3e',
  'dff43e96-f191-40df-be06-03363737350c', '75657304-2adb-488d-918b-3fb76416ea69',
  '8c7c2e19-460a-4a74-b9f0-47aa36efca21', '1bd724b0-403b-4fd0-8d61-a4e6f520a67b',
  '0501ad2c-d5d7-41db-a56e-521400aacdaa', 'c3b4a830-7b90-442d-8fa7-00c816d6accb',
  'b6c1e247-59d6-48ce-a48e-46eb68bbe5cc', 'f9dd5f76-072e-47b4-9bf6-f577c8f25e8a',
  'fdbd9349-59fc-4801-9ed0-b27d6bd645ea', '08e04fd2-8378-4fe5-a0ab-3fda0b153ad0',
  '0224e3cd-d0c0-43f2-81d4-575a7815adc7', '3cdfacf0-6c18-4472-8213-165c6815382a',
  '3fd310e5-6e64-4c86-bf29-dd78a60904a4', '1900570d-af46-46b6-8120-81a275dbc762',
  'd7066b5b-fc95-43d0-a0d9-7c5815939ebc', '6387fa8c-d96c-44d2-8a54-f26ca028125f',
  'ed4d1b4a-40bb-4cda-ac72-d4da3dbfac6b', '25dda15e-ef33-44ec-a02f-7fa079666ea3',
  '27ff4e1e-181f-4136-a5be-a079789754b5', '531701bd-4324-459f-b1ab-3680c18a6f86',
  '231855a9-5690-493e-b957-3add0c893b00', '31505f66-9ff8-4be2-90b2-27024fb31a20',
  '5e0fd2c0-1c22-4caf-8ab3-b83b40fd7d44', 'a48880d8-095a-4ed6-a908-73771052dd7e',
  'efc46fc5-b7f0-47a4-97d8-6e2755adc3ce', '46cc0108-daf7-4022-887a-00f32410f9d3',
  'b5ccac19-bd20-487c-ab88-eb100062ded4', '6be89040-4802-48cb-b784-7e80b6dbdb2f',
  'c6e023cf-f4e1-448e-92ce-02ca9f6cefd0', '7e9d351e-9c15-4cdf-bc4b-2b7ba0d844c3',
  'd58fa2db-622a-4ea4-b844-0974a87967be', '52d9a0a9-fe5c-451d-95ca-c665e8c29a4a',
  '0a1a5e2a-feb4-4d0b-97f5-921adb6ae182', '03d277db-a422-4625-aba0-2f0ca041e612',
  'e3135944-f740-443b-8744-4fdd07183d4e', '5e07df62-22ed-4c45-ad94-451a944ae482',
  '707b06c1-6bc4-43f5-8ac5-f45054ba00f8'
);

-- Also clear fingerprint for employees not in the Excel (they weren't in the device)
-- HARINDINTWARI Jean Claude, Innocent Ndindiyaho, KAREKEZI Jean Baptiste, 
-- Nduwayezu Emmanuel, Rukundo Aime Courage, TWAHIRWA Jean Claude
UPDATE employees SET fingerprint_number = NULL WHERE id IN (
  'c7463c02-80e3-42cb-b278-3a60aff0eff8',
  '38e3df1d-2193-4436-9377-733e0ec286ca',
  '05ac5b53-2f42-4783-931a-3dffcf7f608b',
  '9f5a7291-2ee9-4971-aad6-168cee15ba7f',
  '13446873-6214-43df-b6f3-7b233db0153f',
  'f6e35dc7-7b55-4d76-9542-cd69f7a51e52'
);
