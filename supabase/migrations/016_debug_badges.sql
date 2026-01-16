-- Debug và test badge system
-- Chạy các câu SQL này trong Supabase SQL Editor để kiểm tra

-- 1. Check xem triggers đã được tạo chưa
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%badge%'
ORDER BY trigger_name;

-- 2. Check xem functions đã tồn tại chưa
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%badge%'
ORDER BY routine_name;

-- 3. Manually test First Post badge cho user hiện tại
-- Thay YOUR_USER_ID bằng user ID của bạn
DO $$
DECLARE
    v_user_id UUID := 'YOUR_USER_ID'; -- Thay bằng ID thực
    v_post_count INTEGER;
BEGIN
    -- Count posts
    SELECT COUNT(*) INTO v_post_count
    FROM posts
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'User has % posts', v_post_count;
    
    -- Try to award badge
    IF v_post_count >= 1 THEN
        PERFORM check_and_award_badge(v_user_id, 'first_post');
        RAISE NOTICE 'Attempted to award First Post badge';
    END IF;
END $$;

-- 4. Check badge progress
SELECT * FROM get_user_badge_progress('YOUR_USER_ID');

-- 5. Check awarded badges
SELECT 
    ub.*,
    bd.name
FROM user_badges ub
JOIN badge_definitions bd ON ub.badge_id = bd.id
WHERE ub.user_id = 'YOUR_USER_ID';
