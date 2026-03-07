-- Seed Finnish regions and cities (level 2 = region, level 3 = city)
-- Finnish regions under europe/finland (parent: a0...0002)
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Pirkanmaa', 'pirkanmaa', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/pirkanmaa', 'Pirkanmaa region', true, 61.4978, 23.7610),
  ('b1000000-0000-0000-0000-000000000002', 'Varsinais-Suomi', 'varsinais-suomi', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/varsinais-suomi', 'Southwest Finland region', true, 60.4518, 22.2666),
  ('b1000000-0000-0000-0000-000000000003', 'Pohjois-Pohjanmaa', 'pohjois-pohjanmaa', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/pohjois-pohjanmaa', 'North Ostrobothnia region', true, 65.0121, 25.4651),
  ('b1000000-0000-0000-0000-000000000004', 'Keski-Suomi', 'keski-suomi', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/keski-suomi', 'Central Finland region', true, 62.2426, 25.7473),
  ('b1000000-0000-0000-0000-000000000005', 'Paijat-Hame', 'paijat-hame', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/paijat-hame', 'Paijat-Hame region', true, 61.0000, 25.6500),
  ('b1000000-0000-0000-0000-000000000006', 'Pohjois-Savo', 'pohjois-savo', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/pohjois-savo', 'North Savo region', true, 62.8924, 27.6783),
  ('b1000000-0000-0000-0000-000000000007', 'Lappi', 'lappi', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/lappi', 'Lapland region', true, 66.5000, 25.7500)
ON CONFLICT (slug) DO NOTHING;

-- Finnish cities (level 3)
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng) VALUES
  ('b1000000-0000-0000-0000-000000000010', 'Helsinki', 'helsinki', 3, 'a0000000-0000-0000-0000-000000000003', 'europe/finland/uusimaa/helsinki', 'Capital of Finland', true, 60.1699, 24.9384),
  ('b1000000-0000-0000-0000-000000000011', 'Espoo', 'espoo', 3, 'a0000000-0000-0000-0000-000000000003', 'europe/finland/uusimaa/espoo', 'City of Espoo', true, 60.2055, 24.6559),
  ('b1000000-0000-0000-0000-000000000012', 'Vantaa', 'vantaa', 3, 'a0000000-0000-0000-0000-000000000003', 'europe/finland/uusimaa/vantaa', 'City of Vantaa', true, 60.2934, 25.0378),
  ('b1000000-0000-0000-0000-000000000013', 'Tampere', 'tampere', 3, 'b1000000-0000-0000-0000-000000000001', 'europe/finland/pirkanmaa/tampere', 'City of Tampere', true, 61.4978, 23.7610),
  ('b1000000-0000-0000-0000-000000000014', 'Turku', 'turku', 3, 'b1000000-0000-0000-0000-000000000002', 'europe/finland/varsinais-suomi/turku', 'City of Turku', true, 60.4518, 22.2666),
  ('b1000000-0000-0000-0000-000000000015', 'Oulu', 'oulu', 3, 'b1000000-0000-0000-0000-000000000003', 'europe/finland/pohjois-pohjanmaa/oulu', 'City of Oulu', true, 65.0121, 25.4651),
  ('b1000000-0000-0000-0000-000000000016', 'Jyvaskyla', 'jyvaskyla', 3, 'b1000000-0000-0000-0000-000000000004', 'europe/finland/keski-suomi/jyvaskyla', 'City of Jyvaskyla', true, 62.2426, 25.7473),
  ('b1000000-0000-0000-0000-000000000017', 'Lahti', 'lahti', 3, 'b1000000-0000-0000-0000-000000000005', 'europe/finland/paijat-hame/lahti', 'City of Lahti', true, 60.9827, 25.6612),
  ('b1000000-0000-0000-0000-000000000018', 'Kuopio', 'kuopio', 3, 'b1000000-0000-0000-0000-000000000006', 'europe/finland/pohjois-savo/kuopio', 'City of Kuopio', true, 62.8924, 27.6783),
  ('b1000000-0000-0000-0000-000000000019', 'Rovaniemi', 'rovaniemi', 3, 'b1000000-0000-0000-0000-000000000007', 'europe/finland/lappi/rovaniemi', 'City of Rovaniemi', true, 66.5039, 25.7294)
ON CONFLICT (slug) DO NOTHING;

-- US locations hierarchy
-- North America (level 0)
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'North America', 'north-america', 0, NULL, 'north-america', 'North American continent', true, 39.8283, -98.5795)
ON CONFLICT (slug) DO NOTHING;

-- United States (level 1)
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng) VALUES
  ('b2000000-0000-0000-0000-000000000002', 'United States', 'united-states', 1, 'b2000000-0000-0000-0000-000000000001', 'north-america/united-states', 'United States of America', true, 39.8283, -98.5795)
ON CONFLICT (slug) DO NOTHING;

-- US states (level 2)
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng) VALUES
  ('b2000000-0000-0000-0000-000000000010', 'Indiana', 'indiana', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/indiana', 'State of Indiana', true, 40.2672, -86.1349),
  ('b2000000-0000-0000-0000-000000000011', 'New Hampshire', 'new-hampshire', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/new-hampshire', 'State of New Hampshire', true, 43.1939, -71.5724),
  ('b2000000-0000-0000-0000-000000000012', 'Mississippi', 'mississippi', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/mississippi', 'State of Mississippi', true, 32.3547, -89.3985),
  ('b2000000-0000-0000-0000-000000000013', 'Tennessee', 'tennessee', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/tennessee', 'State of Tennessee', true, 35.5175, -86.5804),
  ('b2000000-0000-0000-0000-000000000014', 'Kentucky', 'kentucky', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/kentucky', 'State of Kentucky', true, 37.8393, -84.2700),
  ('b2000000-0000-0000-0000-000000000015', 'Georgia', 'georgia-us', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/georgia', 'State of Georgia', true, 32.1656, -82.9001),
  ('b2000000-0000-0000-0000-000000000016', 'Delaware', 'delaware', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/delaware', 'State of Delaware', true, 38.9108, -75.5277),
  ('b2000000-0000-0000-0000-000000000017', 'Montana', 'montana', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/montana', 'State of Montana', true, 46.8797, -110.3626),
  ('b2000000-0000-0000-0000-000000000018', 'North Carolina', 'north-carolina', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/north-carolina', 'State of North Carolina', true, 35.7596, -79.0193),
  ('b2000000-0000-0000-0000-000000000019', 'Virginia', 'virginia', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/virginia', 'State of Virginia', true, 37.4316, -78.6569),
  ('b2000000-0000-0000-0000-000000000020', 'Florida', 'florida', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/florida', 'State of Florida', true, 27.6648, -81.5158),
  ('b2000000-0000-0000-0000-000000000021', 'West Virginia', 'west-virginia', 2, 'b2000000-0000-0000-0000-000000000002', 'north-america/united-states/west-virginia', 'State of West Virginia', true, 38.5976, -80.4549)
ON CONFLICT (slug) DO NOTHING;

-- US cities (level 3)
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng) VALUES
  ('b2000000-0000-0000-0000-000000000030', 'Chesterton', 'chesterton', 3, 'b2000000-0000-0000-0000-000000000010', 'north-america/united-states/indiana/chesterton', 'Town of Chesterton, Indiana', true, 41.6106, -87.0642),
  ('b2000000-0000-0000-0000-000000000031', 'Claremont', 'claremont', 3, 'b2000000-0000-0000-0000-000000000011', 'north-america/united-states/new-hampshire/claremont', 'City of Claremont, New Hampshire', true, 43.3767, -72.3468),
  ('b2000000-0000-0000-0000-000000000032', 'Laurel', 'laurel', 3, 'b2000000-0000-0000-0000-000000000012', 'north-america/united-states/mississippi/laurel', 'City of Laurel, Mississippi', true, 31.6941, -89.1306),
  ('b2000000-0000-0000-0000-000000000033', 'Spencer', 'spencer', 3, 'b2000000-0000-0000-0000-000000000013', 'north-america/united-states/tennessee/spencer', 'Town of Spencer, Tennessee', true, 35.7481, -85.4669),
  ('b2000000-0000-0000-0000-000000000034', 'Harlan', 'harlan', 3, 'b2000000-0000-0000-0000-000000000014', 'north-america/united-states/kentucky/harlan', 'City of Harlan, Kentucky', true, 36.8431, -83.3219),
  ('b2000000-0000-0000-0000-000000000035', 'Jonesboro', 'jonesboro', 3, 'b2000000-0000-0000-0000-000000000015', 'north-america/united-states/georgia/jonesboro', 'City of Jonesboro, Georgia', true, 33.5218, -84.3538),
  ('b2000000-0000-0000-0000-000000000036', 'Georgetown', 'georgetown-de', 3, 'b2000000-0000-0000-0000-000000000016', 'north-america/united-states/delaware/georgetown', 'Town of Georgetown, Delaware', true, 38.6901, -75.3857),
  ('b2000000-0000-0000-0000-000000000037', 'Glendive', 'glendive', 3, 'b2000000-0000-0000-0000-000000000017', 'north-america/united-states/montana/glendive', 'City of Glendive, Montana', true, 47.1053, -104.7125),
  ('b2000000-0000-0000-0000-000000000038', 'Marion', 'marion-nc', 3, 'b2000000-0000-0000-0000-000000000018', 'north-america/united-states/north-carolina/marion', 'City of Marion, North Carolina', true, 35.6840, -82.0093),
  ('b2000000-0000-0000-0000-000000000039', 'Chesterfield', 'chesterfield', 3, 'b2000000-0000-0000-0000-000000000019', 'north-america/united-states/virginia/chesterfield', 'Chesterfield County, Virginia', true, 37.3774, -77.5058),
  ('b2000000-0000-0000-0000-000000000040', 'Madison', 'madison-fl', 3, 'b2000000-0000-0000-0000-000000000020', 'north-america/united-states/florida/madison', 'City of Madison, Florida', true, 30.4694, -83.4130),
  ('b2000000-0000-0000-0000-000000000041', 'Linden', 'linden-tn', 3, 'b2000000-0000-0000-0000-000000000013', 'north-america/united-states/tennessee/linden', 'City of Linden, Tennessee', true, 35.6175, -87.8395),
  ('b2000000-0000-0000-0000-000000000042', 'Hamlin', 'hamlin', 3, 'b2000000-0000-0000-0000-000000000021', 'north-america/united-states/west-virginia/hamlin', 'Town of Hamlin, West Virginia', true, 38.2787, -82.1026)
ON CONFLICT (slug) DO NOTHING;
