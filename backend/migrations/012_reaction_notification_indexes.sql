-- Optimize reaction and notification indexes
-- Replaces single-column indexes with composites; adds notification dedup unique constraint

-- 1. Reactions: drop old single-column indexes (covered by idx_reactions_unique), add composite target index
DROP INDEX IF EXISTS idx_reactions_profile_id;
DROP INDEX IF EXISTS idx_reactions_target_id;
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_id, target_type);

-- 2. Notifications: drop old single-column indexes
DROP INDEX IF EXISTS idx_notif_profile;
DROP INDEX IF EXISTS idx_notif_unread;

-- Composite index for listing + unread count queries
CREATE INDEX IF NOT EXISTS idx_notif_profile_read ON notifications (profile_id, read);

-- Deduplicate existing notification rows before adding unique constraint.
-- Keep the most recent row per (profile_id, actor_id, type, target_id, target_type).
DELETE FROM notifications n
USING notifications n2
WHERE n.profile_id = n2.profile_id
  AND n.actor_id = n2.actor_id
  AND n.type = n2.type
  AND n.target_id = n2.target_id
  AND n.target_type = n2.target_type
  AND n.created_at < n2.created_at;

-- Unique constraint for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_dedup
  ON notifications (profile_id, actor_id, type, target_id, target_type);
