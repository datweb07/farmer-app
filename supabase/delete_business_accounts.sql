-- ============================================
-- SQL Script: Xóa toàn bộ dữ liệu các tài khoản doanh nghiệp
-- ============================================
-- Script này xóa tất cả dữ liệu liên quan đến các tài khoản trong danh sách
-- Bao gồm: profiles, business_customer_links, và các dữ liệu liên quan khác
-- 
-- CẢNH BÁO: Hành động này KHÔNG THỂ HOÀN TÁC!
-- Backup database trước khi chạy script này!
-- ============================================

-- Danh sách số điện thoại của các tài khoản cần xóa
-- chinhnguyen_205: +84384436680
-- doanh_nghiep_a: +84399746612
-- hahiho: +84854059439
-- mufa_user: +84978564734

-- ============================================
-- BƯỚC 1: Lấy danh sách ID của các tài khoản cần xóa
-- ============================================

-- Tạo temp table để lưu IDs
CREATE TEMP TABLE IF NOT EXISTS accounts_to_delete AS
SELECT id, username, phone_number, role, created_at
FROM profiles
WHERE phone_number IN (
  '+84384436680',
  '+84399746612',
  '+84854059439',
  '+84978564734'
);

-- Xem danh sách sẽ bị xóa (để confirm trước khi xóa)
SELECT 
  username,
  phone_number,
  role,
  created_at,
  'Sẽ bị xóa' as status
FROM accounts_to_delete;

-- ============================================
-- BƯỚC 2: Xóa các liên kết khách hàng - doanh nghiệp
-- ============================================

-- Xóa các link khi account là business
DELETE FROM business_customer_links
WHERE business_id IN (SELECT id FROM accounts_to_delete);

-- Xóa các link khi account là customer
DELETE FROM business_customer_links
WHERE customer_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 3: Xóa credit limits (nếu có)
-- ============================================

-- Xóa credit limits nếu account là business
-- DELETE FROM credit_limits
-- WHERE business_id IN (SELECT id FROM accounts_to_delete);

-- Xóa credit limits nếu account là customer
-- DELETE FROM credit_limits
-- WHERE customer_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 4: Xóa các transactions/orders (nếu có bảng)
-- ============================================

-- Xóa orders của customer (bảng chưa tồn tại)
-- DELETE FROM orders
-- WHERE customer_id IN (SELECT id FROM accounts_to_delete);

-- Xóa orders mà business tạo ra (bảng chưa tồn tại)
-- DELETE FROM orders
-- WHERE business_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 5: Xóa products (sản phẩm của business)
-- ============================================

DELETE FROM products
WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 6: Xóa posts (bài viết)
-- ============================================

-- DELETE FROM posts
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 7: Xóa comments
-- ============================================

-- DELETE FROM comments
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 8: Xóa likes
-- ============================================

-- DELETE FROM likes
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 9: Xóa follows (theo dõi)
-- ============================================

-- Xóa khi là follower
-- DELETE FROM follows
-- WHERE follower_id IN (SELECT id FROM accounts_to_delete);

-- Xóa khi là following
-- DELETE FROM follows
-- WHERE following_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 10: Xóa notifications
-- ============================================

-- Xóa thông báo gửi đến account
-- DELETE FROM notifications
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- Xóa thông báo do account tạo ra
-- DELETE FROM notifications
-- WHERE actor_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 11: Xóa achievements/badges
-- ============================================

-- DELETE FROM user_achievements
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 12: Xóa media files (ảnh, video)
-- ============================================

-- DELETE FROM post_media
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- DELETE FROM product_media
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 13: Xóa project ratings (đánh giá dự án)
-- ============================================

-- DELETE FROM project_ratings
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 14: Xóa investments (dự án đầu tư)
-- ============================================

-- DELETE FROM investments
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 15: Xóa payment methods
-- ============================================

-- DELETE FROM payment_methods
-- WHERE user_id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 16: Xóa sessions/tokens (nếu có lưu trong DB)
-- ============================================

-- Supabase Auth tự quản lý sessions, không cần xóa thủ công

-- ============================================
-- BƯỚC 17: Xóa profile
-- ============================================

-- Xóa profiles (CASCADE sẽ xóa trong auth.users)
DELETE FROM profiles
WHERE id IN (SELECT id FROM accounts_to_delete);

-- ============================================
-- BƯỚC 18: Xóa trong auth.users (Supabase Auth)
-- ============================================

-- Lưu ý: Xóa profiles với ON DELETE CASCADE sẽ tự động xóa auth.users
-- Nếu cần xóa thủ công, sử dụng Supabase API hoặc Dashboard

-- ============================================
-- BƯỚC 19: Xóa Storage objects (avatars, files)
-- ============================================

-- Storage bucket 'avatars'
-- Cần sử dụng Supabase Storage API hoặc Dashboard để xóa files
-- Hoặc sử dụng SQL function:

-- DELETE FROM storage.objects
-- WHERE bucket_id = 'avatars' 
-- AND owner IN (SELECT id::text FROM accounts_to_delete);

-- DELETE FROM storage.objects
-- WHERE bucket_id = 'post-images' 
-- AND owner IN (SELECT id::text FROM accounts_to_delete);

-- DELETE FROM storage.objects
-- WHERE bucket_id = 'post-videos' 
-- AND owner IN (SELECT id::text FROM accounts_to_delete);

-- DELETE FROM storage.objects
-- WHERE bucket_id = 'project-attachments' 
-- AND owner IN (SELECT id::text FROM accounts_to_delete);

-- ============================================
-- BƯỚC 20: Cleanup temp table
-- ============================================

DROP TABLE IF EXISTS accounts_to_delete;

-- ============================================
-- KẾT THÚC
-- ============================================

-- Xem kết quả sau khi xóa
SELECT 
  COUNT(*) as remaining_accounts,
  'Số tài khoản còn lại trong hệ thống' as description
FROM profiles;

-- Verify các account đã bị xóa
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Đã xóa thành công tất cả accounts'
    ELSE '❌ Vẫn còn ' || COUNT(*) || ' accounts chưa xóa'
  END as status
FROM profiles
WHERE phone_number IN (
  '+84384436680',
  '+84399746612',
  '+84854059439',
  '+84978564734'
);

-- ============================================
-- NOTES & WARNINGS
-- ============================================

/*
CÁCH SỬ DỤNG:

1. BACKUP DATABASE TRƯỚC:
   - Vào Supabase Dashboard > Database > Backups
   - Hoặc sử dụng pg_dump để export database

2. CHẠY SCRIPT:
   - Option 1: Copy toàn bộ script vào Supabase SQL Editor và chạy
   - Option 2: Chạy từng bước để kiểm soát tốt hơn
   - Option 3: Sử dụng psql hoặc database client

3. XÓA STORAGE FILES:
   - Vào Supabase Dashboard > Storage
   - Tìm files thuộc các accounts (theo user_id)
   - Xóa thủ công hoặc dùng Storage API

4. XÓA AUTH USERS (nếu profiles không CASCADE):
   - Vào Supabase Dashboard > Authentication > Users
   - Tìm users theo email/phone
   - Click "Delete User"
   - Hoặc dùng Admin API: supabase.auth.admin.deleteUser(userId)

QUAN TRỌNG:
- Script này xóa VĨNH VIỄN, không thể UNDO!
- Kiểm tra kỹ danh sách accounts_to_delete trước khi xóa
- Có thể comment out các bước không cần thiết
- Một số bảng có thể không tồn tại tùy vào schema thực tế của bạn
- Điều chỉnh script theo cấu trúc database của bạn

CÁC BẢNG CÓ THỂ BỊ ẢNH HƯỞNG:
✅ business_customer_links - Liên kết doanh nghiệp-khách hàng
✅ credit_limits - Hạn mức tín dụng
✅ orders - Đơn hàng
✅ products - Sản phẩm
✅ posts - Bài viết
✅ comments - Bình luận
✅ likes - Lượt thích
✅ follows - Theo dõi
✅ notifications - Thông báo
✅ user_achievements - Huy hiệu
✅ post_media - Media files
✅ project_ratings - Đánh giá dự án
✅ investments - Dự án đầu tư
✅ payment_methods - Phương thức thanh toán
✅ profiles - Thông tin profile
✅ auth.users - Supabase Auth users
✅ storage.objects - Files trong Storage

ALTERNATIVE: Soft Delete (Đề xuất thay vì hard delete)
Thay vì xóa hẳn, có thể:
1. Set is_deleted = true
2. Set is_banned = true
3. Anonymize data (set username = 'deleted_user', phone = null)
4. Giữ lại data cho analytics/audit trail

*/

-- ============================================
-- ROLLBACK PLAN (Nếu cần khôi phục)
-- ============================================

/*
Nếu đã backup database:
1. Restore từ backup point trước khi xóa
2. Hoặc restore specific tables:
   pg_restore -t profiles -t business_customer_links ...

Nếu không backup:
❌ KHÔNG THỂ KHÔI PHỤC - Đây là lý do cần backup!
*/
