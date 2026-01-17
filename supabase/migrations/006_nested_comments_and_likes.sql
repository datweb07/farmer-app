-- ============================================
-- Nested Comments & Comment Likes Schema
-- ============================================
-- Adds support for:
-- 1. Reply to comments (nested/threaded comments)
-- 2. Like/unlike comments
-- ============================================

-- ============================================
-- UPDATE COMMENTS TABLE
-- ============================================

-- Add parent_comment_id for nested comments
ALTER TABLE public.post_comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Add counters
ALTER TABLE public.post_comments
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0 CHECK (reply_count >= 0);

ALTER TABLE public.post_comments
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 CHECK (like_count >= 0);

-- Add index for parent comments
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_comment_id ON public.post_comments(parent_comment_id);

-- ============================================
-- COMMENT LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one like per user per comment
    UNIQUE(comment_id, user_id)
);

-- Indexes for comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON public.comment_likes(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Comment Likes Policies
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON public.comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR AUTO-INCREMENT COUNTS
-- ============================================

-- Function to update comment like count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.post_comments
        SET like_count = like_count + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.post_comments
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment likes
DROP TRIGGER IF EXISTS update_comment_like_count_trigger ON public.comment_likes;
CREATE TRIGGER update_comment_like_count_trigger
    AFTER INSERT OR DELETE ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Function to update comment reply count
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
        UPDATE public.post_comments
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
        UPDATE public.post_comments
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = OLD.parent_comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment replies
DROP TRIGGER IF EXISTS update_comment_reply_count_trigger ON public.post_comments;
CREATE TRIGGER update_comment_reply_count_trigger
    AFTER INSERT OR DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_reply_count();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get comments with user like status
CREATE OR REPLACE FUNCTION get_comments_with_stats(
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
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
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
            WHEN p_user_id IS NOT NULL THEN EXISTS(
                SELECT 1 FROM public.comment_likes 
                WHERE comment_id = c.id AND user_id = p_user_id
            )
            ELSE FALSE
        END AS user_liked,
        p.username,
        c.created_at,
        c.updated_at
    FROM public.post_comments c
    LEFT JOIN public.profiles p ON c.user_id = p.id
    WHERE c.post_id = p_post_id
      AND (
          (p_parent_comment_id IS NULL AND c.parent_comment_id IS NULL) OR
          (c.parent_comment_id = p_parent_comment_id)
      )
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
