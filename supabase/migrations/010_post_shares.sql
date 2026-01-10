-- ============================================
-- Post Shares Migration
-- ============================================
-- Add post sharing functionality
-- ============================================

-- Create post_shares table
CREATE TABLE IF NOT EXISTS public.post_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id) -- One share per user per post
);

-- Indexes for post_shares
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON public.post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_created_at ON public.post_shares(created_at DESC);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Post shares policies
CREATE POLICY "Post shares are viewable by everyone" ON public.post_shares
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can share posts" ON public.post_shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares" ON public.post_shares
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Update get_posts_with_stats function to include share information
-- ============================================

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
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR p.title ILIKE '%' || search_query || '%' OR p.content ILIKE '%' || search_query || '%')
    GROUP BY p.id, pr.username, pr.avatar_url, pr.points
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to get user's shared posts
-- ============================================

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
        pr.points AS author_points,
        ps.created_at AS shared_at
    FROM public.post_shares ps
    JOIN public.posts p ON ps.post_id = p.id
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps_all ON p.id = ps_all.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE ps.user_id = user_uuid
    GROUP BY p.id, pr.username, pr.avatar_url, pr.points, ps.created_at
    ORDER BY ps.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to get user's own posts
-- ============================================

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
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.post_shares ps ON p.id = ps.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.user_id = user_uuid
    GROUP BY p.id, pr.username, pr.avatar_url, pr.points
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
