CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notif_profile_created
  ON notifications (profile_id, created_at DESC);
