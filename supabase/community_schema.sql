-- ============================================
-- Community & Products Database Schema
-- ============================================
-- Tables: posts, products, post_likes, post_comments, post_views, product_views
-- Features: RLS policies, view tracking, points calculation, leaderboard
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('experience', 'salinity-solution', 'product')),
    image_url TEXT,
    product_link TEXT, -- Optional link to product if category is 'product'
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    image_url TEXT,
    contact TEXT NOT NULL, -- Phone number for Zalo
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- ============================================
-- POST LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id) -- One like per user per post
);

-- Indexes for post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- ============================================
-- POST COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at DESC);

-- ============================================
-- POST VIEWS TABLE (Track unique views)
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous views
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id) -- One view per user per post
);

-- Indexes for post_views
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);

-- ============================================
-- PRODUCT VIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

-- Indexes for product_views
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Products policies
CREATE POLICY "Products are viewable by everyone" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create products" ON public.products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.products
    FOR DELETE USING (auth.uid() = user_id);

-- Post likes policies
CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like posts" ON public.post_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON public.post_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.post_comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.post_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.post_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.post_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Views policies (everyone can track views)
CREATE POLICY "Anyone can record post views" ON public.post_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Post views are viewable by everyone" ON public.post_views
    FOR SELECT USING (true);

CREATE POLICY "Anyone can record product views" ON public.product_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Product views are viewable by everyone" ON public.product_views
    FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get post with aggregated data
CREATE OR REPLACE FUNCTION get_post_with_stats(post_uuid UUID)
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
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.id = post_uuid
    GROUP BY p.id, pr.username, pr.points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all posts with stats
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
        pr.points AS author_points
    FROM public.posts p
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    LEFT JOIN public.post_comments pc ON p.id = pc.post_id
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR p.title ILIKE '%' || search_query || '%' OR p.content ILIKE '%' || search_query || '%')
    GROUP BY p.id, pr.username, pr.points
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user points
CREATE OR REPLACE FUNCTION calculate_user_points(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER := 0;
    post_points INTEGER := 0;
    like_points INTEGER := 0;
    view_points INTEGER := 0;
BEGIN
    -- Base points from profile
    SELECT COALESCE(points, 0) INTO total_points
    FROM public.profiles
    WHERE id = user_uuid;
    
    -- Points from posts (+10 per post)
    SELECT COUNT(*) * 10 INTO post_points
    FROM public.posts
    WHERE user_id = user_uuid;
    
    -- Points from likes (+5 per 10 likes)
    SELECT (COUNT(*) / 10) * 5 INTO like_points
    FROM public.post_likes pl
    JOIN public.posts p ON pl.post_id = p.id
    WHERE p.user_id = user_uuid;
    
    -- Points from views (+2 per 100 views)
    SELECT (COALESCE(SUM(views_count), 0) / 100) * 2 INTO view_points
    FROM public.posts
    WHERE user_id = user_uuid;
    
    RETURN total_points + post_points + like_points + view_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top contributors (leaderboard)
CREATE OR REPLACE FUNCTION get_top_contributors(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    total_points INTEGER,
    posts_count BIGINT,
    likes_received BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id AS user_id,
        pr.username,
        calculate_user_points(pr.id) AS total_points,
        COUNT(DISTINCT p.id) AS posts_count,
        COUNT(DISTINCT pl.id) AS likes_received
    FROM public.profiles pr
    LEFT JOIN public.posts p ON pr.id = p.user_id
    LEFT JOIN public.post_likes pl ON p.id = pl.post_id
    GROUP BY pr.id, pr.username
    ORDER BY total_points DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment post view count
CREATE OR REPLACE FUNCTION increment_post_views(post_uuid UUID, viewer_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Try to insert a view record (will fail if already viewed by this user)
    INSERT INTO public.post_views (post_id, user_id)
    VALUES (post_uuid, viewer_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    
    -- Update the denormalized view count
    UPDATE public.posts
    SET views_count = (SELECT COUNT(*) FROM public.post_views WHERE post_id = post_uuid)
    WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment product view count
CREATE OR REPLACE FUNCTION increment_product_views(product_uuid UUID, viewer_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.product_views (product_id, user_id)
    VALUES (product_uuid, viewer_id)
    ON CONFLICT (product_id, user_id) DO NOTHING;
    
    UPDATE public.products
    SET views_count = (SELECT COUNT(*) FROM public.product_views WHERE product_id = product_uuid)
    WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp for posts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS (Run this in Supabase Dashboard > Storage)
-- ============================================

-- Create storage buckets for images
-- You need to run these commands in Supabase Dashboard > Storage:
-- 1. Create bucket 'post-images' with public access
-- 2. Create bucket 'product-images' with public access
-- 3. Set upload policies to allow authenticated users to upload

-- Or run these SQL commands:
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-images
CREATE POLICY "Anyone can view post images" ON storage.objects
    FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own post images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own post images" ON storage.objects
    FOR DELETE USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for product-images
CREATE POLICY "Anyone can view product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own product images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own product images" ON storage.objects
    FOR DELETE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
