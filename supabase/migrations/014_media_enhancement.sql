-- ============================================
-- Media Enhancement - Multiple Images & Videos
-- ============================================
-- Support for multiple images and videos in posts/products
-- ============================================

-- ============================================
-- POST IMAGES TABLE (Multiple images per post)
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON public.post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_order ON public.post_images(post_id, display_order);

-- ============================================
-- POST VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER, -- in seconds
    file_size BIGINT, -- in bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_videos_post_id ON public.post_videos(post_id);

-- ============================================
-- PRODUCT IMAGES TABLE (Multiple images per product)
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON public.product_images(product_id, display_order);

-- ============================================
-- PRODUCT VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_videos_product_id ON public.product_videos(product_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Post Images
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post images are viewable by everyone" ON public.post_images
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add post images" ON public.post_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE id = post_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own post images" ON public.post_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE id = post_id AND user_id = auth.uid()
        )
    );

-- Post Videos
ALTER TABLE public.post_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post videos are viewable by everyone" ON public.post_videos
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add post videos" ON public.post_videos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE id = post_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own post videos" ON public.post_videos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE id = post_id AND user_id = auth.uid()
        )
    );

-- Product Images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are viewable by everyone" ON public.product_images
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add product images" ON public.product_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own product images" ON public.product_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_id AND user_id = auth.uid()
        )
    );

-- Product Videos
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product videos are viewable by everyone" ON public.product_videos
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add product videos" ON public.product_videos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own product videos" ON public.product_videos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Dashboard > Storage
-- 1. Create bucket 'post-videos' (public)
-- 2. Create bucket 'product-videos' (public)
-- 3. Update 'post-images' bucket policies for multiple uploads
-- 4. Update 'product-images' bucket policies for multiple uploads

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get post with all media
CREATE OR REPLACE FUNCTION get_post_with_media(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'post', row_to_json(p.*),
        'images', COALESCE(
            (SELECT json_agg(row_to_json(pi.*) ORDER BY pi.display_order)
             FROM post_images pi WHERE pi.post_id = p_post_id),
            '[]'::json
        ),
        'videos', COALESCE(
            (SELECT json_agg(row_to_json(pv.*))
             FROM post_videos pv WHERE pv.post_id = p_post_id),
            '[]'::json
        )
    )
    INTO result
    FROM posts p
    WHERE p.id = p_post_id;
    
    RETURN result;
END;
$$;

-- Get product with all media
CREATE OR REPLACE FUNCTION get_product_with_media(p_product_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'product', row_to_json(p.*),
        'images', COALESCE(
            (SELECT json_agg(row_to_json(pi.*) ORDER BY pi.display_order)
             FROM product_images pi WHERE pi.product_id = p_product_id),
            '[]'::json
        ),
        'videos', COALESCE(
            (SELECT json_agg(row_to_json(pv.*))
             FROM product_videos pv WHERE pv.product_id = p_product_id),
            '[]'::json
        )
    )
    INTO result
    FROM products p
    WHERE p.id = p_product_id;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_post_with_media TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_with_media TO authenticated;
