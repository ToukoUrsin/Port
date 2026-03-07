-- Backfill regions (level 2) from their child cities (level 3)
UPDATE locations r
SET lat = sub.avg_lat, lng = sub.avg_lng
FROM (
  SELECT c.parent_id, AVG(c.lat) AS avg_lat, AVG(c.lng) AS avg_lng
  FROM locations c
  WHERE c.level = 3 AND c.lat IS NOT NULL AND c.lng IS NOT NULL AND c.is_active = true
  GROUP BY c.parent_id
) sub
WHERE r.id = sub.parent_id
  AND r.level = 2
  AND r.lat IS NULL;

-- Backfill countries (level 1) from their child regions (now with coords)
UPDATE locations co
SET lat = sub.avg_lat, lng = sub.avg_lng
FROM (
  SELECT r.parent_id, AVG(r.lat) AS avg_lat, AVG(r.lng) AS avg_lng
  FROM locations r
  WHERE r.level = 2 AND r.lat IS NOT NULL AND r.lng IS NOT NULL AND r.is_active = true
  GROUP BY r.parent_id
) sub
WHERE co.id = sub.parent_id
  AND co.level = 1
  AND co.lat IS NULL;
