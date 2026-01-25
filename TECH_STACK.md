# Tech Stack & Architecture

## Công nghệ sử dụng

### Frontend

#### Core Framework

- **React 19.2.0**
  - Framework JavaScript hiện đại cho xây dựng giao diện người dùng
  - Sử dụng các tính năng mới nhất như React Compiler, Server Components
  - Component-based architecture giúp tái sử dụng code hiệu quả

- **TypeScript 5.9.3**
  - Ngôn ngữ lập trình strongly-typed dựa trên JavaScript
  - Giúp phát hiện lỗi sớm trong quá trình phát triển
  - Cải thiện trải nghiệm developer với IntelliSense và auto-completion

- **Vite 7.2.4**
  - Build tool và dev server hiện đại
  - Hot Module Replacement (HMR) cực nhanh
  - Build production tối ưu với code splitting

#### UI Components & Styling

- **Radix UI**
  - Thư viện component unstyled, accessible
  - Hỗ trợ đầy đủ keyboard navigation và screen readers
  - Components: Dialog, Dropdown, Select, Tabs, Accordion, v.v.

- **Tailwind CSS 4.1.18**
  - Utility-first CSS framework
  - Styling nhanh chóng với các utility classes
  - Hỗ trợ responsive design và dark mode

- **Lucide React 0.562.0**
  - Thư viện icon SVG hiện đại
  - Hơn 1000+ icons đẹp và nhất quán
  - Tree-shakeable, chỉ bundle icons được sử dụng

- **class-variance-authority (CVA)**
  - Quản lý variant của components
  - Type-safe styling với TypeScript

- **tailwind-merge & clsx**
  - Merge Tailwind classes thông minh
  - Tránh conflict giữa các utility classes

#### Routing & Navigation

- **React Router DOM 7.12.0**
  - Client-side routing
  - Nested routes, lazy loading
  - Dynamic route parameters

#### Forms & Validation

- **React Hook Form 7.69.0**
  - Quản lý form performance cao
  - Validation built-in
  - Ít re-render hơn so với các thư viện khác

#### Maps & Geolocation
- **Maplibre GL 5.16.0**
  - Render bản đồ vector hiệu năng cao
  - Hỗ trợ 3D terrain và custom styling

#### Data Visualization

- **Recharts 3.6.0**
  - Thư viện biểu đồ React declarative
  - Line charts, Bar charts, Area charts, Pie charts
  - Hiển thị xu hướng độ mặn theo thời gian
  - Responsive và customizable

#### State Management

- **React Context API**
  - AuthContext: Quản lý authentication state
  - Không cần thư viện phức tạp như Redux
  - Đủ cho nhu cầu của ứng dụng

#### Utilities

- **date-fns** (implicit via react-day-picker)
  - Thao tác và format ngày tháng
  - Modern, lightweight alternative cho moment.js

- **React Day Picker 9.13.0**
  - Date picker component
  - Chọn ngày để filter dữ liệu độ mặn

#### UI Enhancement

- **Sonner 2.0.7**
  - Toast notifications đẹp và dễ sử dụng
  - Thông báo cho người dùng về các actions

- **Vaul 1.1.2**
  - Drawer component cho mobile
  - Slide-up menus và modals

- **Embla Carousel React 8.6.0**
  - Carousel/slider component
  - Touch-friendly, accessible

- **Input OTP 1.4.2**
  - Input OTP codes
  - Sử dụng cho xác thực 2 yếu tố (2FA)

- **React QR Code 2.0.18**
  - Tạo QR codes
  - Chia sẻ links, profiles

- **React Resizable Panels 4.2.0**
  - Tạo layout với panels có thể resize
  - Split views

#### Theme & Dark Mode (Chưa hoàn thiện)

- **next-themes 0.4.6**
  - Theme management (light/dark mode)
  - Persist theme preference
  - Smooth transition giữa themes

### Backend & Database

#### BaaS (Backend as a Service)

- **Supabase**
  - Open-source Firebase alternative
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication & Authorization
  - Row Level Security (RLS)
  - Storage cho media files
  - Edge Functions (Serverless)

#### Supabase Client

- **@supabase/supabase-js 2.39.0**
  - JavaScript client cho Supabase
  - Type-safe database queries
  - Real-time listeners

### Third-party Services

#### AI & Machine Learning

- **Prophet** (via backend API)
  - Dự báo chuỗi thời gian (time series forecasting)
  - Phát triển bởi Facebook/Meta
  - Dự đoán xu hướng độ mặn trong tương lai

### Development Tools

#### Code Quality

- **ESLint 9.39.1**
  - Linting cho JavaScript/TypeScript
  - Phát hiện lỗi và code smells
  - Enforce coding standards

- **TypeScript ESLint 8.46.4**
  - ESLint plugins cho TypeScript
  - Type-aware linting rules

- **eslint-plugin-react-hooks 7.0.1**
  - Lint rules cho React Hooks
  - Đảm bảo hooks được sử dụng đúng cách

- **eslint-plugin-react-refresh 0.4.24**
  - Lint rules cho React Refresh/Fast Refresh

#### Build & Bundling

- **PostCSS 8.5.6**
  - CSS processor
  - Autoprefixer cho cross-browser compatibility

- **Autoprefixer 10.4.23**
  - Tự động thêm vendor prefixes
  - Hỗ trợ các browser cũ

#### Type Definitions

- **@types/node 24.10.1**
  - TypeScript definitions cho Node.js APIs

- **@types/react 19.2.5**
  - TypeScript definitions cho React

- **@types/react-dom 19.2.3**
  - TypeScript definitions cho React DOM

- **@types/leaflet 1.9.21**
  - TypeScript definitions cho Leaflet

## Kiến trúc hệ thống (Architecture)

### Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                             |
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React Application                      │  |
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  |
│  │  │   Pages     │  │ Components  │  │   Hooks     │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │  Contexts   │  │    Lib      │  │   Types     │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              │ HTTP/WebSocket                   │
│                              ▼                                  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND SIDE                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Supabase Platform                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │ PostgreSQL  │  │     Auth    │  │   Storage   │        │  │
│  │  │  Database   │  │   Service   │  │   Service   │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │  Realtime   │  │    Edge     │  │   Storage   │        │  │
│  │  │  Database   │  │  Functions  │  │    Rules    │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Resend    │  │   Prophet   │  │ MapLibre-GL │              │
│  │   (Email)   │  │   (AI/ML)   │  │   (Map)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Client-side Architecture

#### Layer Structure

1. **Presentation Layer** (Pages & Components)
   - Các trang chính: Dashboard, Settings, Auth, Admin
   - UI Components: Buttons, Forms, Modals, Charts
   - Reusable components với Radix UI + Tailwind

2. **Business Logic Layer** (Lib)
   - Authentication logic (`lib/auth/`)
   - Salinity data processing (`lib/salinity/`)
   - Analytics calculations (`lib/analytics/`)
   - Community features (`lib/community/`)
   - Admin operations (`lib/admin/`)

3. **Data Access Layer** (Lib/Supabase)
   - Supabase client configuration
   - Database queries và mutations
   - Real-time subscriptions
   - Storage operations

4. **State Management**
   - React Context cho global state
   - React Hooks cho local state
   - Custom hooks cho reusable logic

### Backend Architecture (Supabase)

#### Database Schema

- **PostgreSQL Database** với các bảng chính:
  - `profiles`: Thông tin người dùng
  - `posts`: Bài viết cộng đồng
  - `comments`: Bình luận (nested)
  - `likes`: Lượt thích
  - `follows`: Theo dõi người dùng
  - `investments`: Dự án đầu tư
  - `project_ratings`: Đánh giá dự án
  - `notifications`: Thông báo
  - `achievements`: Huy hiệu/thành tựu
  - `admin_actions`: Hành động quản trị
  - `analytics_*`: Các bảng analytics
  - `salinity_*`: Dữ liệu độ mặn (giả định)

#### Row Level Security (RLS)

- Bảo mật cấp row với PostgreSQL policies
- Người dùng chỉ có thể truy cập dữ liệu của mình
- Admin có quyền cao hơn
- Public content được filter theo approved status

#### Real-time Subscriptions

- Listen to database changes
- Update UI tức thì khi có thay đổi
- Notifications real-time

#### Edge Functions

- **Serverless functions** chạy trên Deno runtime
- `send-contact-email`: Gửi email liên hệ
- `reset-password`: Xử lý reset password
- Deploy gần user cho latency thấp

#### Storage

- Lưu trữ avatars, images, videos
- Public và private buckets
- CDN integration

### Data Flow

#### Authentication Flow

```
User → LoginForm → supabase.auth.signInWithPassword()
                 ↓
              Supabase Auth Service
                 ↓
              JWT Token
                 ↓
              AuthContext (React)
                 ↓
              Protected Routes
```

#### Data Fetching Flow

```
Component → Custom Hook (e.g., usePosts)
               ↓
           Lib Function (e.g., lib/community/posts.ts)
               ↓
           Supabase Client
               ↓
           PostgreSQL Query
               ↓
           Return Data
               ↓
           Update Component State
```

#### Real-time Update Flow

```
Database Change (INSERT/UPDATE/DELETE)
               ↓
       Supabase Realtime
               ↓
       WebSocket to Client
               ↓
       Subscription Callback
               ↓
       Update React State
               ↓
       Re-render Component
```

### Security Architecture

#### Authentication

- JWT tokens cho authentication
- Refresh tokens cho session management
- OAuth providers (Google, GitHub - nếu cấu hình)
- 2FA với OTP codes

#### Authorization

- Row Level Security (RLS) policies
- Role-based access control (user, admin)
- API keys cho external services

#### Data Protection

- HTTPS only
- Encrypted passwords (bcrypt)
- Sanitize user inputs
- CORS configuration

### Performance Optimization

#### Client-side

- Code splitting với React.lazy()
- Image optimization
- Lazy loading components
- Memoization với React.memo(), useMemo(), useCallback()
- Debouncing/throttling cho search, filters

#### Backend

- Database indexes
- Query optimization
- Connection pooling
- CDN cho static assets

#### Caching Strategy

- Browser caching
- React Query / SWR (nếu sử dụng)
- Supabase caching

### Scalability Considerations

#### Horizontal Scaling

- Supabase tự động scale
- Edge Functions scale theo demand
- CDN distribute load globally

#### Database Scaling

- PostgreSQL read replicas (Supabase Pro)
- Connection pooling với PgBouncer
- Partitioning cho large tables

#### Monitoring & Logging

- Supabase Dashboard analytics
- Error tracking (có thể tích hợp Sentry)
- Performance monitoring
- Database query performance