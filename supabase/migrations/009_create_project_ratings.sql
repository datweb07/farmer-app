-- ============================================
-- Project Ratings Migration
-- ============================================
-- Create ratings table, RLS policies, and functions for project rating system
-- ============================================

-- Create project_ratings table
CREATE TABLE IF NOT EXISTS public.project_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.investment_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id) -- One rating per user per project
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_ratings_project ON project_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ratings_user ON project_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_project_ratings_rating ON project_ratings(rating);

-- Enable RLS
ALTER TABLE project_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public to view ratings" ON project_ratings;
DROP POLICY IF EXISTS "Allow investors to rate projects" ON project_ratings;
DROP POLICY IF EXISTS "Allow users to update own ratings" ON project_ratings;

-- Policy: Anyone can view ratings
CREATE POLICY "Allow public to view ratings"
ON project_ratings FOR SELECT 
TO public 
USING (true);

-- Policy: Only investors can rate (must have confirmed investment in project)
CREATE POLICY "Allow investors to rate projects"
ON project_ratings FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM project_investments
        WHERE project_id = project_ratings.project_id
        AND investor_id = auth.uid()
        AND status = 'confirmed'
    )
);

-- Policy: Users can update their own ratings
CREATE POLICY "Allow users to update own ratings"
ON project_ratings FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Function to get project rating statistics
CREATE OR REPLACE FUNCTION get_project_rating_stats(p_project_id UUID)
RETURNS TABLE (
    avg_rating NUMERIC,
    total_ratings BIGINT,
    rating_score NUMERIC
) AS $$
DECLARE
    v_avg_rating NUMERIC;
    v_total_ratings BIGINT;
    v_funding_progress NUMERIC;
    v_score NUMERIC;
BEGIN
    -- Get average rating and total count
    SELECT 
        COALESCE(AVG(rating), 0)::NUMERIC,
        COUNT(*)::BIGINT
    INTO v_avg_rating, v_total_ratings
    FROM project_ratings
    WHERE project_id = p_project_id;

    -- Get funding progress (0 to 1)
    SELECT 
        CASE 
            WHEN funding_goal > 0 THEN 
                LEAST(current_funding::NUMERIC / funding_goal::NUMERIC, 1.0)
            ELSE 0
        END
    INTO v_funding_progress
    FROM investment_projects
    WHERE id = p_project_id;

    -- Calculate score: (AvgStar * 0.6) + (log10(TotalRatings + 1) * 0.2) + (FundingProgress * 0.2)
    -- Note: PostgreSQL uses log() for base 10 logarithm
    v_score := (
        (v_avg_rating / 5.0 * 0.6) + 
        (LOG(v_total_ratings + 1) * 0.2) + 
        (v_funding_progress * 0.2)
    );

    RETURN QUERY SELECT v_avg_rating, v_total_ratings, v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get project leaderboard
CREATE OR REPLACE FUNCTION get_project_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    project_id UUID,
    title TEXT,
    image_url TEXT,
    avg_rating NUMERIC,
    total_ratings BIGINT,
    rating_score NUMERIC,
    funding_progress NUMERIC,
    current_funding BIGINT,
    funding_goal BIGINT,
    creator_username TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.image_url,
        stats.avg_rating,
        stats.total_ratings,
        stats.rating_score,
        CASE 
            WHEN p.funding_goal > 0 THEN 
                LEAST(p.current_funding::NUMERIC / p.funding_goal::NUMERIC * 100, 100)
            ELSE 0
        END as funding_progress,
        p.current_funding,
        p.funding_goal,
        u.username
    FROM investment_projects p
    LEFT JOIN profiles u ON p.user_id = u.id
    CROSS JOIN LATERAL get_project_rating_stats(p.id) as stats
    WHERE p.status = 'active'
    ORDER BY stats.rating_score DESC, stats.total_ratings DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update updated_at on rating changes (if not already exists)
CREATE OR REPLACE FUNCTION update_project_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_ratings_updated_at_trigger ON project_ratings;
CREATE TRIGGER update_project_ratings_updated_at_trigger
    BEFORE UPDATE ON project_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_project_ratings_updated_at();
