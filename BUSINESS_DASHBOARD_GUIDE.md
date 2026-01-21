# 📊 Business Dashboard - Trang Quản Lý Bán Hàng Chuyên Nghiệp

## 🎯 Tổng Quan

Trang **Business Dashboard** là trung tâm quản lý bán hàng chuyên nghiệp dành riêng cho tài khoản **business**, bao gồm:

- 📈 Thống kê doanh thu real-time
- 📦 Quản lý đơn hàng
- 💳 Theo dõi thanh toán
- 📊 Biểu đồ phân tích
- 👥 Quản lý khách hàng
- 💰 Quản lý công nợ

---

## ✨ Tính Năng Chính

### 1. Stats Cards (Thẻ Thống Kê)

**4 thẻ thống kê chính**:

#### 💙 Tổng Doanh Thu

- **Hiển thị**: Tổng doanh thu từ các đơn hoàn thành
- **Màu sắc**: Gradient xanh dương
- **Icon**: DollarSign
- **Thông tin thêm**: % tăng trưởng so với tháng trước

#### 💚 Tổng Đơn Hàng

- **Hiển thị**: Tổng số đơn hàng
- **Màu sắc**: Gradient xanh lá
- **Icon**: ShoppingCart
- **Thông tin thêm**: Số đơn hoàn thành

#### 🧡 Đơn Chờ Xử Lý

- **Hiển thị**: Đơn hàng pending/processing
- **Màu sắc**: Gradient cam
- **Icon**: Clock
- **Thông tin thêm**: Cảnh báo cần xử lý

#### 💜 Doanh Số Công Nợ

- **Hiển thị**: Tổng tiền bán trả sau
- **Màu sắc**: Gradient tím
- **Icon**: CreditCard
- **Thông tin thêm**: Số giao dịch công nợ

---

### 2. Period Filter (Bộ Lọc Thời Gian)

**4 khoảng thời gian**:

- 🕐 **Hôm nay**: Thống kê trong ngày
- 📅 **7 ngày**: Tuần vừa qua
- 📆 **30 ngày**: Tháng vừa qua (mặc định)
- 📊 **Năm nay**: Cả năm hiện tại

**Xuất báo cáo**: Button download để export dữ liệu (PDF/Excel)

---

### 3. Revenue Chart (Biểu Đồ Doanh Thu)

**Placeholder sẵn sàng tích hợp**:

- Thư viện khuyên dùng: **Recharts** hoặc **Chart.js**
- Hiển thị: Line chart/Bar chart theo thời gian
- Toggle: Doanh thu vs Đơn hàng
- Responsive design

**Cài đặt Recharts**:

```bash
npm install recharts
```

---

### 4. Orders List (Danh Sách Đơn Hàng)

**Table đầy đủ thông tin**:

| Cột             | Nội Dung           | Định Dạng                     |
| --------------- | ------------------ | ----------------------------- |
| **Mã đơn**      | transaction_code   | Font mono, màu xanh           |
| **Khách hàng**  | Avatar + Username  | Component với gradient avatar |
| **Loại**        | immediate/credit   | Badge màu sắc                 |
| **Phương thức** | bank/e-wallet/card | Text tiếng Việt               |
| **Số tiền**     | final_amount       | Format VND, font bold         |
| **Trạng thái**  | Status badge       | Icon + màu theo trạng thái    |
| **Thời gian**   | created_at         | Format dd/mm/yyyy hh:mm       |

**Status Badges**:

- 🟡 **Chờ xử lý** (pending): Vàng + Clock icon
- 🔵 **Đang xử lý** (processing): Xanh dương + AlertCircle
- 🟢 **Hoàn thành** (completed): Xanh lá + CheckCircle
- 🔴 **Thất bại** (failed): Đỏ + XCircle
- ⚪ **Đã hủy** (cancelled): Xám + XCircle

**Filter Dropdown**:

- Lọc theo trạng thái
- Realtime update khi thay đổi

---

### 5. Quick Actions (Hành Động Nhanh)

**3 buttons hữu ích**:

1. **📦 Đăng sản phẩm mới**
   - Chuyển đến trang Products
   - Mở modal tạo sản phẩm

2. **👥 Quản lý khách hàng**
   - Xem danh sách khách hàng
   - Quản lý credit limits

3. **💳 Quản lý công nợ**
   - Theo dõi receivables
   - Xem aging analysis

---

## 🏗️ Cấu Trúc Code

### Component: BusinessDashboardPage.tsx

```typescript
// State Management
- loading: boolean
- stats: PaymentDashboardStats | null
- transactions: PaymentTransactionWithDetails[]
- selectedPeriod: "today" | "week" | "month" | "year"
- selectedStatus: string

// Data Loading
- loadDashboardData(): Load stats + transactions
- Uses: getUserTransactions() + getPaymentDashboardStats()

// Helper Functions
- formatCurrency(amount): Format VND
- formatDate(dateString): Format dd/mm/yyyy hh:mm
- getStatusBadge(status): Render status badge
- getPaymentMethodLabel(method): Translate payment method

// Calculations
- totalRevenue: Sum of completed transactions
- totalOrders: Count all transactions
- completedOrders: Count completed
- pendingOrders: Count pending/processing
```

---

## 🎨 Design System

### Colors

**Status Colors**:

```css
pending: bg-yellow-100 text-yellow-800
processing: bg-blue-100 text-blue-800
completed: bg-green-100 text-green-800
failed: bg-red-100 text-red-800
cancelled: bg-gray-100 text-gray-800
```

**Stats Cards Gradients**:

```css
Revenue: from-blue-500 to-blue-600
Orders: from-green-500 to-green-600
Pending: from-orange-500 to-orange-600
Credit: from-purple-500 to-purple-600
```

### Typography

- **Headers**: text-3xl font-bold (Trang chủ)
- **Card titles**: text-xl font-bold
- **Stats numbers**: text-2xl font-bold
- **Table headers**: text-sm font-semibold
- **Table data**: text-sm

### Spacing

- Container: max-w-7xl mx-auto px-4 py-8
- Card padding: p-6
- Grid gaps: gap-6
- Section margins: mb-8

---

## 🔌 API Integration

### Services Used

```typescript
// payment.service.ts
1. getUserTransactions(filters)
   - filters: { role: "seller", status?: string }
   - Returns: transactions[]

2. getPaymentDashboardStats()
   - Returns: PaymentDashboardStats
   - Contains: total_revenue, total_credit, etc.
```

### Data Flow

```
BusinessDashboardPage
    │
    ├─→ getUserTransactions()
    │   └─→ Supabase: payment_transactions table
    │       └─→ Filter: seller_id = auth.uid()
    │
    └─→ getPaymentDashboardStats()
        └─→ Supabase: Aggregate queries
            └─→ Sum amounts, count transactions
```

---

## 🚀 Navigation & Routing

### Navigation Setup

**File**: `src/app/components/Navigation.tsx`

```typescript
{
  id: "business-dashboard",
  label: "Quản lý bán hàng",
  icon: BarChart3,
  roles: ["business"]  // Chỉ business mới thấy
}
```

### App Routing

**File**: `src/app/App.tsx`

```typescript
// Allowed pages for business
const allowedPages = [
  "invest",
  "profile",
  "settings",
  "create-project",
  "edit-project",
  "products",
  "business-dashboard"  // ← MỚI
];

// Render
case "business-dashboard":
  return <BusinessDashboardPage />;
```

### Default Page

- **Business users**: Redirect về `business-dashboard` thay vì `invest`
- **Farmer users**: Vẫn redirect về `dashboard` như cũ

---

## 📱 Responsive Design

### Breakpoints

```css
Mobile: < 768px
  - Stack cards vertically
  - 1 column grid
  - Horizontal scroll table

Tablet: 768px - 1024px
  - 2 columns for stats cards
  - Responsive table

Desktop: > 1024px
  - 4 columns for stats cards
  - Full width table
  - Side-by-side layouts
```

### Mobile Optimizations

- Touch-friendly buttons (min 44px)
- Swipeable table on mobile
- Collapsed filters on small screens
- Bottom navigation accessible

---

## 🧪 Testing Scenarios

### Test 1: Business User Login

1. Đăng nhập với role = `business`
2. **Kỳ vọng**: Tự động chuyển đến Business Dashboard
3. Navigation hiển thị "Quản lý bán hàng"
4. **Kết quả**: ✅ Pass / ❌ Fail

### Test 2: Stats Display

1. Có ít nhất 1 completed transaction
2. **Kỳ vọng**:
   - Tổng doanh thu > 0
   - Card hiển thị số tiền đúng
   - Format VND chính xác
3. **Kết quả**: ✅ Pass / ❌ Fail

### Test 3: Orders List

1. Có transactions trong DB
2. **Kỳ vọng**:
   - Table hiển thị đầy đủ thông tin
   - Status badges đúng màu
   - Hover effects hoạt động
3. **Kết quả**: ✅ Pass / ❌ Fail

### Test 4: Filters

1. Thay đổi period filter
2. Thay đổi status filter
3. **Kỳ vọng**:
   - Data reload
   - Table update với filtered results
4. **Kết quả**: ✅ Pass / ❌ Fail

### Test 5: Empty State

1. Business mới, chưa có đơn
2. **Kỳ vọng**:
   - Hiển thị empty state với icon
   - Message hướng dẫn
3. **Kết quả**: ✅ Pass / ❌ Fail

---

## 🔮 Future Enhancements

### Phase 2 Features

1. **📊 Real Charts Integration**

   ```typescript
   import { LineChart, BarChart } from "recharts";
   // Implement revenue/orders chart
   ```

2. **📥 Export Reports**
   - PDF export với logo
   - Excel export với raw data
   - Email scheduled reports

3. **🔔 Real-time Notifications**
   - Toast khi có đơn mới
   - Sound notification (optional)
   - WebSocket integration

4. **📱 Order Details Modal**
   - Click vào row → Mở modal chi tiết
   - Hiển thị product info
   - Customer contact info
   - Payment timeline

5. **💬 Customer Messages**
   - Chat trực tiếp với khách
   - Order notes/comments
   - Support tickets

6. **📈 Advanced Analytics**
   - Revenue by product
   - Top customers
   - Sales funnel
   - Conversion rate

7. **🎨 Customizable Dashboard**
   - Drag & drop widgets
   - Choose metrics to display
   - Save preferences

---

## 📊 Data Requirements

### Minimum Data for Full Display

**Database Tables Needed**:

- ✅ payment_transactions (migrations 027, 029, 030)
- ✅ profiles (existing)
- ✅ products (existing)

**Sample Data**:

```sql
-- Cần ít nhất 5-10 transactions để dashboard có ý nghĩa
-- Mix của immediate và credit transactions
-- Different statuses (pending, completed, etc.)
```

**Create Test Data**:

```sql
-- Sau khi chạy migrations 027-030
-- Tạo vài transactions test bằng UI
-- Hoặc insert manual vào DB
```

---

## 🐛 Troubleshooting

### Dashboard không load

**Nguyên nhân**: Migrations chưa chạy
**Giải pháp**: Chạy migrations 027, 028, 029, 030

### Stats hiển thị 0

**Nguyên nhân**: Chưa có transactions hoặc RLS blocking
**Giải pháp**:

- Tạo test transactions
- Check RLS policies (migration 030)

### Table empty

**Nguyên nhân**: Filter quá strict hoặc không có data
**Giải pháp**:

- Reset filter về "all"
- Check auth.uid() = seller_id

### 406 Errors

**Nguyên nhân**: RLS policies
**Giải pháp**: Chạy migration 030

---

## ✅ Checklist Triển Khai

- [ ] Migrations 027-030 đã chạy thành công
- [ ] BusinessDashboardPage.tsx created
- [ ] Navigation.tsx updated (thêm menu item)
- [ ] App.tsx updated (thêm route + allowed pages)
- [ ] Test với business user
- [ ] Stats cards hiển thị đúng
- [ ] Orders table render properly
- [ ] Filters hoạt động
- [ ] Responsive trên mobile
- [ ] Empty states hiển thị đẹp

---

## 📝 Summary

**Trang Dashboard Business bao gồm**:

- ✅ 4 stats cards với gradients đẹp
- ✅ Period filters (today/week/month/year)
- ✅ Revenue chart placeholder (ready for integration)
- ✅ Full-featured orders table
- ✅ Status badges với icons
- ✅ Quick action buttons
- ✅ Responsive design
- ✅ Empty states
- ✅ Professional UI/UX

**Chỉ dành cho**: Business users (role = 'business')  
**Auto redirect**: Business → business-dashboard  
**Navigation**: Menu "Quản lý bán hàng" với icon BarChart3
