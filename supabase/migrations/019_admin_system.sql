-- ============================================
-- Admin System Migration
-- ============================================
-- Features:
-- - User management (ban/unban, role changes)
-- - Content moderation (posts, products, projects)
-- - Admin logs and audit trail
-- - Statistics and analytics
-- ============================================

-- ============================================
-- 1. ADD ADMIN ROLE TO PROFILES
-- ============================================

-- Add admin column to profiles (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add banned status to profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_banned'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
        ALTER TABLE profiles ADD COLUMN banned_reason TEXT;
        ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
        ALTER TABLE profiles ADD COLUMN banned_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);

-- ============================================
-- 2. CONTENT MODERATION TABLES
-- ============================================

-- Content reports table
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'product', 'project', 'comment', 'user')),
    content_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'misleading', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_type ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);

-- Admin actions log table
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'ban_user', 'unban_user', 
        'delete_post', 'delete_product', 'delete_project', 'delete_comment',
        'approve_post', 'reject_post',
        'approve_product', 'reject_product',
        'approve_project', 'reject_project',
        'change_role', 'resolve_report'
    )),
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

-- Add moderation status to posts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'moderation_status'
    ) THEN
        ALTER TABLE posts ADD COLUMN moderation_status TEXT DEFAULT 'pending' 
            CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
        ALTER TABLE posts ADD COLUMN moderation_note TEXT;
        ALTER TABLE posts ADD COLUMN moderated_by UUID REFERENCES profiles(id);
        ALTER TABLE posts ADD COLUMN moderated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add moderation status to products
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'moderation_status'
    ) THEN
        ALTER TABLE products ADD COLUMN moderation_status TEXT DEFAULT 'pending' 
            CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
        ALTER TABLE products ADD COLUMN moderation_note TEXT;
        ALTER TABLE products ADD COLUMN moderated_by UUID REFERENCES profiles(id);
        ALTER TABLE products ADD COLUMN moderated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add moderation status to projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'investment_projects' 
        AND column_name = 'moderation_status'
    ) THEN
        ALTER TABLE investment_projects ADD COLUMN moderation_status TEXT DEFAULT 'pending' 
            CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
        ALTER TABLE investment_projects ADD COLUMN moderation_note TEXT;
        ALTER TABLE investment_projects ADD COLUMN moderated_by UUID REFERENCES profiles(id);
        ALTER TABLE investment_projects ADD COLUMN moderated_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- 3. RLS POLICIES FOR ADMIN
-- ============================================

-- Enable RLS on new tables
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Anyone can create reports
CREATE POLICY "Users can create reports" ON content_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON content_reports
    FOR SELECT TO authenticated
    USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON content_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON content_reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Admins can view all admin actions
CREATE POLICY "Admins can view admin actions" ON admin_actions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Admins can insert admin actions
CREATE POLICY "Admins can insert admin actions" ON admin_actions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- ============================================
-- 4. ADMIN FUNCTIONS
-- ============================================

-- Function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSON;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'active_users', (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '30 days'),
        'banned_users', (SELECT COUNT(*) FROM profiles WHERE is_banned = TRUE),
        'total_posts', (SELECT COUNT(*) FROM posts),
        'pending_posts', (SELECT COUNT(*) FROM posts WHERE moderation_status = 'pending'),
        'total_products', (SELECT COUNT(*) FROM products),
        'pending_products', (SELECT COUNT(*) FROM products WHERE moderation_status = 'pending'),
        'total_projects', (SELECT COUNT(*) FROM investment_projects),
        'pending_projects', (SELECT COUNT(*) FROM investment_projects WHERE moderation_status = 'pending'),
        'total_reports', (SELECT COUNT(*) FROM content_reports),
        'pending_reports', (SELECT COUNT(*) FROM content_reports WHERE status = 'pending'),
        'total_investments', (SELECT COALESCE(SUM(amount), 0) FROM project_investments),
        'total_comments', (SELECT COUNT(*) FROM post_comments)
    ) INTO stats;

    RETURN stats;
END;
$$;

-- Function to get users with pagination
CREATE OR REPLACE FUNCTION get_users_admin(
    search_query TEXT DEFAULT NULL,
    role_filter TEXT DEFAULT NULL,
    status_filter TEXT DEFAULT NULL,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    phone_number TEXT,
    role TEXT,
    is_admin BOOLEAN,
    is_banned BOOLEAN,
    banned_reason TEXT,
    points INT,
    total_posts INT,
    total_products INT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.phone_number,
        p.role,
        p.is_admin,
        p.is_banned,
        p.banned_reason,
        COALESCE(calculate_user_points(p.id), 0) as points,
        (SELECT COUNT(*)::INT FROM posts WHERE user_id = p.id) as total_posts,
        (SELECT COUNT(*)::INT FROM products WHERE user_id = p.id) as total_products,
        p.created_at
    FROM profiles p
    WHERE 
        (search_query IS NULL OR p.username ILIKE '%' || search_query || '%')
        AND (role_filter IS NULL OR p.role = role_filter)
        AND (status_filter IS NULL OR 
            (status_filter = 'banned' AND p.is_banned = TRUE) OR
            (status_filter = 'active' AND p.is_banned = FALSE)
        )
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Function to get content with moderation status
CREATE OR REPLACE FUNCTION get_content_for_moderation(
    content_type_filter TEXT,
    status_filter TEXT DEFAULT 'pending',
    limit_count INT DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    IF content_type_filter = 'posts' THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                p.*,
                pr.username as author_name,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
            FROM posts p
            JOIN profiles pr ON p.user_id = pr.id
            WHERE p.moderation_status = status_filter
            ORDER BY p.created_at DESC
            LIMIT limit_count
        ) t;
    ELSIF content_type_filter = 'products' THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                p.*,
                pr.username as seller_name
            FROM products p
            JOIN profiles pr ON p.user_id = pr.id
            WHERE p.moderation_status = status_filter
            ORDER BY p.created_at DESC
            LIMIT limit_count
        ) t;
    ELSIF content_type_filter = 'projects' THEN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                ip.*,
                pr.username as creator_name,
                ip.current_funding,
                ip.funding_goal
            FROM investment_projects ip
            JOIN profiles pr ON ip.user_id = pr.id
            WHERE ip.moderation_status = status_filter
            ORDER BY ip.created_at DESC
            LIMIT limit_count
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Function to ban/unban user
CREATE OR REPLACE FUNCTION admin_ban_user(
    target_user_id UUID,
    ban_status BOOLEAN,
    ban_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Update user status
    UPDATE profiles
    SET 
        is_banned = ban_status,
        banned_reason = CASE WHEN ban_status THEN ban_reason ELSE NULL END,
        banned_at = CASE WHEN ban_status THEN NOW() ELSE NULL END,
        banned_by = CASE WHEN ban_status THEN auth.uid() ELSE NULL END
    WHERE id = target_user_id;

    -- Log action
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
    VALUES (
        auth.uid(),
        CASE WHEN ban_status THEN 'ban_user' ELSE 'unban_user' END,
        'user',
        target_user_id,
        ban_reason
    );

    RETURN TRUE;
END;
$$;

-- Function to moderate content
CREATE OR REPLACE FUNCTION admin_moderate_content(
    content_type_param TEXT,
    content_id_param UUID,
    new_status TEXT,
    note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    IF content_type_param = 'post' THEN
        UPDATE posts
        SET 
            moderation_status = new_status,
            moderation_note = note,
            moderated_by = auth.uid(),
            moderated_at = NOW()
        WHERE id = content_id_param;
    ELSIF content_type_param = 'product' THEN
        UPDATE products
        SET 
            moderation_status = new_status,
            moderation_note = note,
            moderated_by = auth.uid(),
            moderated_at = NOW()
        WHERE id = content_id_param;
    ELSIF content_type_param = 'project' THEN
        UPDATE investment_projects
        SET 
            moderation_status = new_status,
            moderation_note = note,
            moderated_by = auth.uid(),
            moderated_at = NOW()
        WHERE id = content_id_param;
    END IF;

    -- Log action
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason, metadata)
    VALUES (
        auth.uid(),
        CASE 
            WHEN new_status = 'approved' THEN 'approve_' || content_type_param
            WHEN new_status = 'rejected' THEN 'reject_' || content_type_param
            ELSE 'moderate_' || content_type_param
        END,
        content_type_param,
        content_id_param,
        note,
        json_build_object('new_status', new_status)
    );

    RETURN TRUE;
END;
$$;

-- Function to delete content
CREATE OR REPLACE FUNCTION admin_delete_content(
    content_type_param TEXT,
    content_id_param UUID,
    delete_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Log action before deletion
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
    VALUES (
        auth.uid(),
        'delete_' || content_type_param,
        content_type_param,
        content_id_param,
        delete_reason
    );

    -- Delete content
    IF content_type_param = 'post' THEN
        DELETE FROM posts WHERE id = content_id_param;
    ELSIF content_type_param = 'product' THEN
        DELETE FROM products WHERE id = content_id_param;
    ELSIF content_type_param = 'project' THEN
        DELETE FROM investment_projects WHERE id = content_id_param;
    ELSIF content_type_param = 'comment' THEN
        DELETE FROM post_comments WHERE id = content_id_param;
    END IF;

    RETURN TRUE;
END;
$$;

-- Function to change user role
CREATE OR REPLACE FUNCTION admin_change_user_role(
    target_user_id UUID,
    new_role TEXT,
    make_admin BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Update user role
    UPDATE profiles
    SET 
        role = new_role,
        is_admin = make_admin
    WHERE id = target_user_id;

    -- Log action
    INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, metadata)
    VALUES (
        auth.uid(),
        'change_role',
        'user',
        target_user_id,
        json_build_object('new_role', new_role, 'is_admin', make_admin)
    );

    RETURN TRUE;
END;
$$;

-- Function to get reports with details
CREATE OR REPLACE FUNCTION get_content_reports_admin(
    status_filter TEXT DEFAULT NULL,
    limit_count INT DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            cr.*,
            pr.username as reporter_name,
            res.username as resolver_name
        FROM content_reports cr
        JOIN profiles pr ON cr.reporter_id = pr.id
        LEFT JOIN profiles res ON cr.resolved_by = res.id
        WHERE status_filter IS NULL OR cr.status = status_filter
        ORDER BY cr.created_at DESC
        LIMIT limit_count
    ) t;

    RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_admin(TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_for_moderation(TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_ban_user(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_moderate_content(TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_content(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_change_user_role(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_reports_admin(TEXT, INT) TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
