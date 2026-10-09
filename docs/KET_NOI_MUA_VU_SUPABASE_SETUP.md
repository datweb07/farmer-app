# Thiết lập Supabase — Kết nối mùa vụ

Chức năng dùng migration `supabase/migrations/046_season_connections.sql`. Migration tạo bảng nguồn cung, nhu cầu thu mua, lời mời ghép cặp, tin nhắn, các phiên bản phiếu thỏa thuận và giao dịch; đồng thời bật RLS, thêm RPC kiểm tra quyền/chốt giao dịch và kiểu thông báo `SEASON_CONNECTION`.

## Chạy migration trên Supabase

1. Mở đúng project Supabase đang được ứng dụng sử dụng. Đối chiếu Project URL trong phần **Project Settings → API** với `VITE_SUPABASE_URL` trong `.env`; không chia sẻ hoặc gửi `VITE_SUPABASE_ANON_KEY` cho người khác. Không đưa `service_role` key vào frontend.
2. Tạo backup database trước khi cập nhật, nhất là nếu project đang có dữ liệu thật.
3. Mở **SQL Editor → New query**.
4. Mở file `supabase/migrations/046_season_connections.sql` trong repo, sao chép toàn bộ nội dung, dán vào SQL Editor và nhấn **Run**.
5. Xác nhận query chạy thành công. Trong **Database → Tables**, kiểm tra có các bảng `season_supplies`, `season_demands`, `season_matches`, `season_messages`, `season_proposals` và `season_transactions`.
6. Tải lại ứng dụng, đăng nhập lại nếu cần. Khi migration chưa chạy, trang Kết nối mùa vụ sẽ không thể đọc các bảng mới.

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
