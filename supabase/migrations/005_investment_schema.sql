-- ============================================
-- Investment Projects Database Schema
-- ============================================
-- Tables: investment_projects, project_investments, contact_requests
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- INVESTMENT PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.investment_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    funding_goal BIGINT NOT NULL CHECK (funding_goal > 0),
    current_funding BIGINT DEFAULT 0 CHECK (current_funding >= 0),
    farmers_impacted INTEGER DEFAULT 0 CHECK (farmers_impacted >= 0),
    area TEXT NOT NULL, -- e.g., "Vĩnh Long, Đồng Tháp"
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'funded', 'completed', 'cancelled')),
    image_url TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for investment_projects
CREATE INDEX IF NOT EXISTS idx_investment_projects_user_id ON public.investment_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_projects_status ON public.investment_projects(status);
CREATE INDEX IF NOT EXISTS idx_investment_projects_created_at ON public.investment_projects(created_at DESC);

-- ============================================
-- PROJECT INVESTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.investment_projects(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount > 0),
    investor_name TEXT NOT NULL,
    investor_email TEXT NOT NULL,
    investor_phone TEXT,
    message TEXT, -- Optional message from investor
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for project_investments
CREATE INDEX IF NOT EXISTS idx_project_investments_project_id ON public.project_investments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_investments_investor_id ON public.project_investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_project_investments_created_at ON public.project_investments(created_at DESC);

-- ============================================
-- CONTACT REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.contact_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    partnership_type TEXT NOT NULL CHECK (partnership_type IN ('investor', 'business', 'research', 'other')),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for contact_requests
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_partnership_type ON public.contact_requests(partnership_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.investment_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Investment Projects policies
CREATE POLICY "Investment projects are viewable by everyone" ON public.investment_projects
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create projects" ON public.investment_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.investment_projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.investment_projects
    FOR DELETE USING (auth.uid() = user_id);

-- Project Investments policies
CREATE POLICY "Investments are viewable by project owners and investors" ON public.project_investments
    FOR SELECT USING (
        auth.uid() = investor_id OR
        auth.uid() IN (SELECT user_id FROM public.investment_projects WHERE id = project_id)
    );

CREATE POLICY "Authenticated users can invest" ON public.project_investments
    FOR INSERT WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Investors can update their own investments" ON public.project_investments
    FOR UPDATE USING (auth.uid() = investor_id);

-- Contact Requests policies  
CREATE POLICY "Anyone can create contact requests" ON public.contact_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view contact requests" ON public.contact_requests
    FOR SELECT USING (false); -- Will be updated when admin role is implemented

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_investment_projects_updated_at BEFORE UPDATE ON public.investment_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_investments_updated_at BEFORE UPDATE ON public.project_investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_requests_updated_at BEFORE UPDATE ON public.contact_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update current_funding when investment is added
CREATE OR REPLACE FUNCTION update_project_funding()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status != 'confirmed') THEN
        UPDATE public.investment_projects
        SET current_funding = current_funding + NEW.amount
        WHERE id = NEW.project_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
        UPDATE public.investment_projects
        SET current_funding = current_funding - OLD.amount
        WHERE id = OLD.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_funding_on_investment_change
    AFTER INSERT OR UPDATE ON public.project_investments
    FOR EACH ROW EXECUTE FUNCTION update_project_funding();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get investment projects with stats
CREATE OR REPLACE FUNCTION get_investment_projects_with_stats(
    status_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    description TEXT,
    funding_goal BIGINT,
    current_funding BIGINT,
    farmers_impacted INTEGER,
    area TEXT,
    status TEXT,
    image_url TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    creator_username TEXT,
    investors_count BIGINT,
    progress_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.funding_goal,
        p.current_funding,
        p.farmers_impacted,
        p.area,
        p.status,
        p.image_url,
        p.start_date,
        p.end_date,
        p.created_at,
        p.updated_at,
        pr.username AS creator_username,
        COUNT(DISTINCT i.id) AS investors_count,
        ROUND((p.current_funding::NUMERIC / p.funding_goal::NUMERIC * 100), 2) AS progress_percentage
    FROM public.investment_projects p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    LEFT JOIN public.project_investments i ON p.id = i.project_id AND i.status = 'confirmed'
    WHERE (status_filter IS NULL OR p.status = status_filter)
    GROUP BY p.id, pr.username
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
