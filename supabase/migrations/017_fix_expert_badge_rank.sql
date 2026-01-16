-- ============================================
-- Fix Expert Badge Rank Calculation
-- ============================================
-- Fix get_user_leaderboard_rank to use dynamic points calculation
-- instead of static profiles.points column
-- ============================================

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    user_rank INTEGER;
BEGIN
    -- Calculate rank based on dynamic points (not static profiles.points)
    SELECT rank INTO user_rank
    FROM (
        SELECT 
            id,
            RANK() OVER (ORDER BY calculate_user_points(id) DESC) as rank
        FROM profiles
        WHERE calculate_user_points(id) > 0  -- Only include users with actual points
    ) ranked
    WHERE id = p_user_id;

    -- If user has 0 points or doesn't exist, return a very high rank
    RETURN COALESCE(user_rank, 0);
END;
$$;

-- Update the expert badge trigger to be more strict
CREATE OR REPLACE FUNCTION check_expert_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_rank INTEGER;
    calculated_points INTEGER;
BEGIN
    -- Calculate user's actual points (dynamic calculation)
    calculated_points := calculate_user_points(NEW.id);
    
    -- Only check if user has meaningful points (at least 100 points)
    IF calculated_points >= 100 THEN
        -- Get user's leaderboard rank (using dynamic points now)
        user_rank := get_user_leaderboard_rank(NEW.id);

        -- Award badge if in top 10 AND has at least 100 points
        IF user_rank IS NOT NULL AND user_rank <= 10 THEN
            PERFORM check_and_award_badge(NEW.id, 'expert');
        END IF;
    ELSE
        -- Remove expert badge if user no longer qualifies
        DELETE FROM user_badges
        WHERE user_id = NEW.id AND badge_id = 'expert';
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- Cleanup: Remove incorrectly awarded Expert badges
-- ============================================

-- Remove Expert badges from users with less than 100 calculated points
DELETE FROM user_badges
WHERE badge_id = 'expert'
AND user_id IN (
    SELECT id 
    FROM profiles 
    WHERE calculate_user_points(id) < 100
);

-- Remove Expert badges from users not in top 10
DELETE FROM user_badges ub
WHERE ub.badge_id = 'expert'
AND ub.user_id NOT IN (
    SELECT id
    FROM (
        SELECT 
            id,
            RANK() OVER (ORDER BY calculate_user_points(id) DESC) as rank
        FROM profiles
        WHERE calculate_user_points(id) >= 100
    ) ranked
    WHERE rank <= 10
);

-- Verification query (run this to check results)
-- SELECT 
--     p.id,
--     p.username,
--     calculate_user_points(p.id) as calculated_points,
--     RANK() OVER (ORDER BY calculate_user_points(p.id) DESC) as rank,
--     EXISTS(SELECT 1 FROM user_badges WHERE user_id = p.id AND badge_id = 'expert') as has_expert_badge
-- FROM profiles p
-- ORDER BY calculated_points DESC
-- LIMIT 20;
