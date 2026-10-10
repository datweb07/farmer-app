# RAG khuyến nghị canh tác — Groq + Supabase, không dùng Gemini

Python đọc DOCX và lưu các đoạn vào Supabase. PostgreSQL tìm đoạn bằng full-text search; Groq đọc các đoạn tìm được và soạn câu trả lời. Việc nạp và truy xuất tài liệu không gọi dịch vụ embedding nào. Chỉ câu trả lời được gửi tới Groq. Đây là RAG dựa trên từ khóa, không phải vector/semantic search; nên dùng cụm từ cụ thể trong câu hỏi.

## 1. Cấu hình Supabase

Trong Supabase Dashboard → SQL Editor, chạy lần lượt:

1. `supabase/migrations/053_agronomy_rag.sql`
2. `supabase/migrations/054_agronomy_text_search.sql`

Migration 054 thêm chỉ mục tìm kiếm văn bản và cho phép cột embedding cũ để trống. Dữ liệu vector cũ (nếu có) không bị xóa. Function tìm kiếm chỉ được gọi bằng `service_role` từ API máy chủ.

Lấy Project URL và service-role key trong Supabase Dashboard. Service-role key là bí mật cấp cao: chỉ dùng trong biến môi trường máy chủ/terminal riêng, không gửi lên chat, không đặt tên `VITE_*`, không commit.

## 2. Nạp DOCX (không cần Gemini/Groq key)

Mở PowerShell ở thư mục gốc dự án:

```powershell
py -3.12 -m venv train/.venv
train/.venv/Scripts/python.exe -m pip install -r requirements.txt
$env:SUPABASE_URL = "https://PROJECT_ID.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "DAN_SERVICE_ROLE_KEY_VAO_DAY"
train/.venv/Scripts/python.exe -m train.ingest "C:\Users\THANH DAT\Downloads\Champ_Manh_Chat_Sau_Rieng_Can_Tho_1111_Trang.docx"
```

Đoạn văn được chia theo tiêu đề/đoạn, lưu theo lô vào Supabase; không gửi nội dung lên Gemini. Có thể chạy lại cùng lệnh: script giữ các đoạn không đổi và chỉ nạp phần còn thiếu/thay đổi. `document-key` mặc định là `champ-manh-chat-sau-rieng-can-tho`.

## 3. Cấu hình Groq cho API trả lời

Tạo API key trong Groq Console. Thêm các biến sau vào Vercel Project → Settings → Environment Variables cho môi trường đang chạy:

| Tên | Giá trị |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key, chỉ server-side |
| `VITE_SUPABASE_ANON_KEY` | Anon/public key hiện frontend dùng để xác minh phiên đăng nhập |
| `GROQ_API_KEY` | Groq API key, chỉ server-side; không dùng tiền tố `VITE_` |
| `GROQ_GENERATION_MODEL` | Tùy chọn; mặc định `openai/gpt-oss-120b` |

Sau khi lưu biến, redeploy để Function nhận cấu hình mới. Groq API key là bí mật: tuyệt đối không đặt trong frontend hoặc commit vào Git. API miễn phí có giới hạn theo model/tài khoản; hết giới hạn thì cần đợi quota hồi lại. Groq cập nhật model theo thời gian, vì vậy có thể đổi model bằng `GROQ_GENERATION_MODEL` mà không sửa code.

Để chạy local cả frontend lẫn Python Function, dùng Vercel CLI và `vercel dev` từ thư mục gốc; `npm run dev` không tự chạy thư mục `api/`. Giữ API cùng origin với frontend để request `/api/agronomy-advisor` hoạt động.

## 4. Kiểm tra

1. Đăng nhập bằng tài khoản ứng dụng có quyền Supabase Auth.
2. Mở trang chủ và hỏi bằng các từ khóa cụ thể có trong tài liệu (ví dụ: tên cây, sâu bệnh, giai đoạn).
3. Kiểm tra “Nguồn đã truy xuất” có đúng mục/đoạn liên quan hay không.
4. Nếu không tìm được nguồn, API sẽ từ chối đưa khuyến nghị thay vì để model tự trả lời kiến thức bên ngoài.

## Giới hạn và an toàn

Full-text search trên tiếng Việt dựa nhiều vào từ/cụm từ trùng khớp; có thể bỏ lỡ đoạn liên quan khi câu hỏi diễn đạt khác cách tài liệu viết. Nếu kết quả chưa tốt, hãy thêm từ khóa/tên mục cụ thể. Đây là đánh đổi để bỏ hoàn toàn quota embedding mà không phải chạy model trên máy riêng. RAG giảm câu trả lời thiếu căn cứ nhưng không thể bảo đảm tuyệt đối rằng model không bịa; luôn kiểm tra kỹ liều lượng, thời gian cách ly, ngưỡng độ mặn và quyết định có thể gây thiệt hại.

DOCX không chứa dấu phân trang ổn định, vì vậy nguồn trích dẫn là tên mục + số đoạn, không phải số trang Word.

Tham khảo: [Groq deprecation/model migration](https://console.groq.com/docs/deprecations), [Groq rate limits](https://console.groq.com/docs/rate-limits), [Groq Chat Completions](https://console.groq.com/docs/api-reference), [Supabase full-text search](https://supabase.com/docs/guides/database/full-text-search).
