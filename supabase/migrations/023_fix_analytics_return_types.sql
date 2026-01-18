-- ============================================
-- FIX ANALYTICS RETURN TYPES
-- Change from RETURNS JSON to RETURNS TABLE for better Supabase client compatibility
-- ============================================

-- Fix: Get user engagement metrics
DROP FUNCTION IF EXISTS get_user_engagement_metrics(INTEGER);
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    active_users BIGINT,
    posts BIGINT,
    comments BIGINT,
    likes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - days_back,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE as date
    )
    SELECT 
        ds.date,
        COALESCE(COUNT(DISTINCT p.id), 0) as active_users,
        COALESCE(COUNT(DISTINCT po.id), 0) as posts,
        COALESCE(COUNT(DISTINCT pc.id), 0) as comments,
        COALESCE(COUNT(DISTINCT pl.id), 0) as likes
    FROM date_series ds
    LEFT JOIN profiles p ON DATE(p.created_at) <= ds.date 
        AND p.id IN (
            SELECT DISTINCT user_id FROM posts WHERE DATE(created_at) = ds.date
            UNION
            SELECT DISTINCT user_id FROM post_comments WHERE DATE(created_at) = ds.date
        )
    LEFT JOIN posts po ON DATE(po.created_at) = ds.date
    LEFT JOIN post_comments pc ON DATE(pc.created_at) = ds.date
    LEFT JOIN post_likes pl ON DATE(pl.created_at) = ds.date
    GROUP BY ds.date
    ORDER BY ds.date;
END;
$$;

-- Fix: Get top contributors
DROP FUNCTION IF EXISTS get_top_contributors_analytics(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_top_contributors_analytics(
    limit_count INTEGER DEFAULT 10,
    period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    total_posts BIGINT,
    total_comments BIGINT,
    total_likes_received BIGINT,
    points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        p.avatar_url,
        COALESCE(post_counts.count, 0) as total_posts,
        COALESCE(comment_counts.count, 0) as total_comments,
        COALESCE(like_counts.count, 0) as total_likes_received,
        COALESCE(calculate_user_points(p.id), 0) as points
    FROM profiles p
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count 
        FROM posts 
        WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
        GROUP BY user_id
    ) post_counts ON p.id = post_counts.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count 
        FROM post_comments 
        WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
        GROUP BY user_id
    ) comment_counts ON p.id = comment_counts.user_id
    LEFT JOIN (
        SELECT po.user_id, COUNT(*) as count 
        FROM post_likes pl
        JOIN posts po ON pl.post_id = po.id
        WHERE pl.created_at >= NOW() - (period_days || ' days')::INTERVAL
        GROUP BY po.user_id
    ) like_counts ON p.id = like_counts.user_id
    WHERE post_counts.count > 0 OR comment_counts.count > 0
    ORDER BY COALESCE(calculate_user_points(p.id), 0) DESC
    LIMIT limit_count;
END;
$$;

-- Fix: Get user growth metrics
DROP FUNCTION IF EXISTS get_user_growth_metrics(INTEGER);
CREATE OR REPLACE FUNCTION get_user_growth_metrics(
    days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
    date DATE,
    total_users BIGINT,
    new_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - days_back,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE as date
    ),
    cumulative_users AS (
        SELECT 
            ds.date,
            COUNT(p.id) as total_users
        FROM date_series ds
        LEFT JOIN profiles p ON DATE(p.created_at) <= ds.date
        GROUP BY ds.date
    ),
    daily_new_users AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_users
        FROM profiles
        WHERE created_at >= CURRENT_DATE - days_back
        GROUP BY DATE(created_at)
    )
    SELECT 
        cu.date,
        cu.total_users,
        COALESCE(dnu.new_users, 0) as new_users
    FROM cumulative_users cu
    LEFT JOIN daily_new_users dnu ON cu.date = dnu.date
    ORDER BY cu.date;
END;
$$;

-- Fix: Get project analytics
DROP FUNCTION IF EXISTS get_project_analytics(UUID);
CREATE OR REPLACE FUNCTION get_project_analytics(
    project_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    project_id UUID,
    project_name TEXT,
    category TEXT,
    location TEXT,
    total_raised NUMERIC,
    funding_goal NUMERIC,
    funding_progress NUMERIC,
    investor_count BIGINT,
    avg_investment NUMERIC,
    roi_percentage NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ip.id as project_id,
        ip.title as project_name,
        ip.category,
        ip.location,
        COALESCE(inv_stats.total_raised, 0) as total_raised,
        ip.funding_goal,
        CASE 
            WHEN ip.funding_goal > 0 THEN (COALESCE(inv_stats.total_raised, 0) / ip.funding_goal * 100)
            ELSE 0 
        END as funding_progress,
        COALESCE(inv_stats.investor_count, 0) as investor_count,
        CASE 
            WHEN inv_stats.investor_count > 0 THEN inv_stats.total_raised / inv_stats.investor_count
            ELSE 0 
        END as avg_investment,
        ip.expected_return as roi_percentage,
        ip.status,
        ip.created_at
    FROM investment_projects ip
    LEFT JOIN (
        SELECT 
            project_id,
            SUM(amount) as total_raised,
            COUNT(DISTINCT investor_id) as investor_count
        FROM investments
        GROUP BY project_id
    ) inv_stats ON ip.id = inv_stats.project_id
    WHERE project_id_param IS NULL OR ip.id = project_id_param
    ORDER BY total_raised DESC;
END;
$$;

-- Fix: Get investment trends
DROP FUNCTION IF EXISTS get_investment_trends(INTEGER);
CREATE OR REPLACE FUNCTION get_investment_trends(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    investment_count BIGINT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - days_back,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE as date
    )
    SELECT 
        ds.date,
        COALESCE(COUNT(i.id), 0) as investment_count,
        COALESCE(SUM(i.amount), 0) as total_amount
    FROM date_series ds
    LEFT JOIN investments i ON DATE(i.invested_at) = ds.date
    GROUP BY ds.date
    ORDER BY ds.date;
END;
$$;

-- Fix: Get project categories performance
DROP FUNCTION IF EXISTS get_project_categories_performance();
CREATE OR REPLACE FUNCTION get_project_categories_performance()
RETURNS TABLE (
    category TEXT,
    total_projects BIGINT,
    total_funding NUMERIC,
    avg_funding NUMERIC,
    success_rate NUMERIC,
    avg_roi NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ip.category,
        COUNT(ip.id) as total_projects,
        COALESCE(SUM(inv_stats.total_raised), 0) as total_funding,
        COALESCE(AVG(inv_stats.total_raised), 0) as avg_funding,
        ROUND(
            COUNT(CASE WHEN inv_stats.total_raised >= ip.funding_goal THEN 1 END)::NUMERIC / 
            NULLIF(COUNT(ip.id), 0) * 100,
            2
        ) as success_rate,
        COALESCE(AVG(ip.expected_return), 0) as avg_roi
    FROM investment_projects ip
    LEFT JOIN (
        SELECT 
            project_id,
            SUM(amount) as total_raised
        FROM investments
        GROUP BY project_id
    ) inv_stats ON ip.id = inv_stats.project_id
    GROUP BY ip.category
    ORDER BY total_funding DESC;
END;
$$;

-- Fix: Get platform statistics
DROP FUNCTION IF EXISTS get_platform_statistics();
CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS TABLE (
    total_users BIGINT,
    active_users_today BIGINT,
    active_users_week BIGINT,
    active_users_month BIGINT,
    total_posts BIGINT,
    total_products BIGINT,
    total_projects BIGINT,
    total_comments BIGINT,
    total_likes BIGINT,
    total_investments BIGINT,
    avg_engagement_rate NUMERIC,
    user_growth_rate_month NUMERIC,
    content_growth_rate_month NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    users_last_month BIGINT;
    content_last_month BIGINT;
BEGIN
    -- Get user count from last month
    SELECT COUNT(*) INTO users_last_month
    FROM profiles
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    
    -- Get content count from last month
    SELECT COUNT(*) INTO content_last_month
    FROM posts
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM profiles) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM (
            SELECT user_id FROM posts WHERE DATE(created_at) = CURRENT_DATE
            UNION
            SELECT user_id FROM post_comments WHERE DATE(created_at) = CURRENT_DATE
        ) active_today) as active_users_today,
        (SELECT COUNT(DISTINCT user_id) FROM (
            SELECT user_id FROM posts WHERE created_at >= CURRENT_DATE - 7
            UNION
            SELECT user_id FROM post_comments WHERE created_at >= CURRENT_DATE - 7
        ) active_week) as active_users_week,
        (SELECT COUNT(DISTINCT user_id) FROM (
            SELECT user_id FROM posts WHERE created_at >= CURRENT_DATE - 30
            UNION
            SELECT user_id FROM post_comments WHERE created_at >= CURRENT_DATE - 30
        ) active_month) as active_users_month,
        (SELECT COUNT(*) FROM posts) as total_posts,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM investment_projects) as total_projects,
        (SELECT COUNT(*) FROM post_comments) as total_comments,
        (SELECT COUNT(*) FROM post_likes) as total_likes,
        (SELECT COUNT(*) FROM investments) as total_investments,
        ROUND(
            ((SELECT COUNT(*) FROM post_comments WHERE created_at >= CURRENT_DATE - 30)::NUMERIC + 
             (SELECT COUNT(*) FROM post_likes WHERE created_at >= CURRENT_DATE - 30)::NUMERIC) /
            NULLIF((SELECT COUNT(*) FROM posts WHERE created_at >= CURRENT_DATE - 30), 0) * 100,
            2
        ) as avg_engagement_rate,
        CASE 
            WHEN users_last_month > 0 THEN
                ROUND((((SELECT COUNT(*) FROM profiles)::NUMERIC - users_last_month) / users_last_month * 100), 2)
            ELSE 0
        END as user_growth_rate_month,
        CASE 
            WHEN content_last_month > 0 THEN
                ROUND((((SELECT COUNT(*) FROM posts)::NUMERIC - content_last_month) / content_last_month * 100), 2)
            ELSE 0
        END as content_growth_rate_month;
END;
$$;

-- Fix: Get content statistics by category
DROP FUNCTION IF EXISTS get_content_statistics_by_category();
CREATE OR REPLACE FUNCTION get_content_statistics_by_category()
RETURNS TABLE (
    posts JSONB,
    products JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'category', category,
                    'total', count,
                    'avg_views', avg_views
                )
            )
            FROM (
                SELECT 
                    category,
                    COUNT(*) as count,
                    COALESCE(AVG(views), 0) as avg_views
                FROM posts
                GROUP BY category
                ORDER BY count DESC
            ) post_stats
        ) as posts,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'category', category,
                    'total', count,
                    'avg_price', avg_price
                )
            )
            FROM (
                SELECT 
                    category,
                    COUNT(*) as count,
                    COALESCE(AVG(price), 0) as avg_price
                FROM products
                GROUP BY category
                ORDER BY count DESC
            ) product_stats
        ) as products;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_contributors_analytics(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_growth_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_investment_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_categories_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_statistics_by_category() TO authenticated;

COMMENT ON FUNCTION get_user_engagement_metrics IS 'Get daily user engagement metrics (active users, posts, comments, likes) - Fixed to return TABLE';
COMMENT ON FUNCTION get_top_contributors_analytics IS 'Get top contributors with their activity stats - Fixed to return TABLE';
COMMENT ON FUNCTION get_user_growth_metrics IS 'Get user growth over time - Fixed to return TABLE';
COMMENT ON FUNCTION get_project_analytics IS 'Get project performance metrics - Fixed to return TABLE';
COMMENT ON FUNCTION get_investment_trends IS 'Get investment trends over time - Fixed to return TABLE';
COMMENT ON FUNCTION get_project_categories_performance IS 'Get performance metrics by project category - Fixed to return TABLE';
COMMENT ON FUNCTION get_platform_statistics IS 'Get overall platform statistics - Fixed to return TABLE (single row)';
COMMENT ON FUNCTION get_content_statistics_by_category IS 'Get content breakdown by category - Returns JSONB for nested structure';
