-- Cleanup script for incorrectly awarded Expert badges
-- Run this in Supabase SQL Editor after applying the fixed migration

-- Delete Expert badges from users with less than 100 points
DELETE FROM user_badges
WHERE badge_id = 'expert'
AND user_id IN (
    SELECT id FROM profiles WHERE points < 100
);

-- Verify the cleanup
SELECT 
    ub.user_id,
    p.username,
    p.points,
    ub.earned_at
FROM user_badges ub
JOIN profiles p ON ub.user_id = p.id
WHERE ub.badge_id = 'expert'
ORDER BY p.points DESC;
