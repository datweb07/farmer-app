# Hướng dẫn cài đặt (Setup Guide)

Tài liệu này hướng dẫn chi tiết cách cài đặt và cấu hình môi trường phát triển cho dự án.

## Yêu cầu hệ thống

### Yêu cầu bắt buộc (Prerequisites)

#### 1. Node.js & npm

- **Node.js**: >= 18.x (khuyến nghị 20.x LTS)
- **npm**: >= 9.x hoặc **yarn**: >= 1.22.x

**Kiểm tra phiên bản:**

```bash
node --version
npm --version
# Hoặc nếu dùng yarn
yarn --version
```

**Cài đặt Node.js:**

- Tải từ [nodejs.org](https://nodejs.org/)
- Hoặc dùng nvm (Node Version Manager):

  ```bash
  # Windows
  # Tải nvm-windows từ: https://github.com/coreybutler/nvm-windows

  # macOS/Linux
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  nvm install 20
  nvm use 20
  ```

#### 2. Git

- **Git**: >= 2.x

**Cài đặt:**

- Tải từ [git-scm.com](https://git-scm.com/)

#### 3. Code Editor

- **Visual Studio Code** (khuyến nghị)
- Extensions đề xuất:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar)
  - Supabase

#### 4. Tài khoản Supabase

- Đăng ký tài khoản miễn phí tại [supabase.com](https://supabase.com)
- Tạo project mới

## Cài đặt môi trường

### Bước 1: Clone Repository

```bash
# Clone repository từ GitHub
git clone https://github.com/datweb07/farmer-app.git

# Di chuyển vào thư mục dự án
cd farmer-app
```

### Bước 2: Cài đặt Dependencies

```bash
# Sử dụng npm
npm install

# Hoặc sử dụng yarn
yarn install

# Hoặc sử dụng pnpm
pnpm install
```

## Cấu hình dự án

### Tạo file Environment Variables

#### 1. Tạo file `.env`

```bash
# Copy file mẫu
cp .env.example .env

# Hoặc trên Windows
copy .env.example .env
```

#### 2. Cấu hình biến môi trường

Mở file `.env` và điền các thông tin sau:

```env
# Lấy từ Supabase Dashboard > Settings > API
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Service Role Key (CHỈ dùng cho server-side, không expose ra client)
SUPABASE_SERVICE_ROLE_KEY=

# Gửi mail giao dịch
VITE_RESEND_API_KEY=
VITE_ADMIN_EMAIL=
```

### File `.gitignore`

Đảm bảo file `.gitignore` có các dòng sau:

```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local
.env

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

## Thiết lập Supabase

### Bước 1: Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Chọn organization
4. Điền thông tin:
   - **Project Name**: Tên dự án của bạn
   - **Database Password**: Mật khẩu mạnh (lưu lại)
   - **Region**: Chọn region gần bạn nhất
5. Click **"Create new project"**

### Bước 2: Lấy API Keys

1. Vào **Settings** > **API**
2. Copy các thông tin sau:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### Bước 3: Setup Database Schema

#### Option 1: Sử dụng Supabase Dashboard

1. Vào **SQL Editor**
2. Click **"New query"**
3. Copy nội dung từ `supabase/schema.sql`
4. Paste vào editor
5. Click **"Run"**

#### Option 2: Sử dụng Supabase CLI (Khuyến nghị)

```bash
# Cài đặt Supabase CLI
npm install -g supabase

# Login vào Supabase
supabase login

# Link với project
supabase link --project-ref your-project-id

# Run migrations
supabase db push

# Hoặc reset database và apply tất cả migrations
supabase db reset
```

### Bước 4: Setup Storage Buckets

1. Vào **Storage**
2. Tạo các buckets sau:
   - **avatars** (Public)
   - **post-images** (Public)
   - **post-videos** (Public)
   - **project-attachments** (Private)

**Cấu hình policies cho avatars bucket:**

```sql
-- Allow authenticated users to upload their avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to read avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

### Bước 5: Setup Authentication

1. Vào **Authentication** > **Providers**
2. Bật **Email** provider

**Cấu hình Email Templates:**

1. Vào **Authentication** > **Email Templates**
2. Tùy chỉnh các templates:
   - Confirm signup
   - Magic link
   - Reset password

### Bước 6: Setup Edge Functions (Optional)

```bash
# Deploy Edge Functions
supabase functions deploy send-contact-email
supabase functions deploy reset-password

# Set secrets cho Edge Functions
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_USER=your-email@gmail.com
supabase secrets set SMTP_PASS=your-app-password
```

## Chạy ứng dụng

### Development Mode

```bash
# Start dev server
npm run dev

# Hoặc
yarn dev
```

Ứng dụng sẽ chạy tại: **http://localhost:5173**

### Build cho Production

```bash
# Build
npm run build

# Preview build
npm run preview
```

### Chạy Lint

```bash
# Lint toàn bộ code
npm run lint

# Fix lỗi có thể tự động fix
npm run lint -- --fix
```

## Troubleshooting

### Lỗi thường gặp

#### 1. **"Cannot find module" hoặc "Module not found"**

**Giải pháp:**

```bash
# Xóa node_modules và reinstall
rm -rf node_modules
npm install

# Hoặc
yarn install
```

#### 2. **"Port 5173 already in use"**

**Giải pháp:**

```bash
# Kill process đang dùng port
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Hoặc dùng port khác
npm run dev -- --port 3000
```

#### 3. **Supabase connection error**

**Giải pháp:**

- Kiểm tra `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong `.env`
- Đảm bảo Supabase project đang hoạt động
- Kiểm tra internet connection
- Thử với curl:
  ```bash
  curl https://your-project-id.supabase.co
  ```

#### 4. **TypeScript errors**

**Giải pháp:**

```bash
# Rebuild TypeScript
npm run build

# Kiểm tra tsconfig
npx tsc --noEmit
```

#### 5. **Vite errors: "Failed to resolve import"**

**Giải pháp:**

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

#### 6. **Environment variables not working**

**Giải pháp:**

- Đảm bảo variables có prefix `VITE_`
- Restart dev server sau khi thay đổi `.env`
- Kiểm tra `.env` không có syntax errors
- Log để verify:
  ```typescript
  console.log(import.meta.env.VITE_SUPABASE_URL);
  ```
