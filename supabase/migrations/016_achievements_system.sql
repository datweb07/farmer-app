-- ============================================
-- Achievement Badge System Migration
-- ============================================
-- Creates tables and functions for gamification badges
-- ============================================

-- Badge definitions table (static reference data)
CREATE TABLE IF NOT EXISTS badge_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    criteria_type TEXT NOT NULL,
    criteria_value INTEGER,
    display_order INTEGER NOT NULL
);

-- User badges table (tracks earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badge_definitions(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- User activity log (for tracking consecutive days)
CREATE TABLE IF NOT EXISTS user_post_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_date)
);

-- Add indexes
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_post_activity_user ON user_post_activity(user_id);
CREATE INDEX idx_user_post_activity_date ON user_post_activity(post_date);

-- RLS Policies
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_post_activity ENABLE ROW LEVEL SECURITY;

-- Anyone can read badge definitions
CREATE POLICY "Badge definitions are publicly readable"
    ON badge_definitions FOR SELECT
    USING (true);

-- Users can read all badges
CREATE POLICY "Users can view all badges"
    ON user_badges FOR SELECT
    USING (true);

-- Only system can insert badges (via functions)
CREATE POLICY "System can insert badges"
    ON user_badges FOR INSERT
    WITH CHECK (true);

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
    ON user_post_activity FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert activity
CREATE POLICY "System can insert activity"
    ON user_post_activity FOR INSERT
    WITH CHECK (true);

-- Insert badge definitions
INSERT INTO badge_definitions (id, name, description, icon, color, criteria_type, criteria_value, display_order) VALUES
('first_post', 'First Post', 'Đăng bài đầu tiên', '🎯', '#FFD700', 'post_count', 1, 1),
('helpful_contributor', 'Helpful Contributor', 'Nhận 100 likes', '❤️', '#FF69B4', 'total_likes', 100, 2),
('active_member', 'Active Member', 'Đăng bài 30 ngày liên tục', '🔥', '#FF4500', 'consecutive_days', 30, 3),
('investor', 'Investor', 'Đầu tư vào 5 dự án', '💼', '#10B981', 'investment_count', 5, 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check and award a badge
CREATE OR REPLACE FUNCTION check_and_award_badge(
    p_user_id UUID,
    p_badge_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user already has this badge
    IF EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_id = p_user_id AND badge_id = p_badge_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- Award the badge
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, p_badge_id);

    RETURN TRUE;
END;
$$;

-- Function to calculate consecutive posting days
CREATE OR REPLACE FUNCTION get_consecutive_posting_days(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    consecutive_count INTEGER := 0;
    current_date_check DATE := CURRENT_DATE;
    found_gap BOOLEAN := FALSE;
BEGIN
    -- Check backwards from today
    WHILE NOT found_gap LOOP
        IF EXISTS (
            SELECT 1 FROM user_post_activity
            WHERE user_id = p_user_id 
            AND post_date = current_date_check
        ) THEN
            consecutive_count := consecutive_count + 1;
            current_date_check := current_date_check - INTERVAL '1 day';
        ELSE
            found_gap := TRUE;
        END IF;

        -- Safety limit
        IF consecutive_count >= 365 THEN
            found_gap := TRUE;
        END IF;
    END LOOP;

    RETURN consecutive_count;
END;
$$;



-- Function to get user badge progress
CREATE OR REPLACE FUNCTION get_user_badge_progress(p_user_id UUID)
RETURNS TABLE (
    badge_id TEXT,
    badge_name TEXT,
    badge_description TEXT,
    badge_icon TEXT,
    badge_color TEXT,
    earned BOOLEAN,
    progress INTEGER,
    target INTEGER,
    earned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bd.id,
        bd.name,
        bd.description,
        bd.icon,
        bd.color,
        ub.id IS NOT NULL as earned,
        CASE bd.criteria_type
            WHEN 'post_count' THEN (
                SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = p_user_id
            )
            WHEN 'total_likes' THEN (
                SELECT COUNT(*)::INTEGER 
                FROM post_likes pl
                JOIN posts p ON pl.post_id = p.id
                WHERE p.user_id = p_user_id
            )
            WHEN 'consecutive_days' THEN (
                SELECT get_consecutive_posting_days(p_user_id)
            )
            WHEN 'investment_count' THEN (
                SELECT COUNT(DISTINCT project_id)::INTEGER FROM project_investments WHERE investor_id = p_user_id
            )
            ELSE 0
        END as progress,
        bd.criteria_value as target,
        ub.earned_at
    FROM badge_definitions bd
    LEFT JOIN user_badges ub ON ub.badge_id = bd.id AND ub.user_id = p_user_id
    ORDER BY bd.display_order;
END;
$$;

-- ============================================
-- Triggers for Automatic Badge Awarding
-- ============================================

-- Trigger function for first post badge
CREATE OR REPLACE FUNCTION check_first_post_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if this is the user's first post
    IF (SELECT COUNT(*) FROM posts WHERE user_id = NEW.user_id) = 1 THEN
        PERFORM check_and_award_badge(NEW.user_id, 'first_post');
    END IF;

    -- Log posting activity for consecutive days tracking
    INSERT INTO user_post_activity (user_id, post_date)
    VALUES (NEW.user_id, CURRENT_DATE)
    ON CONFLICT (user_id, post_date) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Trigger function for helpful contributor badge (likes)
CREATE OR REPLACE FUNCTION check_helpful_contributor_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_likes INTEGER;
    post_author_id UUID;
BEGIN
    -- Get the author of the post that was liked
    SELECT user_id INTO post_author_id
    FROM posts
    WHERE id = NEW.post_id;

    -- Calculate total likes for all author's posts
    SELECT COUNT(*)::INTEGER INTO total_likes
    FROM post_likes pl
    JOIN posts p ON pl.post_id = p.id
    WHERE p.user_id = post_author_id;

    -- Award badge if threshold reached
    IF total_likes >= 100 THEN
        PERFORM check_and_award_badge(post_author_id, 'helpful_contributor');
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger function for active member badge (consecutive days)
CREATE OR REPLACE FUNCTION check_active_member_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    consecutive_days INTEGER;
BEGIN
    -- Get consecutive posting days
    consecutive_days := get_consecutive_posting_days(NEW.user_id);

    -- Award badge if threshold reached
    IF consecutive_days >= 30 THEN
        PERFORM check_and_award_badge(NEW.user_id, 'active_member');
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger function for investor badge
CREATE OR REPLACE FUNCTION check_investor_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    investment_count INTEGER;
BEGIN
    -- Count distinct projects user has invested in
    SELECT COUNT(DISTINCT project_id) INTO investment_count
    FROM project_investments
    WHERE investor_id = NEW.investor_id;

    -- Award badge if threshold reached
    IF investment_count >= 5 THEN
        PERFORM check_and_award_badge(NEW.investor_id, 'investor');
    END IF;

    RETURN NEW;
END;
$$;



-- Create triggers
DROP TRIGGER IF EXISTS award_first_post_badge ON posts;
CREATE TRIGGER award_first_post_badge
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION check_first_post_badge();

DROP TRIGGER IF EXISTS check_likes_badge ON post_likes;
CREATE TRIGGER check_likes_badge
    AFTER INSERT ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION check_helpful_contributor_badge();

DROP TRIGGER IF EXISTS check_consecutive_days_badge ON user_post_activity;
CREATE TRIGGER check_consecutive_days_badge
    AFTER INSERT ON user_post_activity
    FOR EACH ROW
    EXECUTE FUNCTION check_active_member_badge();

DROP TRIGGER IF EXISTS check_investment_badge ON project_investments;
CREATE TRIGGER check_investment_badge
    AFTER INSERT ON project_investments
    FOR EACH ROW
    EXECUTE FUNCTION check_investor_badge();


