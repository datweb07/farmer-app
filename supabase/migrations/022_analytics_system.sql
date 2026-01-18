-- ============================================
-- Analytics System Migration
-- ============================================
-- Comprehensive analytics for users, projects, and platform
-- Features:
-- - User analytics (activity, engagement, growth)
-- - Project analytics (ROI, impact, funding)
-- - Platform statistics (active users, content, revenue)
-- - Time-series data for trends
-- ============================================

-- ============================================
-- 1. ANALYTICS HELPER FUNCTIONS
-- ============================================

-- Function to get date range stats
CREATE OR REPLACE FUNCTION get_date_range_stats(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'new_users', (
            SELECT COUNT(*) FROM profiles 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_posts', (
            SELECT COUNT(*) FROM posts 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_products', (
            SELECT COUNT(*) FROM products 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_projects', (
            SELECT COUNT(*) FROM investment_projects 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'new_investments', (
            SELECT COUNT(*) FROM project_investments 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'investment_amount', (
            SELECT COALESCE(SUM(amount), 0) FROM project_investments 
            WHERE created_at BETWEEN start_date AND end_date
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- ============================================
-- 2. USER ANALYTICS FUNCTIONS
-- ============================================

-- Get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(
    days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH date_series AS (
        SELECT generate_series(
            NOW() - (days_back || ' days')::INTERVAL,
            NOW(),
            '1 day'::INTERVAL
        )::DATE as date
    ),
    daily_active_users AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(DISTINCT user_id) as active_users
        FROM (
            SELECT user_id, created_at FROM posts
            UNION ALL
            SELECT user_id, created_at FROM products
            UNION ALL
            SELECT user_id, created_at FROM post_comments
            UNION ALL
            SELECT user_id, created_at FROM post_likes
        ) all_activity
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_posts AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM posts
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_comments AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM post_comments
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    ),
    daily_likes AS (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM post_likes
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    )
    SELECT json_agg(
        json_build_object(
            'date', ds.date,
            'active_users', COALESCE(dau.active_users, 0),
            'posts', COALESCE(dp.count, 0),
            'comments', COALESCE(dc.count, 0),
            'likes', COALESCE(dl.count, 0)
        ) ORDER BY ds.date
    ) INTO result
    FROM date_series ds
    LEFT JOIN daily_active_users dau ON ds.date = dau.date
    LEFT JOIN daily_posts dp ON ds.date = dp.date
    LEFT JOIN daily_comments dc ON ds.date = dc.date
    LEFT JOIN daily_likes dl ON ds.date = dl.date;
    
    RETURN result;
END;
$$;

-- Get top contributors
CREATE OR REPLACE FUNCTION get_top_contributors_analytics(
    limit_count INTEGER DEFAULT 10,
    period_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'user_id', p.id,
            'username', p.username,
            'avatar_url', p.avatar_url,
            'total_posts', post_counts.count,
            'total_comments', comment_counts.count,
            'total_likes_received', like_counts.count,
            'points', COALESCE(calculate_user_points(p.id), 0)
        )
    ) INTO result
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
    
    RETURN result;
END;
$$;

-- Get user growth metrics
CREATE OR REPLACE FUNCTION get_user_growth_metrics(
    days_back INTEGER DEFAULT 90
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH date_series AS (
        SELECT generate_series(
            NOW() - (days_back || ' days')::INTERVAL,
            NOW(),
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
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    )
    SELECT json_agg(
        json_build_object(
            'date', cu.date,
            'total_users', cu.total_users,
            'new_users', COALESCE(dnu.new_users, 0)
        ) ORDER BY cu.date
    ) INTO result
    FROM cumulative_users cu
    LEFT JOIN daily_new_users dnu ON cu.date = dnu.date;
    
    RETURN result;
END;
$$;

-- ============================================
-- 3. PROJECT ANALYTICS FUNCTIONS
-- ============================================

-- Get project performance metrics
CREATE OR REPLACE FUNCTION get_project_analytics(
    project_id_param UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'project_id', ip.id,
            'title', ip.title,
            'creator_username', pr.username,
            'funding_goal', ip.funding_goal,
            'current_funding', ip.current_funding,
            'funding_percentage', ROUND((ip.current_funding::NUMERIC / NULLIF(ip.funding_goal, 0) * 100), 2),
            'total_investors', investor_counts.count,
            'avg_investment', ROUND(investor_counts.avg_amount, 2),
            'created_at', ip.created_at,
            'days_active', EXTRACT(DAY FROM NOW() - ip.created_at),
            'roi_estimate', ip.expected_return,
            'status', ip.moderation_status,
            'location', ip.location
        )
    ) INTO result
    FROM investment_projects ip
    LEFT JOIN profiles pr ON ip.user_id = pr.id
    LEFT JOIN (
        SELECT 
            project_id,
            COUNT(*) as count,
            AVG(amount) as avg_amount
        FROM project_investments
        GROUP BY project_id
    ) investor_counts ON ip.id = investor_counts.project_id
    WHERE (project_id_param IS NULL OR ip.id = project_id_param)
    AND ip.moderation_status = 'approved';
    
    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Get investment trends
CREATE OR REPLACE FUNCTION get_investment_trends(
    days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH date_series AS (
        SELECT generate_series(
            NOW() - (days_back || ' days')::INTERVAL,
            NOW(),
            '1 day'::INTERVAL
        )::DATE as date
    ),
    daily_investments AS (
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as count,
            SUM(amount) as total_amount
        FROM project_investments
        WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
    )
    SELECT json_agg(
        json_build_object(
            'date', ds.date,
            'investments', COALESCE(di.count, 0),
            'amount', COALESCE(di.total_amount, 0)
        ) ORDER BY ds.date
    ) INTO result
    FROM date_series ds
    LEFT JOIN daily_investments di ON ds.date = di.date;
    
    RETURN result;
END;
$$;

-- Get project categories performance
CREATE OR REPLACE FUNCTION get_project_categories_performance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'category', category,
            'total_projects', COUNT(*),
            'total_funding', SUM(current_funding),
            'avg_funding_percentage', ROUND(AVG(current_funding::NUMERIC / NULLIF(funding_goal, 0) * 100), 2),
            'successful_projects', COUNT(*) FILTER (WHERE current_funding >= funding_goal)
        )
    ) INTO result
    FROM investment_projects
    WHERE moderation_status = 'approved'
    GROUP BY category;
    
    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- ============================================
-- 4. PLATFORM STATISTICS FUNCTIONS
-- ============================================

-- Get comprehensive platform statistics
CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'active_users_today', (
            SELECT COUNT(DISTINCT user_id) FROM (
                SELECT user_id FROM posts WHERE DATE(created_at) = CURRENT_DATE
                UNION
                SELECT user_id FROM post_comments WHERE DATE(created_at) = CURRENT_DATE
                UNION
                SELECT user_id FROM post_likes WHERE DATE(created_at) = CURRENT_DATE
            ) t
        ),
        'active_users_week', (
            SELECT COUNT(DISTINCT user_id) FROM (
                SELECT user_id FROM posts WHERE created_at >= NOW() - INTERVAL '7 days'
                UNION
                SELECT user_id FROM post_comments WHERE created_at >= NOW() - INTERVAL '7 days'
                UNION
                SELECT user_id FROM post_likes WHERE created_at >= NOW() - INTERVAL '7 days'
            ) t
        ),
        'active_users_month', (
            SELECT COUNT(DISTINCT user_id) FROM (
                SELECT user_id FROM posts WHERE created_at >= NOW() - INTERVAL '30 days'
                UNION
                SELECT user_id FROM post_comments WHERE created_at >= NOW() - INTERVAL '30 days'
                UNION
                SELECT user_id FROM post_likes WHERE created_at >= NOW() - INTERVAL '30 days'
            ) t
        ),
        'total_posts', (SELECT COUNT(*) FROM posts WHERE moderation_status = 'approved'),
        'total_products', (SELECT COUNT(*) FROM products WHERE moderation_status = 'approved'),
        'total_projects', (SELECT COUNT(*) FROM investment_projects WHERE moderation_status = 'approved'),
        'total_comments', (SELECT COUNT(*) FROM post_comments),
        'total_likes', (SELECT COUNT(*) FROM post_likes),
        'total_investments', (SELECT COUNT(*) FROM project_investments),
        'total_investment_amount', (SELECT COALESCE(SUM(amount), 0) FROM project_investments),
        'avg_engagement_rate', (
            SELECT ROUND(
                (COUNT(DISTINCT pl.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT p.user_id), 0) * 100), 
                2
            )
            FROM posts p
            LEFT JOIN post_likes pl ON p.id = pl.post_id
            WHERE p.created_at >= NOW() - INTERVAL '30 days'
        ),
        'user_growth_rate_month', (
            WITH current_month AS (
                SELECT COUNT(*) as count FROM profiles 
                WHERE created_at >= DATE_TRUNC('month', NOW())
            ),
            previous_month AS (
                SELECT COUNT(*) as count FROM profiles 
                WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                AND created_at < DATE_TRUNC('month', NOW())
            )
            SELECT ROUND(
                (current_month.count::NUMERIC / NULLIF(previous_month.count, 0) - 1) * 100,
                2
            )
            FROM current_month, previous_month
        ),
        'content_growth_rate_month', (
            WITH current_month AS (
                SELECT COUNT(*) as count FROM posts 
                WHERE created_at >= DATE_TRUNC('month', NOW())
            ),
            previous_month AS (
                SELECT COUNT(*) as count FROM posts 
                WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
                AND created_at < DATE_TRUNC('month', NOW())
            )
            SELECT ROUND(
                (current_month.count::NUMERIC / NULLIF(previous_month.count, 0) - 1) * 100,
                2
            )
            FROM current_month, previous_month
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Get content statistics by category
CREATE OR REPLACE FUNCTION get_content_statistics_by_category()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    WITH post_stats AS (
        SELECT 
            category,
            COUNT(*) as total,
            AVG(views_count) as avg_views
        FROM posts
        WHERE moderation_status = 'approved'
        GROUP BY category
    ),
    product_stats AS (
        SELECT 
            category,
            COUNT(*) as total,
            AVG(price) as avg_price
        FROM products
        WHERE moderation_status = 'approved'
        GROUP BY category
    )
    SELECT json_build_object(
        'posts', (SELECT json_agg(row_to_json(post_stats)) FROM post_stats),
        'products', (SELECT json_agg(row_to_json(product_stats)) FROM product_stats)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_date_range_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_contributors_analytics(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_growth_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_investment_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_categories_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_statistics_by_category() TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
