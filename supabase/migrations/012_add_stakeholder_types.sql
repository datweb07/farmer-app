-- ============================================
-- Migration 012: Add Stakeholder Types Support
-- ============================================
-- Adds user_type field to project_investments table
-- to track whether investor is a farmer or business
-- Makes email optional for farmers but required for businesses
-- ============================================

-- Add user_type column to project_investments
ALTER TABLE project_investments 
ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('farmer', 'business'));

-- Update existing records to default to 'farmer' for backward compatibility
UPDATE project_investments 
SET user_type = 'farmer' 
WHERE user_type IS NULL;

-- Make user_type NOT NULL after setting defaults
ALTER TABLE project_investments 
ALTER COLUMN user_type SET NOT NULL;

-- Make email optional (it will be conditionally required in application logic)
-- Check if the NOT NULL constraint exists and drop it
ALTER TABLE project_investments 
ALTER COLUMN investor_email DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN project_investments.user_type IS 'Type of investor: farmer (email optional) or business (email required)';
COMMENT ON COLUMN project_investments.investor_email IS 'Email is optional for farmers, required for businesses';
