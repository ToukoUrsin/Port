-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search trigger for submissions
CREATE OR REPLACE FUNCTION submissions_search_update() RETURNS trigger AS $$
DECLARE
  headings TEXT := '';
  body_text TEXT := '';
BEGIN
  SELECT
    coalesce(string_agg(CASE WHEN b->>'type' = 'heading' THEN b->>'content' END, ' '), ''),
    coalesce(string_agg(CASE WHEN b->>'type' != 'heading' THEN b->>'content' END, ' '), '')
  INTO headings, body_text
  FROM jsonb_array_elements(coalesce(NEW.meta->'blocks', '[]'::jsonb)) AS b
  WHERE b->>'content' IS NOT NULL;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '') || ' ' || headings), 'B') ||
    setweight(to_tsvector('english', body_text), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_submissions_search
  BEFORE INSERT OR UPDATE OF title, description, meta
  ON submissions
  FOR EACH ROW EXECUTE FUNCTION submissions_search_update();

-- Full-text search trigger for profiles
CREATE OR REPLACE FUNCTION profiles_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.profile_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.email, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_search
  BEFORE INSERT OR UPDATE OF profile_name, email
  ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_search_update();

-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON profiles USING GIN (profile_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_submissions_title_trgm ON submissions USING GIN (title gin_trgm_ops);
