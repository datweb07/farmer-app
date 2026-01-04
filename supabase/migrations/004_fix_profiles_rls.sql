-- ============================================
-- Fix: Allow public viewing of profiles
-- ============================================
-- Problem: Currently users can only view their own profile
-- Solution: Add policy to allow everyone to view basic profile info (username, avatar)
-- This is needed so comments can display usernames correctly

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Add new policy: Everyone can view all profiles (basic info)
-- This is safe because profiles doesn't contain sensitive data
-- Only username, avatar_url, points, etc which should be public
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Keep existing UPDATE policy (users can only update their own profile)
-- Keep existing INSERT policy (users can only insert their own profile)
