# Hướng dẫn sử dụng (User Guide)

Tài liệu này cung cấp hướng dẫn chi tiết về cách sử dụng các tính năng của Hệ Thống Quản Lý và Phân Tích Độ Mặn Nước.

## Bắt đầu

### Truy cập ứng dụng

1. Mở trình duyệt web (Chrome, Firefox, Safari, Edge)
2. Truy cập URL: `http://localhost:5173` (local) hoặc URL production
3. Trang chủ sẽ hiển thị

### Yêu cầu trình duyệt

- Chrome/Edge >= 90
- Firefox >= 88
- Safari >= 14
- Kích hoạt JavaScript
- Cho phép cookies

---

## Đăng ký và Đăng nhập

### Đăng ký tài khoản mới

1. Click nút **"Đăng ký"** hoặc **"Sign Up"** trên trang chủ
2. Điền form đăng ký:
   - **Tên đăng nhập**
   - **Loại tài khoản**: Nông dân hoặc Doanh nghiệp
   - **Mật khẩu**: Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số
   - **Xác nhận mật khẩu**: Nhập lại mật khẩu
   - **Số điện thoại**: Nhập chính xác SĐT VN của người dùng

3. Chọn **Loại người dùng** (Stakeholder Type):
   - **Nông dân** - Người trồng trọt, canh tác
   - **Doanh nghiệp** - Công ty, tổ chức
4. Click **"Đăng ký"**

### Đăng nhập

1. Click nút **"Đăng nhập"** hoặc **"Sign In"**
2. Nhập:
   - **Tên đăng nhập**: Tên đăng nhập đã đăng ký
   - **Mật khẩu**: Mật khẩu tài khoản
3. Click **"Đăng nhập"**

### Quên mật khẩu (Chưa hoàn thiện)

1. Tại trang đăng nhập, click **"Quên mật khẩu?"**
2. Nhập số điện thoại đã đăng ký
3. Click **"Gửi mã xác nhận"**
4. Kiểm tra tin nhắn message
5. Nhập passcode trong message
6. Nhập mật khẩu mới
7. Xác nhận và lưu

## Dashboard chính

Sau khi đăng nhập, bạn sẽ thấy Dashboard chính với các thành phần:

### Navigation Bar (Thanh điều hướng)

- **Logo/Tên ứng dụng**: Click biểu tượng ngôi nhà để về trang chủ
- **Menu chính**:
  - Dashboard
  - Bản đồ độ mặn
  - Cộng đồng
  - Mua bán vật tư
  - Dự án đầu tư
- **User menu** (trái):
  - Avatar và tên
  - Điểm và Rank
  - Settings (Chưa hoàn thiện)
  - Thành tích
  - Liên kết doanh nghiệp
  - Hoạt động của người dùng
  - Đăng xuất
- **Thông báo** (phải):
  - Hiển thị thông báo real-time

## Giám sát độ mặn

### Xem bản đồ độ mặn

1. Click vào biểu tượng bản đồ
2. Bản đồ hiển thị với:
   - **Markers**: Các điểm đo độ mặn
   - **Màu xanh**: Độ mặn thấp (< 1 ppt)
   - **Màu vàng**: Độ mặn trung bình (1-3 ppt)
   - **Màu cam**: Độ mặn cao (3-5 ppt)
   - **Màu đỏ**: Độ mặn rất cao (> 5 ppt)

#### Tương tác với bản đồ

- **Zoom in/out**: Scroll chuột hoặc nút +/-
- **Pan (di chuyển)**: Click và kéo
- **Click marker**: Xem chi tiết điểm đo
  - Vị trí (tọa độ)
  - Giá trị độ mặn hiện tại
  - Thời gian đo
- **Filter điểm đo**:
  - Theo khu vực
  - Theo thời gian

### Filter và tìm kiếm

**Filter Bar** (phía trên bản đồ):

1. **Khu vực**: Chọn tỉnh/huyện/xã
2. **Thời gian**:
   - Năm
   - Tháng
3. Click **"Áp dụng"** để filter

## Dự báo độ mặn

### Xem dự báo

1. Click menu trang chủ
2. Chọn tỉnh hiển tại của người dùng

### Cảnh báo nguy hiểm

1. Click vào biểu tượng cảnh báo tương ứng ở góc phải màn hình
2. Xem thông tin cảnh báo về độ mặn hiện tại của tỉnh đó và các giải pháp thích hợp

## Quản lý cộng đồng

### Xem bài viết

1. Click menu **"Cộng đồng"** hoặc icon hình bài viết
2. Xem feed bài viết:
   - Bài viết mới nhất
   - Bài viết nổi bật (nhiều like)
   - Bài viết từ người bạn theo dõi

**Mỗi bài viết hiển thị:**

- Avatar và tên tác giả
- Loại stakeholder
- Rank và điểm
- Thời gian đăng
- Nội dung text
- Hình ảnh/video (nếu có)
- Số lượt like, comment, share

### Tạo bài viết

1. Click **"Tạo bài viết"** hoặc **"Create Post"**
2. Viết nội dung:
   - Tiêu đề (optional)
   - Nội dung chính
   - Sử dụng markdown nếu muốn format
3. (Optional) Thêm media:
   - Click icon 📷 để upload ảnh
   - Click icon 🎥 để upload video
   - Tối đa 5 ảnh hoặc 1 video
4. Click **"Đăng bài"**

### Tương tác với bài viết

#### Like (Thích)

- Click icon ❤️
- Click lại để unlike

#### Comment (Bình luận)

1. Click **"Bình luận"** hoặc icon 💬
2. Nhập nội dung bình luận
3. Mention người khác: @username
4. Click **"Gửi"**

**Reply comment (trả lời bình luận):**

1. Click **"Trả lời"** dưới comment
2. Nhập nội dung
3. Click **"Gửi"**

#### Share (Chia sẻ)

1. Click icon 📤 hoặc **"Chia sẻ"**
2. Bài viết sẽ lưu về trang cá nhân của người dùng ở mục **"Đã chia sẽ"**

#### Báo cáo bài viết

- Click **⋮** (3 chấm) > **"Báo cáo"**
- Chọn lý do: Spam, nội dung không phù hợp, etc.
- Click **"Gửi báo cáo"**
- Admin sẽ xem xét

### Theo dõi người dùng

1. Vào profile người dùng (click avatar hoặc tên)
2. Click **"Theo dõi"** hoặc **"Follow"**
3. Bài viết của họ sẽ xuất hiện trong feed của bạn

**Xem danh sách:**

- **Đang theo dõi**: Người bạn follow
- **Người theo dõi**: Người follow bạn

## Dự án đầu tư

### Xem dự án

1. Click menu **"Dự án đầu tư"** hoặc **"Investments"**
2. Danh sách dự án hiển thị:
   - Tên dự án
   - Mô tả ngắn
   - Loại dự án (nông nghiệp, thủy sản, etc.)
   - Vị trí
   - Tổng vốn đầu tư
   - Đánh giá (⭐ rating)
   - Trạng thái (đang chạy, hoàn thành, etc.)

### Xem chi tiết dự án

1. Click vào dự án
2. Xem thông tin đầy đủ:
   - **Thông tin chung**:
     - Tên, mô tả chi tiết
     - Chủ đầu tư
     - Thời gian thực hiện
   - **Vị trí**: Bản đồ điểm dự án
   - **Tài chính**:
     - Tổng vốn
     - Nguồn vốn
     - Tiến độ giải ngân
   - **Đánh giá**:
     - Rating trung bình
     - Các review từ cộng đồng
   - **Media**: Ảnh, video dự án

### Đánh giá dự án

1. Tại trang chi tiết dự án, kéo xuống phần **"Đánh giá"**
2. Click **"Viết đánh giá"**
3. Cho điểm:

- ⭐ Tổng quan: 1-5 sao

4. Viết nhận xét chi tiết
5. Click **"Gửi đánh giá"**

**Chỉnh sửa đánh giá:**

- Click **"Chỉnh sửa"** trên đánh giá của bạn
- Cập nhật nội dung
- Click **"Lưu"**

### Tạo dự án (Dành cho Business/Researcher)

1. Click **"Tạo dự án mới"**
2. Điền form:
   - **Thông tin cơ bản**:
     - Tên dự án
     - Mô tả
     - Loại dự án
     - Khu vực
   - **Tài chính**:
     - Tổng vốn
     - Nguồn vốn
     - Kế hoạch sử dụng
   - **Thời gian**:
     - Ngày bắt đầu
     - Ngày kết thúc dự kiến
   - **Liên hệ**:
     - Người phụ trách
     - Email, số điện thoại
3. Upload media và tài liệu
4. Click **"Gửi để duyệt"**
5. Đợi admin phê duyệt

**Trạng thái dự án:**

- **Chờ duyệt**: Admin chưa phê duyệt
- **Đã duyệt**: Hiển thị công khai
- **Từ chối**: Không đạt yêu cầu
- **Đang chạy**: Dự án đang thực hiện
- **Hoàn thành**: Dự án đã kết thúc

---

## Hệ thống điểm và huy hiệu

### Kiếm điểm

**Cách kiếm điểm:**

- Đăng bài viết mới: +10 điểm
- 10 like: +5 điểm
- 100 lượt xem: +2 điểm

**Xem điểm của bạn:**

- Vào trang chủ phần **Tổng điểm**

### Hệ thống Rank

**Bậc rank theo điểm:**

- Tính theo điểm, người dùng nào cao hơn thì thứ hạng cao hơn
- Nếu có 2 người dùng trùng điểm thì sẽ tính đến thứ tự chữ cái đầu tiên của tên, ai xếp trước thì sẽ có thứ hạng cao hơn

### Huy hiệu (Achievements)

#### Loại huy hiệu

**Huy hiệu hoạt động:**

- **First Post**: Đăng bài đầu tiên
- **Helpful Contributor**: Nhận 100 likes
- **Active Member**: Đăng bài 30 ngày liên tục
- **Investor**: Đầu tư vào 5 dự án

#### Xem huy hiệu

1. Vào **Profile** > **Huy hiệu**
2. Xem:
   - **Đã đạt được**: Huy hiệu bạn có
   - **Chưa đạt**: Huy hiệu có thể unlock
   - **Tiến độ**: % hoàn thành cho mỗi huy hiệu

#### Badge màn hình

- Huy hiệu hiển thị trên profile
- Tối đa 3 huy hiệu đặc biệt hiển thị
- Click **"Chọn huy hiệu hiển thị"** để thay đổi

### Bảng xếp hạng (Leaderboard)

1. Click menu **"Bảng xếp hạng"** hoặc **"Leaderboard"**
2. Xem top users theo:
   - **Tổng điểm**: Người có nhiều điểm nhất
3. Click user để xem profile

**Thứ hạng của bạn:**

- Hiển thị ở trang chủ trong mục **Tổng điểm**

---

## Thông báo

### Xem thông báo

1. Click icon 🔔 ở góc phải header
2. Dropdown hiển thị thông báo mới nhất
3. Badge số hiển thị số thông báo chưa đọc

**Loại thông báo:**

- **Theo dõi**: X đã theo dõi bạn
- **Like**: X đã thích bài viết của bạn
- **Comment**: X đã bình luận vào bài viết
- **Share**: X đã chia sẻ bài viết
- **Đánh giá**: X đã đánh giá dự án của bạn
- **Nhắc đến**: X đã nhắc đến bạn trong 1 bình luận

### Quản lý thông báo

1. Click **"Xem tất cả"** trong dropdown
2. Trang thông báo hiển thị đầy đủ
3. Các actions:
   - **Đánh dấu đã đọc**: Click vào thông báo
   - **Đánh dấu tất cả đã đọc**: Click nút ở trên cùng
   - **Xóa**: Click Xóa
   - **Xóa tất cả đã đọc**: Click nút "Xóa đã đọc"

### Cấu hình thông báo (Chưa hoàn thiện)

1. Vào **Settings** > **Notifications**
2. Bật/tắt từng loại thông báo:
   - **In-app**: Thông báo trong ứng dụng
   - **Email**: Gửi email
   - **Digest**: Email tổng hợp (hàng ngày/tuần)
   - **SMS**: Gửi SMS (chỉ cảnh báo quan trọng)
3. Cấu hình tần suất:
   - Real-time: Ngay lập tức
   - Daily: Tổng hợp mỗi ngày
   - Weekly: Tổng hợp mỗi tuần
4. Click **"Lưu"**

---

## Quản lý tài khoản

### Xem và chỉnh sửa Profile

1. Click avatar hoặc tên > **"Profile"**
2. Xem thông tin:
   - Avatar
   - Tên người dùng
   - Loại stakeholder
   - Số điện thoại
   - Thành tích
   - Liên kết doanh nghiệp
   - Bài viết đã đăng

**Chỉnh sửa:**

1. Cập nhật thông tin:
   - Upload avatar mới (click ảnh) hoặc xóa ảnh hiện tại

**Lưu ý:**

- Avatar: JPG, PNG, tối đa 5MB
- Ảnh được crop tròn tự động

## Tính năng Admin

_(Chỉ dành cho tài khoản có quyền Admin)_

### Truy cập Admin Dashboard

1. Click avatar > **"Admin Dashboard"**

### Quản lý người dùng

1. Vào **Admin** > **Users**
2. Xem danh sách tất cả users
3. Filter/tìm kiếm:
   - Theo tên
   - Theo vai trò
   - Theo trạng thái (active, banned)
4. Actions với từng user:
   - **View**: Xem profile đầy đủ
   - **Edit**: Sửa thông tin
   - **Ban**: Khóa tài khoản (cấm đăng nhập)
   - **Unban**: Mở khóa
   - **Approve**: Phê duyệt (nếu cần)
   - **Change Role**: Đổi role (farmer/business)

### Quản lý nội dung

#### Posts (Bài viết)

1. Vào **Admin** > **Content** > **Posts**
2. Xem tất cả bài viết
3. Actions:
   - **Approve**: Phê duyệt bài viết
   - **Reject**: Từ chối (kèm lý do)
   - **Delete**: Xóa bài viết

#### Projects (Dự án)

- Phê duyệt dự án mới
- Kiểm tra thông tin, tài liệu
- Approve/Reject

### Analytics (Phân tích)

1. Vào **Admin** > **Analytics**
2. Dashboard hiển thị:
   - **Overview**:
     - Tổng số users
     - Tổng bài viết
     - Dự án đầu tư
     - Tỷ lệ tương tác
   - **Biểu đồ**:
     - Growth chart (tăng trưởng users)
     - Activity chart (hoạt động theo thời gian)
     - Engagement metrics
   - **Content stats**:
     - Bài viết nhiều like nhất
     - Dự án được đánh giá cao nhất

## Sử dụng trên Mobile

### Responsive Design

Ứng dụng hoạt động tốt trên mọi thiết bị:

- Smartphones
- Tablets
- Laptops
- Desktops

### Mobile Navigation

- **Bottom Tab Bar**: Quick access các trang chính
  - Home
  - Map
  - Post
  - Product
  - Invest

### Touch Gestures

- **Swipe left/right**: Chuyển tab, xóa notification
- **Pull to refresh**: Refresh feed
- **Pinch to zoom**: Zoom bản đồ, ảnh
- **Long press**: Mở context menu

---

## Thuật ngữ

- **ppt**: Parts per thousand (phần nghìn) - đơn vị đo độ mặn
- **Stakeholder**: Bên liên quan (nông dân, doanh nghiệp, etc.)
- **Feed**: Dòng thời gian hiển thị bài viết
- **Timeline**: Tương tự feed
- **Thread**: Chuỗi bình luận
- **Mention**: Tag/nhắc đến ai đó (@username)
- **Hashtag**: Thẻ đánh dấu chủ đề (#topic)
- **Forecast**: Dự báo
- **Confidence interval**: Khoảng tin cậy (độ chính xác dự báo)
- **RLS**: Row Level Security (bảo mật cấp dòng)
