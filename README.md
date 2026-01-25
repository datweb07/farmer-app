## Problem Statement

- Xâm nhập mặn ảnh hưởng đến đồng bằng sông cửu long
- Nông dân thiếu thiếu vốn canh tác lẫn chỗ vay vốn uy tín
- Nông dân thiếu cách giải quyết, vật tư nông nghiệp
- Tốn nhiều thời gian bằng việc vay vốn trực tiếp từ Bank mà biến đổi khí hậu(xâm nhập mặn) không lường trước được

## Tổng quan giải pháp (Solution Overview)

Xây dựng hệ sinh thái giữa 3 chủ thể chính: Nông dân, Doanh nghiệp cung cấp Vật tư nông nghiệp, Ngân hàng để giải quyết vấn đề nhức nhối trên từ việc Doanh nghiệp cung cấp nông phẩm dựa trên Độ mặn dự đoán của Web app chúng em!

## Các tính năng chính

### 1. Giám sát độ mặn

- **Bản đồ tương tác**: Hiển thị các điểm đo độ mặn trên bản đồ [MapLibre GL](https://www.mapcn.dev/)

### 2. Dự báo thông minh

- **AI dự đoán**: Sử dụng Prophet để dự báo độ mặn tương lai
- **Phân tích xu hướng**: Xác định xu hướng tăng/giảm của độ mặn
- **Cảnh báo sớm**: Thông báo khi dự đoán độ mặn vượt ngưỡng

### 3. Quản lý cộng đồng

- **Đăng bài viết**: Chia sẻ thông tin, kinh nghiệm về quản lý độ mặn
- **Bình luận**: Thảo luận và trao đổi giữa các thành viên
- **Tương tác**: Like, share, theo dõi người dùng khác
- **Đánh giá dự án**: Đánh giá và nhận xét các dự án đầu tư
- **Hệ thống điểm và xếp hạng**: Tích lũy điểm qua hoạt động, leo rank

### 4. Hệ thống huy hiệu

- **Huy hiệu thành tựu**: Nhận huy hiệu khi đạt được các mốc quan trọng
- **Huy hiệu chuyên gia**: Dành cho người dùng có đóng góp xuất sắc
- **Theo dõi tiến độ**: Xem tiến trình đạt được các huy hiệu

### 5. Thông báo và cảnh báo

- **Thông báo real-time**: Nhận thông báo tức thì về các hoạt động
- **Cảnh báo bất thường**: Đưa ra cảnh báo với các mức độ mặn khác nhau và giải pháp tương ứng

### 6. Quản trị hệ thống

- **Quản lý người dùng**: Phê duyệt, khóa/mở khóa tài khoản
- **Kiểm duyệt nội dung**: Phê duyệt bài viết, bình luận
- **Analytics Dashboard**: Thống kê và phân tích hệ thống

### 7. Xác thực và bảo mật

- **Đăng nhập/đăng ký**: Hỗ trợ email/password và OAuth
- **Quản lý profile**: Thông tin cá nhân, avatar, loại stakeholder
- **Đặt lại mật khẩu**: Qua mã xác thực (Chưa hoàn thiện)

### 8. Tính năng nâng cao

- **Text-to-Speech**: Đọc nội dung bằng giọng nói
- **Responsive Design**: Hoạt động tốt trên mọi thiết bị
- **Dark/Light Mode**: Hỗ trợ chủ đề tối/sáng (Chưa hoàn thiện)
- **Upload media**: Tải lên ảnh, video cho bài viết

## Yêu cầu môi trường (Prerequisites)

- Node.js >= 18.x
- npm hoặc yarn
- Tài khoản Supabase (miễn phí)

### Cài đặt

```bash
# 1. Clone repository
git clone https://github.com/datweb07/farmer-app.git
cd farmer-app

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env và cấu hình
cp .env.example .env
# Sau đó chỉnh sửa .env với thông tin của bạn

# 4. Chạy ứng dụng ở chế độ development
npm run dev
```

### Chạy ứng dụng

```bash
# Development mode (với hot reload)
npm run dev

# Build cho production
npm run build

# Preview bản build
npm run preview

# Lint code
npm run lint
```

Sau khi chạy `npm run dev`, mở trình duyệt tại `http://localhost:5173`

## Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/TenTinhNang`)
3. Commit thay đổi (`git commit -m 'Thêm tính năng XYZ'`)
4. Push lên branch (`git push origin feature/TenTinhNang`)
5. Tạo Pull Request

## Attribution & Licensing

### Third-party Libraries

Dự án này sử dụng các thư viện mã nguồn mở sau:

**Core Framework & Build Tools:**

- React 19.2.0 - MIT License
- TypeScript 5.9.3 - Apache 2.0 License
- Vite 7.2.4 - MIT License

**UI Components:**

- @radix-ui/\* - MIT License
- Lucide React - ISC License
- Tailwind CSS 4.1.18 - MIT License

**Maps & Visualization:**

- MapLibre-GL (BSD-3-Clause License)
- Recharts 3.6.0 - MIT License

**Backend & Authentication:**

- @supabase/supabase-js 2.39.0 - MIT License

**Utilities:**

- React Hook Form 7.69.0 - MIT License
- React Router DOM 7.12.0 - MIT License
- Date-fns - MIT License

Xem file `package.json` để biết danh sách đầy đủ các dependencies.

### AI-Generated Code

Một số phần của dự án này được tạo ra hoặc hỗ trợ bởi các công cụ AI (GitHub Copilot, ChatGPT, v.v.). Code được tạo bởi AI đã được xem xét, kiểm tra và tùy chỉnh để phù hợp với yêu cầu của dự án.

### License

Dự án này được phát hành dưới giấy phép MIT - xem file [LICENSE](./LICENSE.md) để biết thêm chi tiết.

## Liên hệ và Hỗ trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi, vui lòng:

- Tạo Issue trên GitHub
- Liên hệ qua email: [dat82770@gmail.com]

---

**Lưu ý**: Đây là phiên bản đang phát triển. Một số tính năng có thể chưa hoàn thiện hoặc đang trong giai đoạn thử nghiệm.
