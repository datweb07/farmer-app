-- Fix pre-existing runtime errors reported by `supabase db lint --linked`.

CREATE OR REPLACE FUNCTION public.get_comments_with_stats(
    p_post_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    post_id UUID,
    user_id UUID,
    content TEXT,
    parent_comment_id UUID,
    reply_count INTEGER,
    like_count INTEGER,
    user_liked BOOLEAN,
    username TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.parent_comment_id,
        c.reply_count,
        c.like_count,
        CASE
            WHEN p_user_id IS NOT NULL THEN EXISTS (
                SELECT 1
                FROM public.comment_likes cl
                WHERE cl.comment_id = c.id
                  AND cl.user_id = p_user_id
            )
            ELSE FALSE
        END,
        p.username,
        c.created_at,
        c.updated_at
    FROM public.post_comments c
    LEFT JOIN public.profiles p ON p.id = c.user_id
    WHERE c.post_id = p_post_id
      AND (
          (p_parent_comment_id IS NULL AND c.parent_comment_id IS NULL) OR
          c.parent_comment_id = p_parent_comment_id
      )
    ORDER BY c.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_date_range_stats(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'new_users', (
            SELECT COUNT(*) FROM public.profiles p
            WHERE p.created_at BETWEEN $1 AND $2
        ),
        'new_posts', (
            SELECT COUNT(*) FROM public.posts p
            WHERE p.created_at BETWEEN $1 AND $2
        ),
        'new_products', (
            SELECT COUNT(*) FROM public.products p
            WHERE p.created_at BETWEEN $1 AND $2
        ),
        'new_projects', (
            SELECT COUNT(*) FROM public.investment_projects ip
            WHERE ip.created_at BETWEEN $1 AND $2
        ),
        'new_investments', (
            SELECT COUNT(*) FROM public.project_investments pi
            WHERE pi.created_at BETWEEN $1 AND $2
        ),
        'investment_amount', (
            SELECT COALESCE(SUM(pi.amount), 0)
            FROM public.project_investments pi
            WHERE pi.created_at BETWEEN $1 AND $2
        )
    ) INTO stats;

    RETURN stats;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_contributors_analytics(
    limit_count INTEGER DEFAULT 10,
    period_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(r.payload ORDER BY r.score DESC), '[]'::JSON)
    INTO result
    FROM (
        SELECT
            json_build_object(
                'user_id', p.id,
                'username', p.username,
                'avatar_url', p.avatar_url,
                'total_posts', COALESCE(post_counts.count, 0),
                'total_comments', COALESCE(comment_counts.count, 0),
                'total_likes_received', COALESCE(like_counts.count, 0),
                'points', COALESCE(public.calculate_user_points(p.id), 0)
            ) AS payload,
            COALESCE(public.calculate_user_points(p.id), 0) AS score
        FROM public.profiles p
        LEFT JOIN (
            SELECT posts.user_id, COUNT(*) AS count
            FROM public.posts
            WHERE posts.created_at >= NOW() - make_interval(days => period_days)
            GROUP BY posts.user_id
        ) post_counts ON post_counts.user_id = p.id
        LEFT JOIN (
            SELECT post_comments.user_id, COUNT(*) AS count
            FROM public.post_comments
            WHERE post_comments.created_at >= NOW() - make_interval(days => period_days)
            GROUP BY post_comments.user_id
        ) comment_counts ON comment_counts.user_id = p.id
        LEFT JOIN (
            SELECT po.user_id, COUNT(*) AS count
            FROM public.post_likes pl
            JOIN public.posts po ON po.id = pl.post_id
            WHERE pl.created_at >= NOW() - make_interval(days => period_days)
            GROUP BY po.user_id
        ) like_counts ON like_counts.user_id = p.id
        WHERE COALESCE(post_counts.count, 0) > 0
           OR COALESCE(comment_counts.count, 0) > 0
        ORDER BY score DESC
        LIMIT GREATEST(limit_count, 0)
    ) r;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_categories_performance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'category', grouped.category,
                'total_projects', grouped.total_projects,
                'total_funding', grouped.total_funding,
                'avg_funding_percentage', grouped.avg_funding_percentage,
                'successful_projects', grouped.successful_projects
            ) ORDER BY grouped.total_funding DESC
        ),
        '[]'::JSON
    )
    INTO result
    FROM (
        SELECT
            ip.area AS category,
            COUNT(*) AS total_projects,
            COALESCE(SUM(ip.current_funding), 0) AS total_funding,
            ROUND(
                AVG(ip.current_funding::NUMERIC / NULLIF(ip.funding_goal, 0) * 100),
                2
            ) AS avg_funding_percentage,
            COUNT(*) FILTER (WHERE ip.current_funding >= ip.funding_goal) AS successful_projects
        FROM public.investment_projects ip
        WHERE ip.moderation_status = 'approved'
        GROUP BY ip.area
    ) grouped;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_analytics(
    project_id_param UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
            'funding_percentage', ROUND(
                ip.current_funding::NUMERIC / NULLIF(ip.funding_goal, 0) * 100,
                2
            ),
            'total_investors', COALESCE(investor_counts.count, 0),
            'avg_investment', ROUND(COALESCE(investor_counts.avg_amount, 0), 2),
            'created_at', ip.created_at,
            'days_active', EXTRACT(DAY FROM NOW() - ip.created_at),
            'roi_estimate', ip.farmers_impacted,
            'status', ip.moderation_status,
            'location', ip.area
        )
    ) INTO result
    FROM public.investment_projects ip
    LEFT JOIN public.profiles pr ON pr.id = ip.user_id
    LEFT JOIN (
        SELECT
            pi.project_id,
            COUNT(*) AS count,
            AVG(pi.amount) AS avg_amount
        FROM public.project_investments pi
        GROUP BY pi.project_id
    ) investor_counts ON investor_counts.project_id = ip.id
    WHERE (project_id_param IS NULL OR ip.id = project_id_param)
      AND ip.moderation_status = 'approved';

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

