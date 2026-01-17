-- ============================================
-- Fix Admin Actions Constraint
-- ============================================
-- Add missing action types for post/product moderation
-- ============================================

-- Drop old constraint
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_action_type_check;

-- Add new constraint with all action types
ALTER TABLE admin_actions 
ADD CONSTRAINT admin_actions_action_type_check 
CHECK (action_type IN (
    'ban_user', 
    'unban_user', 
    'delete_post', 
    'delete_product', 
    'delete_project', 
    'delete_comment',
    'approve_post',    -- New: approve posts
    'reject_post',     -- New: reject posts
    'approve_product', -- New: approve products
    'reject_product',  -- New: reject products
    'approve_project', 
    'reject_project',
    'change_role', 
    'resolve_report'
));

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
