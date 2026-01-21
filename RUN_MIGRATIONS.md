# Hướng dẫn chạy Migrations và Test Hệ thống Settings

## 1. Chạy Migrations trong Supabase

### Bước 1: Truy cập Supabase SQL Editor

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **SQL Editor** (biểu tượng ⚡ bên trái)

### Bước 2: Chạy Migration 024 - Fix Products Views Count

```sql
-- Copy toàn bộ nội dung file: supabase/migrations/024_fix_products_views_count.sql
-- Paste vào SQL Editor và click "Run"
```

✅ **Kết quả mong đợi**:

- Function `get_products_with_stats` được cập nhật
- Column `views_count` hiển thị đúng

### Bước 3: Chạy Migration 025 - Follow System

```sql
-- Copy toàn bộ nội dung file: supabase/migrations/025_follow_system.sql
-- Paste vào SQL Editor và click "Run"
```

✅ **Kết quả mong đợi**:

- Tables created: `user_follows`, `project_follows`
- RLS policies applied
- Functions created:
  - `get_user_follow_stats`
  - `get_user_followers`
  - `get_user_following`
  - `get_following_feed`
  - `notify_new_follower`
  - `notify_project_followers_on_update`

### Bước 4: Chạy Migration 026 - User Settings

```sql
-- Copy toàn bộ nội dung file: supabase/migrations/026_user_settings.sql
-- Paste vào SQL Editor và click "Run"
```

✅ **Kết quả mong đợi**:

- Table created: `user_settings`
- RLS policies applied (users can only access their own settings)
- Functions created:
  - `get_user_settings` (auto-creates defaults)
  - `update_user_settings` (flexible JSONB updates)
  - `export_user_data` (GDPR compliance)

### Bước 5: Verify Migrations

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_follows', 'project_follows', 'user_settings');

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_user_follow_stats',
  'get_user_settings',
  'update_user_settings',
  'export_user_data'
);
```

## 2. Test Settings System - Checklist

### Test 1: Access Settings Page ✅

- [ ] Login vào ứng dụng
- [ ] Vào **Profile Page**
- [ ] Click nút **"Cài đặt"**
- [ ] Settings Page mở thành công
- [ ] Loading spinner hiển thị rồi dữ liệu load

### Test 2: Preferences Tab ✅

- [ ] Đổi **Ngôn ngữ** từ "Tiếng Việt" sang "English"
- [ ] Verify message "Đã lưu thay đổi" hiển thị
- [ ] Đổi **Giao diện** thành "Tối" hoặc "Sáng"
- [ ] Changes persist khi refresh page

### Test 3: Notifications Tab ✅

**Email Notifications:**

- [ ] Tắt master switch "Bật thông báo email"
- [ ] Verify các toggle con bị disabled
- [ ] Bật lại và toggle từng option (new_follower, post_like, post_comment, project_update)

**Push Notifications:**

- [ ] Tắt master switch "Bật thông báo đẩy"
- [ ] Verify các toggle con bị disabled
- [ ] Bật lại và toggle từng option

### Test 4: Privacy Tab ✅

- [ ] Đổi **Hiển thị hồ sơ** giữa "Công khai" / "Chỉ người theo dõi" / "Riêng tư"
- [ ] Toggle **Hiển thị email** ON/OFF
- [ ] Toggle **Hiển thị số điện thoại** ON/OFF
- [ ] Toggle **Cho phép tin nhắn** ON/OFF
- [ ] Toggle **Hiển thị hoạt động** ON/OFF
- [ ] All changes save successfully

### Test 5: Export Data (GDPR) ✅

- [ ] Click nút **"Xuất dữ liệu"**
- [ ] Button shows "Đang xuất..."
- [ ] File JSON được download tự động
- [ ] Open file và verify có đầy đủ:
  - `profile` (thông tin cá nhân)
  - `settings` (cài đặt hiện tại)
  - `posts` (danh sách bài viết)
  - `comments` (danh sách comment)
  - `products` (sản phẩm đã đăng)
  - `followers` & `following` (danh sách follow)
- [ ] Filename format: `username-data-YYYY-MM-DD.json`

### Test 6: Delete Account (CRITICAL) ⚠️

**🔴 WARNING: Test với test account, không dùng tài khoản thật!**

- [ ] Click nút **"Xóa tài khoản"**
- [ ] Modal confirmation hiển thị
- [ ] Thử nhập sai username → nút "Xóa vĩnh viễn" bị disabled
- [ ] Nhập đúng username → nút enabled
- [ ] Click "Hủy" → modal đóng, không xóa gì
- [ ] Mở lại modal, nhập đúng username
- [ ] Click **"Xóa vĩnh viễn"**
- [ ] Account deleted + auto signed out
- [ ] Redirect về trang login
- [ ] Try login lại với account đó → không thể login

### Test 7: Settings Persistence ✅

- [ ] Thay đổi nhiều settings (language, theme, notifications, privacy)
- [ ] Click "Đăng xuất"
- [ ] Login lại
- [ ] Vào Settings → verify tất cả settings vẫn giữ nguyên

### Test 8: Database Validation ✅

```sql
-- Check your settings record exists
SELECT * FROM user_settings WHERE user_id = 'YOUR_USER_ID';

-- Verify defaults are applied
SELECT
  language,
  theme,
  email_notifications,
  profile_visibility
FROM user_settings
WHERE user_id = 'YOUR_USER_ID';

-- Test export function directly
SELECT export_user_data('YOUR_USER_ID');
```

## 3. Common Issues & Solutions

### Issue 1: Settings không load

**Triệu chứng**: Loading spinner không mất, không có data
**Giải pháp**:

```sql
-- Check RLS policies
SELECT * FROM user_settings WHERE user_id = auth.uid();

-- If empty, manually create default settings
INSERT INTO user_settings (user_id) VALUES (auth.uid());
```

### Issue 2: Update không persist

**Triệu chứng**: Changes không lưu lại sau refresh
**Giải pháp**:

- Check browser console for errors
- Verify RLS policy cho UPDATE operation:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_settings';
```

### Issue 3: Export data trống

**Triệu chứng**: File JSON download nhưng thiếu data
**Giải pháp**:

```sql
-- Test each part of export separately
SELECT
  (SELECT row_to_json(p) FROM profiles p WHERE id = auth.uid()) as profile,
  (SELECT json_agg(us) FROM user_settings us WHERE user_id = auth.uid()) as settings,
  (SELECT json_agg(cp) FROM community_posts cp WHERE author_id = auth.uid()) as posts;
```

### Issue 4: Delete account không hoạt động

**Triệu chứng**: Error khi xóa hoặc không redirect
**Giải pháp**:

- Check cascade delete constraints
- Verify user has permission to delete own profile:

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'DELETE';
```

## 4. Success Criteria

✅ **Migrations thành công khi**:

- Tất cả 3 migrations chạy không lỗi
- Tables & functions tồn tại trong database
- RLS policies active

✅ **Settings system thành công khi**:

- Tất cả 8 test cases pass
- Settings persist sau login/logout
- Export data hoạt động
- Delete account cascade đúng

## 5. Next Steps

Sau khi test xong:

1. ✅ Verify follow system vẫn hoạt động (không bị ảnh hưởng)
2. ✅ Test notification settings thực tế (follow user và check email)
3. ✅ Test profile visibility (xem profile từ tài khoản khác)
4. 📝 Document user-facing features cho end users
5. 🚀 Deploy to production

---

**📅 Thực hiện**: January 21, 2026  
**🔧 Status**: Ready for testing  
**⚡ Priority**: HIGH - Settings system hoàn chỉnh hệ thống GDPR compliance
