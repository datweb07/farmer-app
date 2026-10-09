# Thiết lập push cảnh báo độ mặn

Luồng hiện tại:

1. Người dùng đăng nhập, chọn tỉnh, tùy chọn trạm đo và ngưỡng g/L rồi bấm “Bật cảnh báo độ mặn”.
2. Trình duyệt xin quyền, Firebase cấp registration token và token cùng bộ lọc được lưu trong salinity_push_subscriptions.
3. Mỗi lần có bản ghi INSERT vào public.prophet_predict, Supabase Database Webhook gọi /api/salinity-push.
4. Function so khớp tỉnh/trạm và điều kiện du_bao_man >= threshold, rồi gửi data message qua FCM HTTP v1. Bảng salinity_push_deliveries ngăn webhook retry gửi trùng.

Không có Cron. Dữ liệu dự báo cũ không tự gửi cảnh báo hồi tố. Người dùng phải cho phép notification; đây là thông báo trình duyệt/web app, không phải Zalo hay SMS.

## 1. Tạo cấu hình Firebase Web

1. Mở [Firebase Console](https://console.firebase.google.com/) và tạo/chọn project Champ Mạnh Chat.
2. Vào Project settings → General → Your apps → Add app → Web (</>). Đăng ký app; không cần bật Firebase Hosting.
3. Lưu lại các trường trong Firebase config: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId.
4. Vào Project settings → Cloud Messaging → Web Push certificates → Generate key pair. Lưu public key VAPID. Public key này dùng trong web app; không nhầm với service-account private key.
5. Trong Google Cloud Console của cùng project, kiểm tra/enabled Firebase Cloud Messaging API (V1).

Firebase Web SDK 12.19.0 được nạp từ CDN chính thức khi người dùng bấm nút bật cảnh báo, vì vậy không cần cài package Firebase vào máy dự án. Máy người dùng cần tải được các module gstatic.com.

## 2. Áp dụng schema Supabase

Mở Supabase project → SQL Editor → New query, dán toàn bộ nội dung trong supabase/migrations/052_salinity_push_notifications.sql và Run.

Migration tạo:

- salinity_push_subscriptions: token, tài khoản, tỉnh/trạm và ngưỡng; RLS chỉ cho phép tài khoản xem/sửa đăng ký của chính mình.
- salinity_push_deliveries: nhật ký/idempotency cho backend; không cấp policy cho người dùng thường, backend dùng service-role key.

Không cần bật Realtime cho hai bảng này.

## 3. Thêm biến môi trường Vercel

Deploy repository lên Vercel và thêm các biến dưới đây trong Project → Settings → Environment Variables. Chọn Production và Preview nếu cả hai môi trường đều phải nhận cảnh báo; sau khi thay đổi biến cần redeploy.

Biến dành cho web client (các giá trị Firebase Web config và VAPID public key vốn là giá trị công khai):

    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your-project-id
    VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
    VITE_FIREBASE_MESSAGING_SENDER_ID=...
    VITE_FIREBASE_APP_ID=...
    VITE_FIREBASE_VAPID_KEY=...

Biến chỉ dành cho Vercel Function — tuyệt đối không đặt tiền tố VITE_, không commit vào Git, không đưa vào file env dùng cho trình duyệt:

    SUPABASE_URL=https://<project-ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role/secret key>
    FIREBASE_SERVICE_ACCOUNT_JSON=<toàn bộ JSON service-account trên một dòng>
    SUPABASE_WEBHOOK_SECRET=<chuỗi ngẫu nhiên dài, riêng cho webhook này>

Khi chạy giao diện local, chỉ thêm 7 biến VITE_FIREBASE_* ở trên vào file .env.local (không commit). Các biến server chỉ cấu hình trong Vercel. Nếu muốn chạy API local, dùng Vercel CLI với local environment variables và kiểm tra API ở URL do vercel dev cung cấp; webhook Supabase production vẫn nên trỏ về domain deployment HTTPS.

Lấy SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY từ Supabase → Project Settings → API. Đây là quyền backend rất cao; giữ kín service role key.

Để tạo FIREBASE_SERVICE_ACCOUNT_JSON: Firebase/Google Cloud Console → IAM & Admin → Service Accounts → chọn service account thuộc đúng project → Keys → Add key → Create new key → JSON. Dán toàn bộ nội dung JSON vào một biến Vercel duy nhất. Không tải JSON này vào thư mục source, không gửi qua chat, không commit. Function tự đổi \n trong private_key thành newline khi chạy. Nếu key đã từng bị lộ, xóa/revoke key cũ trong Google Cloud rồi tạo key mới.

SUPABASE_WEBHOOK_SECRET có thể tạo bằng password manager hoặc lệnh: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))". Dùng đúng cùng một giá trị ở Vercel và webhook header.

## 4. Tạo Database Webhook (gửi ngay, không Cron)

Sau khi domain Vercel đã deploy:

1. Supabase → Database → Webhooks → Create a new webhook.
2. Đặt tên salinity-push-insert.
3. Table: public.prophet_predict; event: chỉ chọn INSERT.
4. Type/method: HTTP POST; URL: https://<domain-vercel-cua-ban>/api/salinity-push.
5. Thêm request headers:
   - Content-Type: application/json
   - x-supabase-webhook-secret: <đúng SUPABASE_WEBHOOK_SECRET ở Vercel>
6. Lưu webhook. Không chọn UPDATE/DELETE nếu không muốn gửi lại các bản ghi chỉnh sửa/xóa.

Database Webhooks của Supabase chạy bất đồng bộ qua pg_net. Webhook chỉ gửi sau khi insert được commit; nếu endpoint lỗi, xem lịch sử webhook trong Supabase và Function Logs trong Vercel. Để thử, insert một bản ghi độ mặn mới trên đúng tỉnh/trạm với du_bao_man lớn hơn ngưỡng của tài khoản đã đăng ký.

## 5. Kiểm tra end-to-end

1. Redeploy Vercel sau khi khai báo toàn bộ biến.
2. Mở site trên HTTPS (localhost cũng được cho phát triển) và đăng nhập.
3. Vào Độ mặn dự báo, chọn tỉnh, tùy chọn trạm, đặt ngưỡng rồi bấm “Bật cảnh báo độ mặn” và cho phép thông báo ở trình duyệt.
4. Supabase Table Editor → salinity_push_subscriptions: xác nhận có token với đúng user_id, tỉnh/trạm/ngưỡng.
5. Insert một bản ghi prophet_predict mới khớp tỉnh/trạm và vượt ngưỡng. Kiểm tra Supabase Webhook delivery, Vercel Function Logs và thiết bị nhận push.
6. Thử lại với giá trị dưới ngưỡng hoặc trạm khác; không được có push.

Nếu chạy local: Vite chỉ phục vụ giao diện, không chạy api/salinity-push.js; vì vậy kiểm tra luồng webhook end-to-end trên deployment Vercel. Việc lưu subscription từ localhost vẫn dùng được khi Supabase và Firebase đã cấu hình.

## Lưu ý vận hành

- Dữ liệu tại prophet_predict hiện là dự báo theo năm/trạm, không nhất thiết là phép đo cảm biến tức thời. Cảnh báo này kích hoạt trên mọi bản ghi mới được insert; nếu sau này cần cảnh báo chỉ cho số đo cảm biến thực, nên tách sự kiện/nguồn dữ liệu thực đo.
- iPhone chỉ nhận web push theo khả năng/phiên bản iOS và cách cài/mở web app; một số thiết bị yêu cầu thêm web app vào Màn hình chính. Trình duyệt/OS có thể chặn thông báo nếu người dùng đã từ chối.
- Firebase Web config và VAPID public key không phải server secret; private key service account và Supabase service-role key thì có.
- Vercel Hobby chỉ dành cho sử dụng cá nhân/phi thương mại theo điều khoản hiện hành. Nếu Champ Mạnh Chat được dùng trong hoạt động kinh doanh, chọn gói phù hợp trước khi vận hành.
