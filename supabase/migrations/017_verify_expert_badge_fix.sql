-- ============================================
-- Expert Badge Verification Queries
-- ============================================
-- Run these queries after applying the fix migration
-- to verify everything is working correctly
-- ============================================

-- Query 1: Check Top 20 Users with Their Points and Expert Badge Status
-- This shows who should have the Expert badge
SELECT 
    p.id,
    p.username,
    p.points as static_points,
    calculate_user_points(p.id) as calculated_points,
    RANK() OVER (ORDER BY calculate_user_points(p.id) DESC) as rank,
    EXISTS(
        SELECT 1 FROM user_badges 
        WHERE user_id = p.id AND badge_id = 'expert'
    ) as has_expert_badge,
    (SELECT COUNT(*) FROM posts WHERE user_id = p.id) as post_count,
    (SELECT COUNT(*) FROM post_likes pl 
     JOIN posts po ON pl.post_id = po.id 
     WHERE po.user_id = p.id) as total_likes
FROM profiles p
WHERE calculate_user_points(p.id) > 0
ORDER BY calculated_points DESC
LIMIT 20;

-- Expected Result:
-- Only users in rank 1-10 with >= 100 calculated_points should have has_expert_badge = TRUE


-- Query 2: Find Any Incorrectly Awarded Expert Badges
-- This should return 0 rows after the fix
SELECT 
    ub.user_id,
    p.username,
    calculate_user_points(ub.user_id) as points,
    get_user_leaderboard_rank(ub.user_id) as rank,
    ub.earned_at
FROM user_badges ub
JOIN profiles p ON ub.user_id = p.id
WHERE ub.badge_id = 'expert'
AND (
    calculate_user_points(ub.user_id) < 100  -- Less than minimum points
    OR get_user_leaderboard_rank(ub.user_id) > 10  -- Not in top 10
)
ORDER BY calculate_user_points(ub.user_id) DESC;

-- Expected Result: 0 rows (no incorrect badges)


-- Query 3: Users Who Should Have Expert Badge But Don't
-- This helps identify if anyone was missed
SELECT 
    p.id,
    p.username,
    calculate_user_points(p.id) as points,
    RANK() OVER (ORDER BY calculate_user_points(p.id) DESC) as rank
FROM profiles p
WHERE calculate_user_points(p.id) >= 100
AND NOT EXISTS(
    SELECT 1 FROM user_badges 
    WHERE user_id = p.id AND badge_id = 'expert'
)
AND (
    SELECT RANK() OVER (ORDER BY calculate_user_points(id) DESC)
    FROM profiles
    WHERE id = p.id
) <= 10;

-- Expected Result: 0 rows (everyone who qualifies has the badge)


-- Query 4: Expert Badge Count Summary
SELECT 
    COUNT(*) as total_expert_badges,
    COUNT(DISTINCT user_id) as unique_users_with_expert,
    MIN(earned_at) as first_awarded,
    MAX(earned_at) as last_awarded
FROM user_badges
WHERE badge_id = 'expert';

-- Expected Result: Should be <= 10 total badges


-- Query 5: Detailed Badge Progress for Specific User
-- Replace 'USER_ID_HERE' with actual user ID to test
-- SELECT * FROM get_user_badge_progress('USER_ID_HERE');


-- Query 6: Test Dynamic Points Calculation vs Static
-- This shows the difference between old (static) and new (dynamic) points
SELECT 
    p.username,
    p.points as old_static_points,
    calculate_user_points(p.id) as new_dynamic_points,
    calculate_user_points(p.id) - p.points as difference,
    (SELECT COUNT(*) FROM posts WHERE user_id = p.id) as post_count
FROM profiles p
ORDER BY calculate_user_points(p.id) DESC
LIMIT 10;

-- Expected Result: Dynamic points should be higher for active users


-- Query 7: Check for Users with 0 Points Having Any Badges
SELECT 
    p.username,
    calculate_user_points(p.id) as points,
    ARRAY_AGG(ub.badge_id) as badges
FROM profiles p
LEFT JOIN user_badges ub ON p.id = ub.user_id
WHERE calculate_user_points(p.id) = 0
AND EXISTS(SELECT 1 FROM user_badges WHERE user_id = p.id)
GROUP BY p.id, p.username;

-- Expected Result: Should only show first_post badge at most, never expert


-- Query 8: Leaderboard with Expert Badge Status
-- This mimics what users see in the app
SELECT 
    ROW_NUMBER() OVER (ORDER BY calculate_user_points(p.id) DESC) as display_rank,
    p.username,
    calculate_user_points(p.id) as points,
    (SELECT COUNT(*) FROM posts WHERE user_id = p.id) as posts,
    EXISTS(
        SELECT 1 FROM user_badges 
        WHERE user_id = p.id AND badge_id = 'expert'
    ) as has_expert_badge,
    '👑' as expert_icon_if_has_badge
FROM profiles p
WHERE calculate_user_points(p.id) > 0
ORDER BY points DESC
LIMIT 15;

-- Expected Result: Only ranks 1-10 with >= 100 points show expert badge

