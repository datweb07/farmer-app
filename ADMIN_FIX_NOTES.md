# Admin System Fixes

## Các vấn đề đã được sửa:

### 1. ✅ Lỗi hiển thị điểm user (tất cả user hiển thị 0 điểm)

**Nguyên nhân:**

- Table `profiles` không có column `points` cố định
- Điểm được tính động thông qua function `calculate_user_points()`
- Migration 019 ban đầu query `p.points` trực tiếp → null/0

**Giải pháp:**

- Đã sửa function `get_users_admin()` trong migration 019
- Thay `p.points` → `COALESCE(calculate_user_points(p.id), 0)`
- Giờ sẽ tính điểm động dựa trên hoạt động thực tế của user

**File đã sửa:**

- `supabase/migrations/019_admin_system.sql` (dòng 277)

---

### 2. ✅ Chức năng ban/unban user

**Tình trạng:**

- Function `admin_ban_user()` đã được implement đầy đủ trong migration
- Service layer `banUser()` gọi RPC function đúng cách
- UI component `UserManagement.tsx` có flow xử lý ban/unban

**Chi tiết implementation:**

#### Database (RPC Function):

```sql
-- Function: admin_ban_user(target_user_id, ban_status, ban_reason)
-- Cập nhật: is_banned, banned_reason, banned_at, banned_by
-- Ghi log vào: admin_actions table
```

#### Service Layer:

```typescript
export async function banUser(request: BanUserRequest): Promise<{
  success: boolean;
  error?: string;
}>;
```

#### UI Component:

```typescript
const handleBan = async (userId: string, currentlyBanned: boolean) => {
  // Prompt lý do
  // Gọi banUser() service
  // Reload danh sách users
  // Hiển thị thông báo
};
```

**Để test chức năng:**

1. Chạy migration 019 trong Supabase SQL Editor
2. Grant quyền admin cho tài khoản test
3. Login vào admin dashboard
4. Thử ban/unban một user
5. Kiểm tra:
   - User có bị khóa trong DB không
   - Log có được ghi vào `admin_actions` không
   - User có thể login hay không sau khi bị ban

---

## Yêu cầu để hệ thống hoạt động:

### 1. Chạy Migration

```sql
-- File: supabase/migrations/019_admin_system.sql
-- Chạy toàn bộ file trong Supabase SQL Editor
```

### 2. Grant quyền admin cho user

```sql
UPDATE profiles
SET is_admin = TRUE
WHERE username = 'your_username';
```

### 3. Các dependencies cần có:

- ✅ Function `calculate_user_points()` (đã có trong community_schema.sql)
- ✅ Table `profiles` với các column cơ bản
- ✅ Table `posts`, `products`, `investment_projects`
- ✅ Authentication đã setup

---

## Các tính năng admin đã hoàn chỉnh:

### User Management ✅

- [x] Xem danh sách users với filter
- [x] Tìm kiếm user theo username
- [x] Ban/unban user với lý do
- [x] Thay đổi role user (farmer/business)
- [x] Grant/revoke quyền admin
- [x] Hiển thị điểm động (đã fix)
- [x] Hiển thị số posts/products của user

### Content Moderation ✅

- [x] Duyệt posts (approve/reject)
- [x] Duyệt products (approve/reject)
- [x] Duyệt investment projects (approve/reject)
- [x] Xóa nội dung vi phạm
- [x] Thêm ghi chú moderation

### Reports Management ✅

- [x] Xem báo cáo từ users
- [x] Resolve/dismiss reports
- [x] Thêm ghi chú giải quyết
- [x] Filter theo trạng thái

### Admin Logs ✅

- [x] Xem lịch sử hành động admin
- [x] Filter theo loại hành động
- [x] Xem metadata chi tiết

### Statistics Dashboard ✅

- [x] Tổng số users/posts/products/projects
- [x] Số lượng pending moderation
- [x] Số lượng reports chờ xử lý
- [x] Tổng investment amount
- [x] Alert cho items cần xử lý

---

## Security Features:

### RLS Policies ✅

- Chỉ admin mới xem được content_reports
- Chỉ admin mới xem được admin_actions
- Users có thể tạo reports
- Users có thể xem reports của mình

### Authorization Checks ✅

- Tất cả RPC functions check `is_admin = TRUE`
- Frontend có check admin status trước khi render
- Service layer có error handling

---

## Testing Checklist:

### Ban/Unban User

- [ ] Ban user thành công
- [ ] Unban user thành công
- [ ] Log được ghi vào admin_actions
- [ ] Hiển thị lý do ban trong user list
- [ ] User bị ban không login được (cần test)

### User Points Display

- [ ] Điểm hiển thị đúng theo hoạt động
- [ ] User có posts có điểm cao hơn
- [ ] User có likes nhận được có điểm cao hơn
- [ ] User mới có điểm = 0

### Content Moderation

- [ ] Approve post thành công
- [ ] Reject post thành công
- [ ] Delete post thành công
- [ ] Log được ghi đúng

---

## Next Steps:

1. **Immediate** - Chạy migration 019 (version mới đã fix)
2. **Test** - Test ban/unban và points display
3. **Optional** - Thêm middleware để block banned users khỏi login
4. **Enhancement** - Thêm bulk actions (ban nhiều users cùng lúc)
5. **Enhancement** - Thêm email notification khi user bị ban

---

## Potential Issues & Solutions:

### Issue: "Unauthorized: Admin access required"

**Solution:**

```sql
UPDATE profiles SET is_admin = TRUE WHERE username = 'your_username';
```

### Issue: Points vẫn hiển thị 0

**Solution:**

- Đảm bảo function `calculate_user_points()` tồn tại
- Chạy lại migration 019 (version mới)
- Check user có posts/likes không

### Issue: Ban user không hoạt động

**✅ ĐÃ SỬA (2024-01-17):**

1. **Thêm check `is_banned` trong `signIn()`** (auth.service.ts)
   - Sau khi login thành công, kiểm tra profile.is_banned
   - Nếu bị ban → force signOut() và hiển thị lý do

2. **Thêm check `is_banned` trong `fetchProfile()`** (AuthContext.tsx)
   - Kiểm tra mỗi khi fetch profile
   - Nếu bị ban → force signOut(), clear state, hiển thị alert

3. **Cập nhật database types** (database.types.ts)
   - Thêm is_banned, banned_reason, banned_at, banned_by vào UserProfile type

**Flow hoạt động:**

- User login → Check is_banned → Reject nếu banned
- User đang online → Admin ban → fetchProfile detect → Force logout
- User bị ban thấy message: "Tài khoản của bạn đã bị khóa. Lý do: [reason]"

**Cần làm để test:**

- Chạy migration 019 trong Supabase
- Ban một user từ admin dashboard
- Thử login với user đó → Sẽ bị reject
- Hoặc user đang online → Sẽ bị logout ngay lập tức

---

## Database Changes Summary:

### New Columns in `profiles`:

```sql
- is_admin BOOLEAN DEFAULT FALSE
- is_banned BOOLEAN DEFAULT FALSE
- banned_reason TEXT
- banned_at TIMESTAMPTZ
- banned_by UUID
```

### New Columns in content tables:

```sql
-- posts, products, investment_projects
- moderation_status TEXT ('pending', 'approved', 'rejected')
- moderation_note TEXT
- moderated_by UUID
- moderated_at TIMESTAMPTZ
```

### New Tables:

- `content_reports` - User báo cáo vi phạm
- `admin_actions` - Log hành động admin

### New RPC Functions:

- `get_admin_stats()` - Thống kê tổng quan
- `get_users_admin()` - Danh sách users (đã fix)
- `get_content_for_moderation()` - Content cần duyệt
- `admin_ban_user()` - Ban/unban user
- `admin_moderate_content()` - Duyệt content
- `admin_delete_content()` - Xóa content
- `admin_change_user_role()` - Đổi role user
- `get_content_reports_admin()` - Danh sách reports
