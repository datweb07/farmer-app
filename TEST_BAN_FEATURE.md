# Test Ban/Unban User Feature

## Chuẩn bị

### 1. Chạy Migration 019

```sql
-- Mở file: supabase/migrations/019_admin_system.sql
-- Copy toàn bộ nội dung
-- Paste vào Supabase SQL Editor
-- Click "Run"
```

### 2. Tạo Admin Account

```sql
-- Trong Supabase SQL Editor:
UPDATE profiles
SET is_admin = TRUE
WHERE username = 'your_admin_username';
```

### 3. Tạo Test User

- Đăng ký account mới với username: `testuser`
- Hoặc dùng account có sẵn (không phải admin)

---

## Test Cases

### ✅ Test 1: Ban User Đang Offline

**Steps:**

1. Login với admin account
2. Vào Admin Dashboard (click icon Shield)
3. Tab "Quản lý Users"
4. Tìm user `testuser`
5. Click nút "Khóa" (Ban icon)
6. Nhập lý do: "Vi phạm quy định cộng đồng"
7. Confirm

**Expected:**

- ✅ User status chuyển sang "Đã khóa"
- ✅ Hiển thị lý do khóa
- ✅ Ghi log vào admin_actions table

**Verify Database:**

```sql
-- Check user bị ban
SELECT username, is_banned, banned_reason, banned_at
FROM profiles
WHERE username = 'testuser';

-- Check admin log
SELECT * FROM admin_actions
WHERE action_type = 'ban_user'
ORDER BY created_at DESC
LIMIT 1;
```

---

### ✅ Test 2: User Bị Ban Không Login Được

**Steps:**

1. Logout khỏi admin account
2. Thử login với `testuser` (account vừa bị ban)

**Expected:**

- ✅ Login THẤT BẠI
- ✅ Hiển thị message: "Tài khoản của bạn đã bị khóa. Lý do: Vi phạm quy định cộng đồng"
- ✅ Không được vào hệ thống

**Code xử lý:**

- File: `src/lib/auth/auth.service.ts`
- Function: `signIn()` line ~205
- Check `profile.is_banned` sau khi fetch profile

---

### ✅ Test 3: User Đang Online Bị Ban → Force Logout

**Steps:**

1. Login với `testuser` ở tab 1
2. Ở tab 2, login với admin account
3. Từ admin dashboard, ban user `testuser`
4. Quay lại tab 1 (testuser đang online)
5. Refresh page hoặc chuyển route

**Expected:**

- ✅ `testuser` bị force logout ngay lập tức
- ✅ Hiển thị alert: "Tài khoản của bạn đã bị khóa. Lý do: ..."
- ✅ Redirect về trang login

**Code xử lý:**

- File: `src/contexts/AuthContext.tsx`
- Function: `fetchProfile()` line ~121
- Check `is_banned` và gọi `supabase.auth.signOut()`

---

### ✅ Test 4: Unban User

**Steps:**

1. Login với admin account
2. Vào Admin Dashboard → Tab "Quản lý Users"
3. Tìm user `testuser` (đang bị khóa)
4. Click nút "Mở khóa" (Unlock icon)
5. Confirm

**Expected:**

- ✅ User status chuyển về "Hoạt động"
- ✅ Xóa lý do khóa
- ✅ Ghi log vào admin_actions

**Verify Database:**

```sql
-- Check user được unban
SELECT username, is_banned, banned_reason
FROM profiles
WHERE username = 'testuser';
-- is_banned = FALSE, banned_reason = NULL

-- Check admin log
SELECT * FROM admin_actions
WHERE action_type = 'unban_user'
ORDER BY created_at DESC
LIMIT 1;
```

---

### ✅ Test 5: User Được Unban Login Lại Thành Công

**Steps:**

1. Logout khỏi admin account
2. Login với `testuser` (đã được unban)

**Expected:**

- ✅ Login THÀNH CÔNG
- ✅ Vào được hệ thống bình thường
- ✅ Tất cả chức năng hoạt động

---

## Troubleshooting

### ❌ Issue: User vẫn login được sau khi ban

**Nguyên nhân:** Migration 019 chưa chạy hoặc chạy không thành công

**Solution:**

1. Check xem column `is_banned` đã tồn tại chưa:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('is_banned', 'banned_reason', 'banned_at', 'banned_by');
```

2. Nếu chưa có, chạy lại migration 019

---

### ❌ Issue: Không thấy nút Ban/Unban

**Nguyên nhân:** Tài khoản không có quyền admin

**Solution:**

```sql
-- Check admin status
SELECT username, is_admin FROM profiles WHERE username = 'your_username';

-- Grant admin nếu chưa có
UPDATE profiles SET is_admin = TRUE WHERE username = 'your_username';
```

---

### ❌ Issue: Database error khi ban user

**Nguyên nhân:** RPC function chưa được tạo

**Solution:**

1. Check function tồn tại:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'admin_ban_user';
```

2. Nếu không có, chạy lại migration 019

---

### ❌ Issue: User bị ban nhưng fetchProfile không detect

**Nguyên nhân:** Database types chưa cập nhật

**Solution:**

- File `database.types.ts` đã được update với fields mới
- Restart dev server: `npm run dev`
- Hard refresh browser (Ctrl + Shift + R)

---

## Additional Tests

### Test 6: Ban User Với Lý Do Dài

**Steps:**

- Ban user với lý do > 100 ký tự
- Check hiển thị đúng trong UI và database

---

### Test 7: Ban Multiple Users

**Steps:**

- Ban nhiều users khác nhau
- Check admin_actions log đúng cho từng action
- Verify tất cả users bị ban đều không login được

---

### Test 8: Admin Ban Admin

**Steps:**

- Admin A ban Admin B
- Check Admin B vẫn có quyền admin nhưng bị ban
- Admin B không login được

---

## Success Criteria

Tất cả test cases phải PASS:

- [x] Ban user thành công (database updated)
- [x] User bị ban không login được
- [x] User đang online bị force logout khi bị ban
- [x] Unban user thành công
- [x] User được unban login lại được
- [x] Admin logs ghi đúng tất cả actions
- [x] UI hiển thị đúng status và lý do ban
- [x] Error messages rõ ràng và hữu ích

---

## Performance Check

### Check Response Time

**Ban/Unban Action:**

- Mở DevTools → Network tab
- Ban một user
- Check time của RPC call `admin_ban_user`
- Expected: < 500ms

**Login Check:**

- Thử login với banned user
- Check time của `signIn` call
- Expected: < 1000ms (bao gồm cả check banned status)

---

## Security Verification

### 1. Non-Admin Cannot Ban

**Test:**

```typescript
// Trong browser console (với non-admin account)
const { data, error } = await supabase.rpc("admin_ban_user", {
  target_user_id: "some-user-id",
  ban_status: true,
  ban_reason: "test",
});
console.log(error); // Should be: "Unauthorized: Admin access required"
```

### 2. RLS Policies

**Verify:**

```sql
-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('admin_actions', 'profiles');
-- rowsecurity should be TRUE

-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('admin_actions', 'profiles');
```

---

## Rollback Plan

Nếu có vấn đề nghiêm trọng, rollback:

```sql
-- Unban tất cả users
UPDATE profiles
SET is_banned = FALSE,
    banned_reason = NULL,
    banned_at = NULL,
    banned_by = NULL;

-- Disable admin check (tạm thời)
-- Comment out is_banned check trong code
-- Restart server
```

---

## Next Steps After Testing

Nếu tất cả tests PASS:

1. ✅ Deploy code lên production
2. ✅ Chạy migration 019 trên production database
3. ✅ Test lại trên production với dummy account
4. ✅ Document quy trình ban user cho admins
5. ✅ Tạo email notification khi user bị ban (optional)

---

## Contact

Nếu gặp vấn đề trong quá trình test:

- Check console logs (F12)
- Check Supabase logs (Dashboard → Logs)
- Review code changes trong commit
