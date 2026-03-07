-- Seed data for development — Kirkkonummi demo

-- Locations hierarchy: Europe > Finland > Uusimaa > Kirkkonummi + neighborhoods
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Europe', 'europe', 0, NULL, 'europe', 'European continent', true, 54.526, 15.2551),
  ('a0000000-0000-0000-0000-000000000002', 'Finland', 'finland', 1, 'a0000000-0000-0000-0000-000000000001', 'europe/finland', 'Republic of Finland', true, 61.9241, 25.7482),
  ('a0000000-0000-0000-0000-000000000003', 'Uusimaa', 'uusimaa', 2, 'a0000000-0000-0000-0000-000000000002', 'europe/finland/uusimaa', 'Uusimaa region', true, 60.25, 24.93),
  ('a0000000-0000-0000-0000-000000000004', 'Kirkkonummi', 'kirkkonummi', 3, 'a0000000-0000-0000-0000-000000000003', 'europe/finland/uusimaa/kirkkonummi', 'Municipality of Kirkkonummi / Kyrkslätt', true, 60.1233, 24.4397),
  ('a0000000-0000-0000-0000-000000000005', 'Masala', 'masala', 4, 'a0000000-0000-0000-0000-000000000004', 'europe/finland/uusimaa/kirkkonummi/masala', 'Masala district, Kirkkonummi', true, 60.1508, 24.5141),
  ('a0000000-0000-0000-0000-000000000006', 'Veikkola', 'veikkola', 4, 'a0000000-0000-0000-0000-000000000004', 'europe/finland/uusimaa/kirkkonummi/veikkola', 'Veikkola village, Kirkkonummi', true, 60.2500, 24.4500)
ON CONFLICT (id) DO NOTHING;

-- Test accounts (password: "editor123")
-- bcrypt hash for "editor123" with default cost
INSERT INTO profiles (id, profile_name, email, password_hash, role, permissions, location_id, public)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Maria Virtanen', 'maria@localnews.dev',
   decode('2432612431302471544464522e2e642f6834593272306e6b4c4d795a2e554d547a486d6a684e704d66706e43516d5a475472523678424563324e5157', 'hex'),
   1, 7, 'a0000000-0000-0000-0000-000000000004', true),
  ('b0000000-0000-0000-0000-000000000002', 'Antti Korhonen', 'antti@localnews.dev',
   decode('2432612431302471544464522e2e642f6834593272306e6b4c4d795a2e554d547a486d6a684e704d66706e43516d5a475472523678424563324e5157', 'hex'),
   0, 1, 'a0000000-0000-0000-0000-000000000005', true),
  ('b0000000-0000-0000-0000-000000000003', 'Lena Sjöberg', 'lena@localnews.dev',
   decode('2432612431302471544464522e2e642f6834593272306e6b4c4d795a2e554d547a486d6a684e704d66706e43516d5a475472523678424563324e5157', 'hex'),
   0, 1, 'a0000000-0000-0000-0000-000000000004', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- No placeholder articles — seed via admin batch API instead
