# Thiết lập Supabase — Kết nối mùa vụ

Chức năng dùng migration `supabase/migrations/046_season_connections.sql`, `047_season_listing_gps.sql`, `048_limited_season_connection_admins.sql`, `049_season_admin_auth_lookup.sql`, `050_public_season_transaction_summary.sql` và `051_public_season_transaction_details.sql`. Migration 046 tạo bảng nguồn cung, nhu cầu thu mua, lời mời ghép cặp, tin nhắn, các phiên bản phiếu thỏa thuận và giao dịch; migration 047 thêm tọa độ GPS cho tin mùa vụ; migration 048 thêm quyền điều phối kết nối giới hạn, không cấp quyền Admin toàn hệ thống; migration 049 hỗ trợ khôi phục profile cho các tài khoản Auth được chỉ định bị tạo dở; migration 050 cho người dùng đăng nhập xem số lượng và mã giao dịch đã chốt; migration 051 bổ sung chi tiết các giao dịch hoàn tất qua RPC, không mở quyền đọc bảng hợp đồng, tin nhắn hoặc GPS.

## Chạy migration trên Supabase

1. Mở đúng project Supabase đang được ứng dụng sử dụng. Đối chiếu Project URL trong phần **Project Settings → API** với `VITE_SUPABASE_URL` trong `.env`; không chia sẻ hoặc gửi `VITE_SUPABASE_ANON_KEY` cho người khác. Không đưa `service_role` key vào frontend.
2. Tạo backup database trước khi cập nhật, nhất là nếu project đang có dữ liệu thật.
3. Mở **SQL Editor → New query**.
4. Nếu chưa cài chức năng Kết nối mùa vụ, chạy trước `supabase/migrations/046_season_connections.sql`.
5. Chạy tiếp `supabase/migrations/047_season_listing_gps.sql` để thêm ba cột GPS vào `season_supplies` và `season_demands` (giao diện hiện yêu cầu ghi nhận GPS khi đăng/cập nhật tin).
6. Chạy `supabase/migrations/048_limited_season_connection_admins.sql` để cài cờ quyền riêng `can_manage_season_connections` và cập nhật RLS/RPC.
7. Chạy `supabase/migrations/049_season_admin_auth_lookup.sql` nếu dùng script cấp tài khoản trong `docs/SEASON_CONNECTION_ADMIN_SETUP.md`.
8. Chạy `supabase/migrations/050_public_season_transaction_summary.sql` để trang Home đọc được số lượng và mã giao dịch đã chốt mà không mở quyền đọc hợp đồng hoặc thông tin cá nhân.
9. Chạy `supabase/migrations/051_public_season_transaction_details.sql` để mọi tài khoản đăng nhập có thể mở chi tiết giao dịch đã thành công từ Home.
10. Xác nhận query chạy thành công. Trong **Database → Tables**, kiểm tra các bảng mùa vụ; ở `season_supplies`/`season_demands` sẽ có `farm_latitude`, `farm_longitude`, `farm_accuracy_m`.
11. Tải lại ứng dụng, đăng nhập lại nếu cần. Hiện tại `.env` không có service-role key nên thao tác tạo tài khoản phải dùng script quản trị riêng; xem `docs/SEASON_CONNECTION_ADMIN_SETUP.md`.

Migration không cần bucket Storage mới. Tin nhắn, phiếu và điều kiện giao dịch được lưu trong database; thông báo dùng bảng `notifications` hiện có.

## Quyền Admin

Admin hiện được nhận diện bằng `profiles.is_admin = true`, tương tự `isAdmin()` đang dùng trong ứng dụng. Không dựa vào lựa chọn vai trò ở giao diện. Chỉ tài khoản đã được cấp cờ Admin hiện hành mới đọc được toàn bộ tin nguồn cung/nhu cầu hoặc gọi RPC mời ghép cặp. Không tự nâng quyền người dùng bằng cách sửa giao diện.

Trong trang Kết nối mùa vụ, Admin chọn một nguồn cung và một nhu cầu, xem mặt hàng/khu vực/thời gian/sản lượng, nhập lý do ghép đủ cụ thể rồi bấm **Mời kết nối**. Database gửi thông báo riêng tới hai bên. Admin chỉ xem tiến trình; RPC không cho Admin phản hồi lời mời, gửi tin nhắn thay, hoặc xác nhận phiếu.

## Kiểm tra luồng sau khi cài

Nên dùng ba tài khoản thử nghiệm riêng: một Farmer, một Business và một Admin.

1. Farmer tạo nguồn cung thử, ví dụ sầu riêng Ri6, xã/phường và tỉnh, thời gian thu hoạch, sản lượng dự kiến/bán được, tiêu chuẩn và cách giao hàng. Sửa tin, tạm dừng, mở lại rồi đóng tin để kiểm tra cập nhật.
2. Business đăng nhu cầu phù hợp với sản lượng, địa bàn và thời gian. Kiểm tra mỗi tài khoản chỉ quản lý được tin của chính vai trò đó.
3. Admin mở **Ghép cặp & theo dõi**, chọn hai tin tương ứng, ghi lý do, gửi lời mời. Cả hai tài khoản nhận thông báo và thấy chung hồ sơ/lý do ghép.
4. Xác nhận lời mời từ một tài khoản. Tin nhắn vẫn phải khóa. Xác nhận từ tài khoản còn lại; trạng thái chuyển sang kết nối và chat mở. Gửi tin nhắn từ hai bên, kiểm tra thông báo và nội dung hiển thị.
5. Một bên gửi Phiếu thỏa thuận v1. Bên đó được ghi nhận đồng ý v1; bên còn lại có thể đồng ý đúng v1 hoặc tạo phiếu mới. Khi tạo v2, v1 chuyển thành **Đã thay thế** và không thể được xác nhận.
6. Chỉ sau khi hai tài khoản cùng xác nhận v2, kiểm tra giao dịch có đúng một mã `GD-MV-YYYY-NNN`. Làm thử trường hợp hai bên chưa đồng ý, phiếu đã lỗi thời, hoặc số lượng vượt phần hàng còn lại: không trường hợp nào được tạo giao dịch.
7. Mở giao diện Admin và xác nhận Admin theo dõi được trạng thái nhưng không có nút xác nhận thay người mua/người bán.

## Dữ liệu và quy tắc bảo vệ

- Quyền truy cập được kiểm tra ở PostgreSQL bằng RLS và các RPC, không chỉ bằng điều kiện hiển thị nút ở React.
- Tin nguồn cung/nhu cầu chỉ chủ sở hữu mới được tạo/sửa/đóng; Admin đọc được để ghép. Hai bên chỉ xem được tin đối tác sau khi đã có hồ sơ ghép.
- Chat chỉ đọc/gửi sau khi cả Farmer và Business cùng chọn quan tâm.
- Mỗi lần gửi điều kiện mới tạo phiên bản tăng dần; xác nhận gắn với đúng dòng phiên bản đó.
- Mỗi hồ sơ chỉ có tối đa một giao dịch đã chốt. Database khóa nguồn cung và nhu cầu, kiểm tra tổng lượng đã chốt, từ chối nếu vượt số lượng còn lại và tự đóng tin đã bán/mua đủ.
- Xác nhận phiếu tạo giao dịch duy nhất ở transaction database; ghép cặp, tin nhắn hay một xác nhận đơn lẻ không tạo giao dịch.

Nếu SQL Editor báo lỗi, không chạy lại các lệnh xóa bảng thủ công. Giữ nguyên thông báo lỗi và kiểm tra migration nào đã được áp dụng; các lệnh tạo bảng/index/policy trong file có thể chạy lại phần lớn an toàn, nhưng thay đổi constraint đã hoàn tất trước đó cần được xác minh trước khi chạy lại toàn file.
