# Tạo tài khoản điều phối Kết nối mùa vụ

Tài khoản `dat` giữ nguyên `profiles.is_admin = true` và toàn bộ quyền Admin hiện có. Năm tài khoản `AnhTuan`, `MinhChau`, `DinhQuang`, `BachDuong`, `DuongNghi` dùng `role = farmer`, `is_admin = false`, và chỉ được cấp cờ `can_manage_season_connections` cho giao diện ghép cặp cùng RPC liên quan.

## Các bước

1. Tạo backup Supabase.
2. Chạy migration `supabase/migrations/048_limited_season_connection_admins.sql` trong SQL Editor. Migration này phải chạy sau `046` và `047`.
3. Chạy thêm migration `supabase/migrations/049_season_admin_auth_lookup.sql`. Migration này cho script tra ID Auth của đúng năm tài khoản được phép, để khôi phục trường hợp tài khoản Auth đã tạo nhưng trigger tạo profile bị lỗi.
4. Mở terminal ở thư mục repo và chạy `node scripts/create-season-connection-admins.mjs`.
5. Lấy Project URL từ `.env` (script đọc tự động). Khi được hỏi, nhập `service_role` key từ Supabase Dashboard → Project Settings → API; nhập mật khẩu chung đã chỉ định ở dấu nhắc kế tiếp. Cả hai trường đều không hiển thị ký tự và không được ghi vào file.
6. Đăng nhập thử từng tài khoản và mở nút **Kết nối**. Chúng phải thấy giao diện **Ghép cặp & theo dõi**; vào `/admin` hoặc thao tác duyệt bài, quản lý người dùng và các quyền legacy khác phải bị từ chối. Tài khoản `dat` phải tiếp tục sử dụng Admin như trước.

Script tạo Auth users bằng email nội bộ `<username>@example.com`, xác nhận email và tạo/cập nhật profile Nông dân. Nếu một tài khoản Auth đã tồn tại nhưng thiếu profile, migration 049 cho phép script khôi phục profile; nếu user đã đầy đủ, script đặt lại mật khẩu theo giá trị nhập và buộc `role=farmer`, `is_admin=false`, quyền kết nối giới hạn. Không chạy script nếu không muốn đặt lại các tài khoản trùng tên.

Không đưa service-role key vào `VITE_*`, source code, SQL migration hay chat. Nếu script báo thiếu dependency, chạy `npm install` trước. Script không xóa tài khoản và không in mật khẩu/service key ra console.
