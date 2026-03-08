-- Indexes for historical stats tables

CREATE INDEX IF NOT EXISTS idx_stats_hourlies_hour_desc
    ON stats_hourlies (hour DESC);

CREATE INDEX IF NOT EXISTS idx_stats_daily_paths_date_desc
    ON stats_daily_paths (date DESC);

CREATE INDEX IF NOT EXISTS idx_stats_daily_paths_path_date
    ON stats_daily_paths (path, date DESC);
