-- ============================================
-- Notifications System Database Schema
-- ============================================
-- Real-time notification system for user activities
-- ============================================

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'POST_LIKE',
        'POST_COMMENT',
        'COMMENT_REPLY',
        'POST_SHARE',
        'PROJECT_INVESTMENT',
        'PROJECT_RATING',
        'PRODUCT_VIEW_MILESTONE',
        'FOLLOW',
        'MENTION'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_username TEXT,
    actor_avatar TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- System can insert notifications (used by triggers)
CREATE POLICY "System can insert notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- HELPER FUNCTION: Create Notification
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_actor_username TEXT;
    v_actor_avatar TEXT;
BEGIN
    -- Don't create notification if user is the actor (no self-notifications)
    IF p_user_id = p_actor_id THEN
        RETURN NULL;
    END IF;

    -- Get actor info if actor_id provided
    IF p_actor_id IS NOT NULL THEN
        SELECT username, avatar_url
        INTO v_actor_username, v_actor_avatar
        FROM profiles
        WHERE id = p_actor_id;
    END IF;

    -- Insert notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        actor_id,
        actor_username,
        actor_avatar
    )
    VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_link,
        p_actor_id,
        v_actor_username,
        v_actor_avatar
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- ============================================
-- TRIGGER: Post Like Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post_owner_id UUID;
    v_post_title TEXT;
BEGIN
    -- Get post owner and title
    SELECT user_id, title
    INTO v_post_owner_id, v_post_title
    FROM posts
    WHERE id = NEW.post_id;

    -- Create notification
    PERFORM create_notification(
        v_post_owner_id,
        'POST_LIKE',
        'Thích bài viết',
        'đã thích bài viết của bạn: "' || LEFT(v_post_title, 50) || '"',
        '/posts/' || NEW.post_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_post_like
    AFTER INSERT ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_like();

-- ============================================
-- TRIGGER: Post Comment Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post_owner_id UUID;
    v_post_title TEXT;
BEGIN
    -- Get post owner and title
    SELECT user_id, title
    INTO v_post_owner_id, v_post_title
    FROM posts
    WHERE id = NEW.post_id;

    -- Create notification for post owner
    PERFORM create_notification(
        v_post_owner_id,
        'POST_COMMENT',
        'Bình luận mới',
        'đã bình luận bài viết: "' || LEFT(v_post_title, 50) || '"',
        '/posts/' || NEW.post_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_post_comment
    AFTER INSERT ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_comment();

-- ============================================
-- TRIGGER: Comment Reply Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_comment_owner_id UUID;
    v_post_title TEXT;
BEGIN
    -- Only for replies (has parent_comment_id)
    IF NEW.parent_comment_id IS NOT NULL THEN
        -- Get parent comment owner
        SELECT user_id
        INTO v_parent_comment_owner_id
        FROM post_comments
        WHERE id = NEW.parent_comment_id;

        -- Get post title
        SELECT title
        INTO v_post_title
        FROM posts
        WHERE id = NEW.post_id;

        -- Create notification for parent comment owner
        PERFORM create_notification(
            v_parent_comment_owner_id,
            'COMMENT_REPLY',
            'Trả lời bình luận',
            'đã trả lời bình luận của bạn trong: "' || LEFT(v_post_title, 40) || '"',
            '/posts/' || NEW.post_id,
            NEW.user_id
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_comment_reply
    AFTER INSERT ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_comment_reply();

-- ============================================
-- TRIGGER: Post Share Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_post_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post_title TEXT;
BEGIN
    -- Get post title
    SELECT title
    INTO v_post_title
    FROM posts
    WHERE id = NEW.post_id;

    -- Create notification for original post owner
    PERFORM create_notification(
        NEW.original_user_id,
        'POST_SHARE',
        'Chia sẻ bài viết',
        'đã chia sẻ bài viết của bạn: "' || LEFT(v_post_title, 50) || '"',
        '/posts/' || NEW.post_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_post_share
    AFTER INSERT ON post_shares
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_share();

-- ============================================
-- TRIGGER: Project Investment Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_project_investment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_owner_id UUID;
    v_project_title TEXT;
BEGIN
    -- Get project owner and title
    SELECT user_id, title
    INTO v_project_owner_id, v_project_title
    FROM investment_projects
    WHERE id = NEW.project_id;

    -- Create notification
    PERFORM create_notification(
        v_project_owner_id,
        'PROJECT_INVESTMENT',
        'Đầu tư mới',
        'đã đầu tư vào dự án: "' || LEFT(v_project_title, 50) || '"',
        '/invest/' || NEW.project_id,
        NEW.investor_id
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_project_investment
    AFTER INSERT ON project_investments
    FOR EACH ROW
    EXECUTE FUNCTION notify_project_investment();

-- ============================================
-- TRIGGER: Project Rating Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_project_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_owner_id UUID;
    v_project_title TEXT;
BEGIN
    -- Get project owner and title
    SELECT user_id, title
    INTO v_project_owner_id, v_project_title
    FROM investment_projects
    WHERE id = NEW.project_id;

    -- Create notification
    PERFORM create_notification(
        v_project_owner_id,
        'PROJECT_RATING',
        'Đánh giá dự án',
        'đã đánh giá ' || NEW.rating || ' sao cho dự án: "' || LEFT(v_project_title, 40) || '"',
        '/invest/' || NEW.project_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_project_rating
    AFTER INSERT ON project_ratings
    FOR EACH ROW
    EXECUTE FUNCTION notify_project_rating();

-- ============================================
-- FUNCTION: Get Unread Count
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false;

    RETURN v_count;
END;
$$;

-- ============================================
-- FUNCTION: Mark All as Read
-- ============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE user_id = p_user_id AND is_read = false;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notifications_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
