-- ============================================
-- Add Approval Notification Types
-- ============================================
-- Extends the notifications.type CHECK constraint to include approval types
-- ============================================

-- Drop the existing CHECK constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new CHECK constraint with approval types
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'POST_LIKE',
    'POST_COMMENT',
    'COMMENT_REPLY',
    'POST_SHARE',
    'PROJECT_INVESTMENT',
    'PROJECT_RATING',
    'PRODUCT_VIEW_MILESTONE',
    'FOLLOW',
    'MENTION',
    'POST_APPROVED',
    'PRODUCT_APPROVED',
    'PROJECT_APPROVED'
));
