-- Seed data for development

-- Locations hierarchy: Europe > Finland > Gavleborg > Gavle
INSERT INTO locations (id, name, slug, level, parent_id, path, description, is_active, lat, lng)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Europe', 'europe', 0, NULL, 'europe', 'European continent', true, 54.526, 15.2551),
  ('a0000000-0000-0000-0000-000000000002', 'Finland', 'finland', 1, 'a0000000-0000-0000-0000-000000000001', 'europe/finland', 'Republic of Finland', true, 61.9241, 25.7482),
  ('a0000000-0000-0000-0000-000000000003', 'Sweden', 'sweden', 1, 'a0000000-0000-0000-0000-000000000001', 'europe/sweden', 'Kingdom of Sweden', true, 60.1282, 18.6435),
  ('a0000000-0000-0000-0000-000000000004', 'Gavleborg', 'gavleborg', 2, 'a0000000-0000-0000-0000-000000000003', 'europe/sweden/gavleborg', 'Gavleborg County', true, 60.6749, 17.1413),
  ('a0000000-0000-0000-0000-000000000005', 'Gavle', 'gavle', 3, 'a0000000-0000-0000-0000-000000000004', 'europe/sweden/gavleborg/gavle', 'City of Gavle', true, 60.6749, 17.1413)
ON CONFLICT (slug) DO NOTHING;

-- Test editor account (password: "editor123")
-- bcrypt hash for "editor123" with default cost
INSERT INTO profiles (id, profile_name, email, password_hash, role, permissions, location_id, public)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'test-editor',
  'editor@localnews.dev',
  decode('2432612431302471544464522e2e642f6834593272306e6b4c4d795a2e554d547a486d6a684e704d66706e43516d5a475472523678424563324e5157', 'hex'),
  1,
  7,
  'a0000000-0000-0000-0000-000000000005',
  true
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Sample published article
INSERT INTO submissions (id, owner_id, location_id, title, description, status, meta)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000005',
  'City Council Approves New Library Expansion',
  'The Gavle city council voted unanimously to approve the expansion of the central library.',
  5,
  '{"blocks":[{"type":"heading","content":"City Council Approves New Library Expansion","level":1},{"type":"text","content":"The Gavle city council voted unanimously Tuesday evening to approve a 2.5 million kronor expansion of the central library. The project, which has been in planning for over three years, will add a new children''s wing and a digital media center.\n\nCouncil member Erik Lindqvist, who championed the project, called it \"a landmark investment in our community''s future.\" The expansion is expected to break ground in May and be completed by the end of next year.\n\nLocal residents have expressed overwhelming support for the project, with over 500 signatures collected in a petition last spring."},{"type":"quote","content":"This library has been the heart of our community for decades. It''s time we give it the space it deserves.","author":"Erik Lindqvist, Council Member"}],"summary":"Gavle city council unanimously approves 2.5M SEK library expansion featuring children''s wing and digital media center.","category":"council","review":{"score":88,"flags":[],"approved":true},"published_at":"2026-03-01T10:00:00Z"}'
)
ON CONFLICT (id) DO NOTHING;
