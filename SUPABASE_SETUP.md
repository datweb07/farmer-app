# Hướng dẫn Setup Authentication với Supabase

## Bước 1: Cấu hình Supabase

### 1.1 Tạo Project Supabase
1. Truy cập [Supabase Dashboard](https://app.supabase.com)
2. Tạo project mới hoặc chọn project hiện có
3. Đợi project được khởi tạo

### 1.2 Lấy API Credentials
1. Vào **Settings** → **API**
2. Copy **Project URL** (ví dụ: `https://xxxxx.supabase.co`)
3. Copy **anon/public key** (dạng `eyJhbGc...`)
4. **LƯU Ý**: Không sử dụng `sb_publishable_` - đó không phải là anon key hợp lệ!

### 1.3 Cập nhật file `.env`
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Bước 2: Tạo Database Schema

### 2.1 Chạy SQL Schema
1. Vào **SQL Editor** trong Supabase Dashboard
2. Tạo query mới
3. Copy toàn bộ nội dung file `supabase/schema.sql`
4. Paste và chạy script
5. Kiểm tra xem các tables và functions đã được tạo:
   - ✅ `public.organizations` table
   - ✅ `public.profiles` table
   - ✅ `is_username_available()` function
   - ✅ `handle_new_user()` trigger function

### 2.2 Xác minh setup
Chạy query sau để kiểm tra function:
```sql
SELECT is_username_available('testuser');
```
Kết quả phải là `true` (nếu username chưa tồn tại)

## Bước 3: Cấu hình Email Auth (Optional nhưng recommended)

Vì app sử dụng pseudo-email (`username@example.com`), bạn nên:

1. Vào **Authentication** → **Providers** → **Email**
2. **Tắt "Confirm email"** (hoặc set confirmation URL)
3. Save changes

**Lưu ý**: App sử dụng domain `@example.com` vì đây là domain hợp lệ được chấp nhận bởi email validators.

## Bước 4: Chạy Ứng Dụng

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

## Troubleshooting

### Lỗi: "Không thể kiểm tra tên đăng nhập"
- **Nguyên nhân**: Function `is_username_available` chưa được tạo trong database
- **Giải pháp**: Chạy lại `supabase/schema.sql` trong SQL Editor

### Lỗi: "Đăng ký thành công nhưng không thể tạo hồ sơ"
- **Nguyên nhân**: Trigger `handle_new_user` chưa hoạt động hoặc RLS policies chặn
- **Giải pháp**: 
  1. Kiểm tra trigger đã được tạo: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
  2. Kiểm tra RLS policies trên `profiles` table

### Lỗi: "Invalid API key"
- **Nguyên nhân**: `VITE_SUPABASE_ANON_KEY` không hợp lệ
- **Giải pháp**: Lấy lại anon key từ Settings → API (phải là JWT token bắt đầu bằng `eyJ`)

### Console logs để debug
Mở Browser Console (F12) để xem các logs chi tiết:
- 🔵 Blue logs: Quá trình đăng ký đang chạy
- 🔴 Red logs: Lỗi xảy ra
- ✅ Green logs: Thành công

## Kiểm tra sau khi đăng ký thành công

1. Vào **Authentication** → **Users** - phải thấy user mới
2. Vào **Table Editor** → **profiles** - phải thấy profile mới
3. User có thể đăng nhập lại với username và password
