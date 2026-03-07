CREATE INDEX IF NOT EXISTS idx_locations_path ON locations USING btree (path);
CREATE INDEX IF NOT EXISTS idx_locations_path_text_pattern ON locations USING btree (path text_pattern_ops);
