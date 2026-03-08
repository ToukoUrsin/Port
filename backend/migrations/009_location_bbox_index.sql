CREATE INDEX IF NOT EXISTS idx_locations_level_lat_lng
  ON locations (level, lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND is_active = true;
