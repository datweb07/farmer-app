-- ============================================
-- Filter Approved Content Only
-- ============================================
-- Update RPC functions to only show approved posts/products
-- Users only see approved content
-- Admins see all content via admin panel
-- ============================================

-- ============================================
-- 1. UPDATE get_posts_with_stats
-- ============================================
-- Only return approved posts for regular users

CREATE OR REPLACE FUNCTION get_posts_with_stats(
    category_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    current_user_id UUID DEFAULT NULL
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
    shares_count BIGINT,
    is_liked BOOLEAN,
    is_shared BOOLEAN,
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
        COUNT(DISTINCT ps.id) AS shares_count,
        EXISTS(SELECT 1 FROM public.post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = current_user_id) AS is_liked,
        EXISTS(SELECT 1 FROM public.post_shares ps2 WHERE ps2.post_id = p.id AND ps2.user_id = current_user_id) AS is_shared,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR p.title ILIKE '%' || search_query || '%' OR p.content ILIKE '%' || search_query || '%')
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL) -- Only show approved posts
    GROUP BY p.id, pr.username, pr.avatar_url
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. UPDATE get_post_with_stats
-- ============================================
-- Allow viewing post by ID if approved OR if it's user's own post

CREATE OR REPLACE FUNCTION get_post_with_stats(
    post_uuid UUID,
    current_user_id UUID DEFAULT NULL
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
    shares_count BIGINT,
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
        COUNT(DISTINCT ps.id) AS shares_count,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        p.id = post_uuid
        AND (
            p.moderation_status = 'approved' 
            OR p.moderation_status IS NULL
            OR p.user_id = current_user_id  -- User can view their own posts
        )
    GROUP BY p.id, pr.username, pr.avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. UPDATE get_user_posts
-- ============================================
-- Show user's own posts regardless of moderation status
-- But other users' posts must be approved

CREATE OR REPLACE FUNCTION get_user_posts(
    user_uuid UUID,
    limit_count INTEGER DEFAULT 20,
    current_user_id UUID DEFAULT NULL
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
    shares_count BIGINT,
    is_liked BOOLEAN,
    is_shared BOOLEAN,
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
        COUNT(DISTINCT ps.id) AS shares_count,
        EXISTS(SELECT 1 FROM public.post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = current_user_id) AS is_liked,
        EXISTS(SELECT 1 FROM public.post_shares ps2 WHERE ps2.post_id = p.id AND ps2.user_id = current_user_id) AS is_shared,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        p.user_id = user_uuid
        AND (
            p.user_id = current_user_id  -- User can see their own posts
            OR p.moderation_status = 'approved'  -- Others see only approved
            OR p.moderation_status IS NULL
        )
    GROUP BY p.id, pr.username, pr.avatar_url
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. UPDATE get_user_shared_posts
-- ============================================
-- Only show shared posts that are approved

CREATE OR REPLACE FUNCTION get_user_shared_posts(
    user_uuid UUID,
    limit_count INTEGER DEFAULT 20,
    current_user_id UUID DEFAULT NULL
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
    shares_count BIGINT,
    is_liked BOOLEAN,
    is_shared BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    author_username TEXT,
    author_avatar TEXT,
    author_points INTEGER,
    shared_at TIMESTAMP WITH TIME ZONE
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
        COUNT(DISTINCT ps_all.id) AS shares_count,
        EXISTS(SELECT 1 FROM public.post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = current_user_id) AS is_liked,
        EXISTS(SELECT 1 FROM public.post_shares ps2 WHERE ps2.post_id = p.id AND ps2.user_id = current_user_id) AS is_shared,
        p.created_at,
        p.updated_at,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        COALESCE(calculate_user_points(p.user_id), 0) AS author_points,
        ps.created_at AS shared_at
    FROM public.post_shares ps
    JOIN public.posts p ON ps.post_id = p.id
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps_all ON p.id = ps_all.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        ps.user_id = user_uuid
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL) -- Only approved posts
    GROUP BY p.id, pr.username, pr.avatar_url, ps.created_at
    ORDER BY ps.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CREATE get_products_with_stats (if not exists)
-- ============================================
-- Get products - only show approved ones

CREATE OR REPLACE FUNCTION get_products_with_stats(
    category_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    category TEXT,
    image_url TEXT,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    seller_username TEXT,
    seller_avatar TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.image_url,
        p.contact,
        p.created_at,
        pr.username AS seller_username,
        pr.avatar_url AS seller_avatar
    FROM public.products p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR p.name ILIKE '%' || search_query || '%' OR p.description ILIKE '%' || search_query || '%')
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL) -- Only approved products
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CREATE get_product_with_stats (singular)
-- ============================================

CREATE OR REPLACE FUNCTION get_product_with_stats(
    product_uuid UUID,
    current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    category TEXT,
    image_url TEXT,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    seller_username TEXT,
    seller_avatar TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.image_url,
        p.contact,
        p.created_at,
        pr.username AS seller_username,
        pr.avatar_url AS seller_avatar
    FROM public.products p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        p.id = product_uuid
        AND (
            p.moderation_status = 'approved' 
            OR p.moderation_status IS NULL
            OR p.user_id = current_user_id  -- User can view their own products
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_posts_with_stats(TEXT, TEXT, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_with_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_posts(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_shared_posts(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_with_stats(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_with_stats(UUID, UUID) TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Now all posts and products require approval before being visible
-- Users can still see their own pending posts/products
-- Admins use admin panel to moderate content
