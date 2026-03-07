CREATE INDEX IF NOT EXISTS idx_submissions_search_vector ON submissions USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING GIN (search_vector);
