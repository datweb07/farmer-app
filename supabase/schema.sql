-- ============================================
-- Supabase Authentication System - Database Schema
-- ============================================
-- This schema provides a complete authentication system with:
-- - User profiles with unique usernames
-- - Organizations for future expansion
-- - Row Level Security (RLS) policies
-- - Automatic profile creation on signup
-- ============================================

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================
-- Stores organization data for users with 'organization' role
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  phone_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster organization lookups
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);

-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone authenticated can read organizations
CREATE POLICY "Organizations are viewable by authenticated users"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only organization members can update their organization
-- (This will be expanded later when we add organization membership)
CREATE POLICY "Organizations are updatable by members"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. PROFILES TABLE
-- ============================================
-- Stores user profile data linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'organization')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT phone_format CHECK (phone_number IS NULL OR phone_number ~ '^\+?[0-9]{10,15}$')
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================
-- This trigger automatically creates a profile row when a user signs up
-- The username will be extracted from the email (username@example.com)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile for the new user
  -- Username is extracted from email (everything before @)
  INSERT INTO public.profiles (id, username, phone_number, role)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1), -- Extract username from email
    NEW.raw_user_meta_data->>'phone_number', -- Get phone from metadata
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer') -- Default to farmer
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (for re-running this script)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. UPDATED_AT TRIGGER
-- ============================================
-- Automatically update updated_at timestamp when rows are modified

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to profiles
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger to organizations
DROP TRIGGER IF EXISTS set_updated_at_organizations ON public.organizations;
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = check_username
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- To use this schema:
-- 1. Copy this entire file
-- 2. Go to your Supabase project dashboard
-- 3. Navigate to SQL Editor
-- 4. Paste and run this script
-- 5. Verify tables, policies, and triggers are created
-- ============================================
