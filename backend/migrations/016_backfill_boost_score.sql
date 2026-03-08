UPDATE submissions SET boost_score = 0.3
WHERE owner_id IN (SELECT id FROM profiles WHERE profile_name = 'LocalNews')
  AND created_at < '2026-03-08'
  AND COALESCE(meta->>'featured_img', '') != ''
  AND COALESCE(meta->>'featured_img', '') NOT LIKE '%picsum%';
