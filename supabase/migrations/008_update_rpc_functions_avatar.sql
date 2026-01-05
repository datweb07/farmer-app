-- ============================================
-- Update RPC Functions to Include Avatar URLs
-- ============================================
-- Adds avatar_url to get_posts_with_stats function
-- ============================================

-- Drop existing functions first (required when changing return type)
DROP FUNCTION IF EXISTS get_posts_with_stats(text, text, integer, integer);
DROP FUNCTION IF EXISTS get_post_by_id(uuid);

-- Update get_posts_with_stats to include author avatar
CREATE OR REPLACE FUNCTION get_posts_with_stats(
    category_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    image_url TEXT,
    product_link TEXT,
    views_count INTEGER,
    likes_count BIGINT,
    comments_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    author_username TEXT,
    author_avatar TEXT,
    author_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR 
             p.title ILIKE '%' || search_query || '%' OR 
             p.content ILIKE '%' || search_query || '%')
    GROUP BY p.id, pr.username, pr.avatar_url, pr.points
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_post_by_id to include author avatar (if exists)
CREATE OR REPLACE FUNCTION get_post_by_id(post_uuid UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    image_url TEXT,
    product_link TEXT,
    views_count INTEGER,
    likes_count BIGINT,
    comments_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    author_username TEXT,
    author_avatar TEXT,
    author_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.category,
        p.image_url,
        p.product_link,
        p.views_count,
        COUNT(DISTINCT pl.id) AS likes_count,
        COUNT(DISTINCT pc.id) AS comments_count,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.id = post_uuid
    GROUP BY p.id, pr.username, pr.avatar_url, pr.points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
