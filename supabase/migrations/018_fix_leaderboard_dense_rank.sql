-- ============================================
-- Fix Leaderboard Ranking with ROW_NUMBER
-- ============================================
-- Update ranking functions to use ROW_NUMBER for unique ranking
-- Each user gets a unique rank, sorted by points then username
-- ============================================

-- Update get_user_leaderboard_rank to use DENSE_RANK
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(p_user_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    user_rank BIGINT;
BEGIN
    -- Calculate rank based on dynamic points using ROW_NUMBER
    -- ROW_NUMBER gives unique ranks: 1, 2, 3, 4 (no ties, sorted by username for same points)
    SELECT rank INTO user_rank
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY calculate_user_points(id) DESC, username ASC) as rank
        FROM profiles
        WHERE calculate_user_points(id) > 0  -- Only include users with actual points
    ) ranked
    WHERE id = p_user_id;

    -- If user has 0 points or doesn't exist, return 0
    RETURN COALESCE(user_rank, 0);
END;
$$;

-- Drop the existing function first to allow changing logic
DROP FUNCTION IF EXISTS get_top_contributors(INTEGER);

-- Update get_top_contributors to return rank and use ROW_NUMBER
CREATE OR REPLACE FUNCTION get_top_contributors(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    total_points INTEGER,
    posts_count BIGINT,
    likes_received BIGINT,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            pr.id AS user_id,
            pr.username,
            calculate_user_points(pr.id) AS total_points,
            COUNT(DISTINCT p.id) AS posts_count,
            COUNT(DISTINCT pl.id) AS likes_received,
            ROW_NUMBER() OVER (ORDER BY calculate_user_points(pr.id) DESC, pr.username ASC) AS rank
        FROM public.profiles pr
        LEFT JOIN public.posts p ON pr.id = p.user_id
        LEFT JOIN public.post_likes pl ON p.id = pl.post_id
        GROUP BY pr.id, pr.username
    )
    SELECT 
        ranked_users.user_id,
        ranked_users.username,
        ranked_users.total_points,
        ranked_users.posts_count,
        ranked_users.likes_received,
        ranked_users.rank
    FROM ranked_users
    WHERE ranked_users.total_points > 0  -- Only include users with points
    ORDER BY ranked_users.rank, ranked_users.username  -- Order by rank, then alphabetically for ties
    LIMIT limit_count;  -- Return exactly N users, not all users with rank <= N
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification query - Run this to check results
-- SELECT 
--     p.id,
--     p.username,
--     calculate_user_points(p.id) as points,
--     ROW_NUMBER() OVER (ORDER BY calculate_user_points(p.id) DESC, p.username ASC) as row_number_rank,
--     get_user_leaderboard_rank(p.id) as function_rank
-- FROM profiles p
-- WHERE calculate_user_points(p.id) > 0
-- ORDER BY points DESC
-- LIMIT 20;

-- ============================================
-- Fix get_user_badge_progress if it includes rank column
-- ============================================
-- Drop and recreate if the function exists with rank column

DROP FUNCTION IF EXISTS get_user_badge_progress(UUID);

-- Recreate with BIGINT rank type if it exists
-- This handles the case where a previous migration added rank column
CREATE OR REPLACE FUNCTION get_user_badge_progress(p_user_id UUID)
RETURNS TABLE (
    badge_id TEXT,
    badge_name TEXT,
    badge_description TEXT,
    badge_icon TEXT,
    badge_color TEXT,
    earned BOOLEAN,
    progress INTEGER,
    rank BIGINT,
    target INTEGER,
    earned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bd.id,
        bd.name,
        bd.description,
        bd.icon,
        bd.color,
        ub.id IS NOT NULL as earned,
        CASE bd.criteria_type
            WHEN 'post_count' THEN (
                SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = p_user_id
            )
            WHEN 'total_likes' THEN (
                SELECT COUNT(*)::INTEGER 
                FROM post_likes pl
                JOIN posts p ON pl.post_id = p.id
                WHERE p.user_id = p_user_id
            )
            WHEN 'consecutive_days' THEN (
                SELECT get_consecutive_posting_days(p_user_id)
            )
            WHEN 'investment_count' THEN (
                SELECT COUNT(DISTINCT project_id)::INTEGER FROM project_investments WHERE investor_id = p_user_id
            )
            ELSE 0
        END as progress,
        get_user_leaderboard_rank(p_user_id) as rank,
        bd.criteria_value as target,
        ub.earned_at
    FROM badge_definitions bd
    LEFT JOIN user_badges ub ON ub.badge_id = bd.id AND ub.user_id = p_user_id
    ORDER BY bd.display_order;
END;
$$;
