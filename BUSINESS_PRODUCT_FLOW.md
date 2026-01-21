# Hướng Dẫn Luồng Sản Phẩm Doanh Nghiệp - Thanh Toán

## 📋 Tổng Quan

Hệ thống hiện có **2 luồng sản phẩm** khác nhau:

### Luồng 1: Sản Phẩm Nông Dân (Đã Có - Không Thay Đổi)

- **Người đăng**: Nông dân (role: `farmer`)
- **Quy trình**: Đăng sản phẩm → Admin duyệt → Hiển thị
- **Hành động**: Nút "**Liên hệ Zalo**" (màu xanh dương)
- **Mục đích**: Liên hệ trực tiếp qua Zalo để thương lượng

### Luồng 2: Sản Phẩm Doanh Nghiệp (MỚI)

- **Người đăng**: Doanh nghiệp (role: `business`)
- **Quy trình**: Đăng sản phẩm → Admin duyệt → Hiển thị
- **Hành động**: Nút "**Mua ngay**" (màu xanh lá)
- **Mục đích**: Mua hàng trực tiếp với thanh toán qua hệ thống

---

## 🔧 Thay Đổi Đã Thực Hiện

### 1. Database Migration (028)

**File**: `supabase/migrations/028_add_seller_role_to_products.sql`

Cập nhật 2 RPC functions để trả về `seller_role`:

- `get_products_with_stats()` - Danh sách sản phẩm
- `get_product_with_stats()` - Chi tiết 1 sản phẩm

**Trường mới**:

- `seller_role`: `'farmer'` hoặc `'business'` (lấy từ `profiles.role`)

### 2. TypeScript Types

**File**: `src/lib/community/types.ts`

```typescript
export interface ProductWithStats extends Product {
  seller_username: string;
  seller_points: number;
  seller_role: "farmer" | "business"; // ← MỚI
}
```

### 3. ProductCard Component

**File**: `src/app/components/ProductCard.tsx`

**Thay đổi**:

- Thêm prop `onBuyClick?: () => void`
- Import icon `ShoppingCart` từ lucide-react
- Logic điều kiện: `isBusinessProduct = product.seller_role === 'business'`
- Hiển thị 2 loại nút khác nhau:

```tsx
{
  isBusinessProduct ? (
    // Nút Mua (xanh lá) - Doanh nghiệp
    <button className="bg-green-600">
      <ShoppingCart /> Mua ngay
    </button>
  ) : (
    // Nút Zalo (xanh dương) - Nông dân
    <button className="bg-blue-600">
      <Phone /> Liên hệ Zalo
    </button>
  );
}
```

### 4. ProductsPage Component

**File**: `src/app/pages/ProductsPage.tsx`

**Thêm mới**:

- Import `PaymentModal` component
- State `showPaymentModal` và `productToBuy`
- Function `handleBuyProduct()`: Xử lý khi click "Mua ngay"
- Function `handlePaymentSuccess()`: Xử lý sau khi thanh toán thành công
- Render `PaymentModal` khi có sản phẩm được chọn

**Validation**:

- Kiểm tra user đã đăng nhập chưa
- Kiểm tra không được mua sản phẩm của chính mình

---

## 🚀 Triển Khai

### Bước 1: Chạy Migration

```sql
-- Chạy trong Supabase SQL Editor
-- Copy nội dung file: supabase/migrations/028_add_seller_role_to_products.sql
```

### Bước 2: Chạy Migration 027 (Nếu Chưa)

```sql
-- Chạy trong Supabase SQL Editor
-- Copy nội dung file: supabase/migrations/027_payment_credit_system.sql
```

### Bước 3: Test Trên Localhost

```bash
cd "final app"
npm run dev
```

---

## 📊 Luồng Hoạt Động

### A. Người Bán (Doanh Nghiệp)

1. Đăng ký tài khoản với role `business`
2. Đăng sản phẩm lên hệ thống
3. Chờ admin duyệt (status = `pending`)
4. Sau khi duyệt (status = `approved`), sản phẩm hiển thị với nút "Mua ngay"

### B. Người Mua (Nông Dân / Doanh Nghiệp)

1. Xem danh sách sản phẩm
2. **Nếu sản phẩm nông dân**: Click "Liên hệ Zalo" → Mở Zalo chat
3. **Nếu sản phẩm doanh nghiệp**: Click "Mua ngay" → Mở PaymentModal
4. Chọn phương thức thanh toán:
   - **Trả liền**: Chuyển khoản ngân hàng / Ví điện tử / Thẻ tín dụng
   - **Trả sau**: Sử dụng hạn mức công nợ (nếu có)
5. Xác nhận thanh toán
6. Hệ thống tạo:
   - `payment_transactions`: Giao dịch thanh toán
   - `receivables`: Khoản phải thu (nếu trả sau)
7. Hiển thị thông báo thành công

---

## 🎨 Giao Diện Phân Biệt

### Sản Phẩm Nông Dân

```
┌─────────────────────────┐
│   [Hình ảnh sản phẩm]   │
│   Danh mục: Giống cây   │
├─────────────────────────┤
│ Tên: Giống lúa ST25     │
│ Giá: 50,000đ/kg         │
│ Người bán: farmer_user  │
├─────────────────────────┤
│  📞  Liên hệ Zalo       │ ← Xanh dương
└─────────────────────────┘
```

### Sản Phẩm Doanh Nghiệp

```
┌─────────────────────────┐
│   [Hình ảnh sản phẩm]   │
│   Danh mục: Phân bón    │
├─────────────────────────┤
│ Tên: Phân NPK 16-16-8   │
│ Giá: 350,000đ/bao       │
│ Người bán: company_biz  │
├─────────────────────────┤
│  🛒  Mua ngay           │ ← Xanh lá
└─────────────────────────┘
```

---

## 🔐 Bảo Mật & Validation

### Client-side (ProductsPage)

- ✅ Kiểm tra đã đăng nhập
- ✅ Không cho phép mua sản phẩm của chính mình

### Database (RLS Policies)

- ✅ Chỉ hiển thị sản phẩm đã duyệt (`moderation_status = 'approved'`)
- ✅ Buyer chỉ tạo được transaction với `buyer_id = auth.uid()`
- ✅ Seller quản lý được giao dịch với `seller_id = auth.uid()`

---

## 📈 Dữ Liệu Mẫu

### Tạo User Doanh Nghiệp

```sql
-- User đã tồn tại, chỉ cần update role
UPDATE profiles
SET role = 'business'
WHERE id = '<user_id>';
```

### Tạo Sản Phẩm Doanh Nghiệp

```sql
INSERT INTO products (
  user_id,
  name,
  description,
  price,
  category,
  contact,
  moderation_status
) VALUES (
  '<business_user_id>',
  'Phân bón NPK 16-16-8',
  'Phân bón chuyên dụng cho lúa, giúp tăng năng suất',
  350000,
  'Phân bón',
  '0901234567',
  'approved'
);
```

### Tạo Hạn Mức Công Nợ (Optional)

```sql
INSERT INTO credit_limits (
  business_id,
  customer_id,
  credit_limit,
  default_term_days,
  default_interest_rate,
  is_active
) VALUES (
  '<business_user_id>',
  '<farmer_user_id>',
  10000000, -- 10 triệu
  30, -- 30 ngày
  2.0, -- 2% lãi suất
  true
);
```

---

## 🧪 Kịch Bản Test

### Test 1: Sản Phẩm Nông Dân (Không Thay Đổi)

1. Đăng nhập với user role = `farmer`
2. Vào trang Products
3. Xem sản phẩm của nông dân khác
4. **Kỳ vọng**: Thấy nút "Liên hệ Zalo" màu xanh dương
5. Click nút → Mở Zalo chat

### Test 2: Sản Phẩm Doanh Nghiệp - Trả Liền

1. Đăng nhập với user role = `farmer`
2. Vào trang Products
3. Xem sản phẩm của doanh nghiệp
4. **Kỳ vọng**: Thấy nút "Mua ngay" màu xanh lá
5. Click "Mua ngay"
6. **Kỳ vọng**: Mở PaymentModal
7. Chọn phương thức: "Trả liền" → Chọn "Chuyển khoản ngân hàng"
8. Chọn số lượng
9. Click "Thanh toán"
10. **Kỳ vọng**:
    - Tạo transaction với `status = 'completed'`
    - Hiển thị thông báo thành công
    - Đóng modal

### Test 3: Sản Phẩm Doanh Nghiệp - Trả Sau

1. Đăng nhập với user có hạn mức công nợ
2. Click "Mua ngay" trên sản phẩm doanh nghiệp
3. PaymentModal hiển thị:
   - Hạn mức: 10,000,000đ
   - Còn lại: 10,000,000đ
4. Chọn "Trả sau (Công nợ)"
5. Chọn kỳ hạn: 30 ngày
6. Xem lãi suất và tổng tiền
7. Click "Xác nhận thanh toán"
8. **Kỳ vọng**:
   - Tạo `payment_transactions` với `type = 'credit'`
   - Tạo `receivables` với `status = 'pending'`
   - Cập nhật `credit_limits.used_credit`
   - Hiển thị thông báo thành công

### Test 4: Validation

1. Chưa đăng nhập → Click "Mua ngay"
   - **Kỳ vọng**: Alert "Vui lòng đăng nhập"
2. Đăng nhập với chính chủ sản phẩm → Click "Mua ngay"
   - **Kỳ vọng**: Alert "Không thể mua sản phẩm của chính mình"
3. Không có hạn mức → Chọn "Trả sau"
   - **Kỳ vọng**: Hiển thị thông báo "Không có hạn mức công nợ"

---

## 📁 Files Đã Thay Đổi

```
supabase/
  migrations/
    027_payment_credit_system.sql          (MỚI - ĐÃ FIX)
    028_add_seller_role_to_products.sql    (MỚI)

src/
  lib/
    community/
      types.ts                              (CẬP NHẬT)
    payment/
      types.ts                              (MỚI)
      payment.service.ts                    (MỚI)
      credit.service.ts                     (MỚI)
      receivables.service.ts                (MỚI)
  app/
    components/
      ProductCard.tsx                       (CẬP NHẬT)
      PaymentModal.tsx                      (MỚI)
    pages/
      ProductsPage.tsx                      (CẬP NHẬT)
```

---

## 🎯 Tính Năng Chính

### ✅ Đã Hoàn Thành

- [x] Phân biệt 2 loại sản phẩm dựa trên `seller_role`
- [x] Hiển thị nút khác nhau cho từng loại
- [x] Tích hợp PaymentModal vào ProductsPage
- [x] Validation: đăng nhập, không tự mua
- [x] Hệ thống thanh toán đầy đủ (trả liền + trả sau)
- [x] Quản lý hạn mức công nợ
- [x] Tracking receivables (khoản phải thu)
- [x] Tính lãi suất và phí trả chậm

### 🚧 Tính Năng Mở Rộng (Tương Lai)

- [ ] Dashboard quản lý đơn hàng cho Seller
- [ ] Dashboard xem công nợ cho Buyer
- [ ] Tích hợp cổng thanh toán thực (VNPay, MoMo)
- [ ] Email/SMS thông báo đơn hàng
- [ ] Hệ thống đánh giá sau mua hàng
- [ ] Invoice PDF tự động
- [ ] Báo cáo doanh thu cho Seller

---

## 🐛 Troubleshooting

### Lỗi: Không thấy nút "Mua ngay"

- **Nguyên nhân**: Migration 028 chưa chạy hoặc seller không có role `business`
- **Giải pháp**:
  1. Chạy migration 028
  2. Check `profiles.role` của seller
  3. Clear cache và reload trang

### Lỗi: PaymentModal không mở

- **Nguyên nhân**: Missing import hoặc props
- **Giải pháp**: Check console errors, đảm bảo PaymentModal được import

### Lỗi: Immutable function error (Migration 027)

- **Nguyên nhân**: Đã fix bằng VIEW trong version cuối
- **Giải pháp**: Sử dụng file migration 027 đã fix (trong workspace)

### Lỗi: Credit limit không hoạt động

- **Nguyên nhân**: Chưa tạo credit_limits cho customer
- **Giải pháp**: Tạo credit limit bằng SQL hoặc UI (cần xây dựng)

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:

1. ✅ Migration 027 và 028 đã chạy
2. ✅ User có đúng role (`farmer` / `business`)
3. ✅ Sản phẩm đã được admin duyệt (`moderation_status = 'approved'`)
4. ✅ Browser console không có errors
5. ✅ Supabase RLS policies cho phép truy cập

---

## 🎉 Kết Luận

Hệ thống hiện có **2 luồng sản phẩm hoàn chỉnh**:

- **Nông dân**: Liên hệ Zalo (không thay đổi)
- **Doanh nghiệp**: Mua hàng với thanh toán trả liền/trả sau (MỚI)

Luồng được phân biệt **tự động** dựa trên `profiles.role` của người bán!
