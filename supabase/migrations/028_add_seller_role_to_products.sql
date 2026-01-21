-- ============================================
-- Add Seller Role to Products RPC Functions
-- ============================================
-- Adds seller_role field to distinguish between farmer (Zalo contact) 
-- and business (payment) products

-- Update get_products_with_stats to include seller_role
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
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    seller_username TEXT,
    seller_avatar TEXT,
    seller_points INTEGER,
    seller_role TEXT
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
        COALESCE(p.views_count, 0) AS views_count,
        p.created_at,
        p.updated_at,
        pr.username AS seller_username,
        pr.avatar_url AS seller_avatar,
        COALESCE(pr.points, 0) AS seller_points,
        pr.role AS seller_role
    FROM public.products p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE 
        (category_filter IS NULL OR p.category = category_filter)
        AND (search_query IS NULL OR p.name ILIKE '%' || search_query || '%' OR p.description ILIKE '%' || search_query || '%')
        AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL)
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_product_with_stats (singular) to include seller_role
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
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    seller_username TEXT,
    seller_avatar TEXT,
    seller_points INTEGER,
    seller_role TEXT
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
        COALESCE(p.views_count, 0) AS views_count,
        p.created_at,
        p.updated_at,
        pr.username AS seller_username,
        pr.avatar_url AS seller_avatar,
        COALESCE(pr.points, 0) AS seller_points,
        pr.role AS seller_role
    FROM public.products p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.id = product_uuid
    AND (p.moderation_status = 'approved' OR p.moderation_status IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
