-- Reset all counts to 0, then recompute from actual published submissions.
-- This correctly propagates counts up the hierarchy.

-- Step 1: zero out all article_counts
UPDATE locations SET article_count = 0;

-- Step 2: set direct counts from published submissions
UPDATE locations l
SET article_count = sub.cnt
FROM (
  SELECT location_id, COUNT(*) AS cnt
  FROM submissions
  WHERE status = 5
  GROUP BY location_id
) sub
WHERE l.id = sub.location_id;

-- Step 3: propagate level 3 (cities) up to level 2 (regions)
UPDATE locations r
SET article_count = r.article_count + sub.total
FROM (
  SELECT c.parent_id, SUM(c.article_count) AS total
  FROM locations c
  WHERE c.level = 3 AND c.parent_id IS NOT NULL
  GROUP BY c.parent_id
) sub
WHERE r.id = sub.parent_id AND r.level = 2;

-- Step 4: propagate level 2 (regions) up to level 1 (countries)
UPDATE locations co
SET article_count = co.article_count + sub.total
FROM (
  SELECT r.parent_id, SUM(r.article_count) AS total
  FROM locations r
  WHERE r.level = 2 AND r.parent_id IS NOT NULL
  GROUP BY r.parent_id
) sub
WHERE co.id = sub.parent_id AND co.level = 1;

-- Step 5: propagate level 1 (countries) up to level 0 (continents)
UPDATE locations cont
SET article_count = cont.article_count + sub.total
FROM (
  SELECT co.parent_id, SUM(co.article_count) AS total
  FROM locations co
  WHERE co.level = 1 AND co.parent_id IS NOT NULL
  GROUP BY co.parent_id
) sub
WHERE cont.id = sub.parent_id AND cont.level = 0;
