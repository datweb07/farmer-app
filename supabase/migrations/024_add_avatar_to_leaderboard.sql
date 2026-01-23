-- ============================================
-- Add Avatar Support to Top Contributors
-- ============================================
-- Update get_top_contributors function to include avatar_url
-- ============================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_top_contributors(INTEGER);

-- Create updated function with avatar_url
CREATE OR REPLACE FUNCTION get_top_contributors(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
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
            pr.avatar_url,
            calculate_user_points(pr.id) AS total_points,
            COUNT(DISTINCT p.id) AS posts_count,
            COUNT(DISTINCT pl.id) AS likes_received,
            ROW_NUMBER() OVER (ORDER BY calculate_user_points(pr.id) DESC, pr.username ASC) AS rank
        FROM public.profiles pr
        LEFT JOIN public.posts p ON pr.id = p.user_id
        LEFT JOIN public.post_likes pl ON p.id = pl.post_id
        GROUP BY pr.id, pr.username, pr.avatar_url
    )
    SELECT 
        ranked_users.user_id,
        ranked_users.username,
        ranked_users.avatar_url,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_contributors(INTEGER) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_top_contributors IS 'Get top contributors with avatar_url for leaderboard display';
