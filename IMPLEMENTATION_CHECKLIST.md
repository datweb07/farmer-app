# ✅ Checklist Triển Khai Luồng Sản Phẩm Doanh Nghiệp

## 📋 Bước Triển Khai

### 1. Database Setup

- [ ] **Chạy Migration 027** - Payment & Credit System

  ```sql
  -- Copy nội dung file: supabase/migrations/027_payment_credit_system.sql
  -- Paste vào Supabase SQL Editor và Execute
  ```

  - Tạo 6 tables: payment_transactions, credit_limits, receivables, payment_installments, pricing_rules, financial_partners
  - Tạo 9 RPC functions
  - Tạo 4 triggers
  - Setup RLS policies

- [ ] **Chạy Migration 028** - Add Seller Role
  ```sql
  -- Copy nội dung file: supabase/migrations/028_add_seller_role_to_products.sql
  -- Paste vào Supabase SQL Editor và Execute
  ```

  - Cập nhật `get_products_with_stats()` với trường `seller_role`
  - Cập nhật `get_product_with_stats()` với trường `seller_role`

### 2. Tạo Dữ Liệu Test

- [ ] **Tạo User Doanh Nghiệp**

  ```sql
  -- Option 1: Update user hiện có
  UPDATE profiles SET role = 'business' WHERE id = '<user_id>';

  -- Option 2: Đăng ký user mới và chọn role "Doanh nghiệp"
  ```

- [ ] **Tạo Sản Phẩm Test**

  ```sql
  INSERT INTO products (
    user_id, name, description, price, category, contact, moderation_status
  ) VALUES (
    '<business_user_id>',
    'Phân bón NPK Test',
    'Sản phẩm test thanh toán',
    100000,
    'Phân bón',
    '0901234567',
    'approved'
  );
  ```

- [ ] **Tạo Hạn Mức Công Nợ (Optional)**
  ```sql
  INSERT INTO credit_limits (
    business_id, customer_id, credit_limit,
    default_term_days, default_interest_rate, is_active
  ) VALUES (
    '<business_user_id>',
    '<farmer_user_id>',
    5000000, 30, 2.0, true
  );
  ```

### 3. Kiểm Tra Code

- [x] ✅ ProductCard.tsx - Hiển thị nút đúng theo seller_role
- [x] ✅ ProductsPage.tsx - Tích hợp PaymentModal
- [x] ✅ types.ts - Thêm seller_role vào ProductWithStats
- [x] ✅ PaymentModal.tsx - Component sẵn sàng
- [x] ✅ Payment services - API layer hoàn chỉnh

### 4. Test Chức Năng

#### Test A: Sản Phẩm Nông Dân (Không Đổi)

- [ ] Đăng nhập với user role = `farmer`
- [ ] Vào trang Products
- [ ] Tìm sản phẩm của nông dân (seller_role = 'farmer')
- [ ] Kiểm tra: Hiển thị nút "**Liên hệ Zalo**" (xanh dương)
- [ ] Click nút → Mở Zalo chat
- [ ] **Kết quả**: ✅ Pass / ❌ Fail

#### Test B: Sản Phẩm Doanh Nghiệp - Trả Liền

- [ ] Đăng nhập với user khác (không phải chủ sản phẩm)
- [ ] Tìm sản phẩm của doanh nghiệp (seller_role = 'business')
- [ ] Kiểm tra: Hiển thị nút "**Mua ngay**" (xanh lá)
- [ ] Click "Mua ngay" → PaymentModal xuất hiện
- [ ] Chọn "Trả liền" → Chọn "Chuyển khoản ngân hàng"
- [ ] Nhập số lượng: 2
- [ ] Kiểm tra tổng tiền tính đúng
- [ ] Click "Thanh toán"
- [ ] Kiểm tra DB: `payment_transactions` được tạo
- [ ] Kiểm tra: Alert thành công
- [ ] **Kết quả**: ✅ Pass / ❌ Fail

#### Test C: Sản Phẩm Doanh Nghiệp - Trả Sau

- [ ] Đảm bảo có credit_limit cho customer
- [ ] Click "Mua ngay" trên sản phẩm doanh nghiệp
- [ ] Kiểm tra: Hiển thị hạn mức và số dư
- [ ] Chọn "Trả sau (Công nợ)"
- [ ] Chọn kỳ hạn: 30 ngày
- [ ] Kiểm tra: Lãi suất hiển thị đúng
- [ ] Click "Xác nhận thanh toán"
- [ ] Kiểm tra DB:
  - [ ] `payment_transactions` type = 'credit'
  - [ ] `receivables` được tạo
  - [ ] `credit_limits.used_credit` tăng
- [ ] **Kết quả**: ✅ Pass / ❌ Fail

#### Test D: Validation

- [ ] **Chưa đăng nhập** → Click "Mua ngay"
  - Kỳ vọng: Alert "Vui lòng đăng nhập"
  - **Kết quả**: ✅ Pass / ❌ Fail

- [ ] **Chủ sản phẩm** → Click "Mua ngay" sản phẩm của mình
  - Kỳ vọng: Alert "Không thể mua sản phẩm của chính mình"
  - **Kết quả**: ✅ Pass / ❌ Fail

- [ ] **Không có hạn mức** → Chọn "Trả sau"
  - Kỳ vọng: Thông báo "Không có hạn mức công nợ"
  - **Kết quả**: ✅ Pass / ❌ Fail

### 5. UI/UX Check

- [ ] Nút "Mua ngay" màu xanh lá (green-600) hiển thị đúng
- [ ] Nút "Liên hệ Zalo" màu xanh dương (blue-600) hiển thị đúng
- [ ] PaymentModal mở/đóng mượt mà
- [ ] Loading states hoạt động
- [ ] Error messages rõ ràng
- [ ] Responsive trên mobile

### 6. Performance & Security

- [ ] RLS policies hoạt động (user chỉ thấy giao dịch của mình)
- [ ] Migration 027 và 028 chạy không lỗi
- [ ] Console không có errors
- [ ] Network requests < 2s
- [ ] No memory leaks

---

## 🎯 Kết Quả Mong Đợi

### Luồng Hoạt Động Hoàn Chỉnh

```
┌─────────────────────────────────────────┐
│         USER VÀO TRANG PRODUCTS         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │  XEM SẢN PHẨM   │
        └────────┬─────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌──────────┐         ┌──────────┐
│ FARMER   │         │ BUSINESS │
│ PRODUCT  │         │ PRODUCT  │
└────┬─────┘         └────┬─────┘
     │                    │
     ▼                    ▼
┌──────────┐         ┌──────────┐
│ LIÊN HỆ  │         │   MUA    │
│   ZALO   │         │   NGAY   │
└────┬─────┘         └────┬─────┘
     │                    │
     ▼                    ▼
┌──────────┐         ┌──────────┐
│ MỞ ZALO  │         │ PAYMENT  │
│   CHAT   │         │  MODAL   │
└──────────┘         └────┬─────┘
                          │
                    ┌─────┴─────┐
                    │           │
                    ▼           ▼
              ┌─────────┐  ┌─────────┐
              │ TRẢ LIỀN│  │ TRẢ SAU │
              └────┬────┘  └────┬────┘
                   │            │
                   ▼            ▼
              ┌─────────┐  ┌─────────┐
              │ THANH   │  │ TẠO     │
              │ TOÁN    │  │ CÔNG NỢ │
              └────┬────┘  └────┬────┘
                   │            │
                   └──────┬─────┘
                          ▼
                   ┌─────────────┐
                   │   SUCCESS   │
                   │  THÔNG BÁO  │
                   └─────────────┘
```

---

## 📊 Metrics Kiểm Tra

### Database

```sql
-- Kiểm tra RPC functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('get_products_with_stats', 'get_product_with_stats');

-- Kiểm tra tables
SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
  'payment_transactions', 'credit_limits', 'receivables',
  'payment_installments', 'pricing_rules', 'financial_partners'
);

-- Kiểm tra seller_role trong products
SELECT
  p.name,
  pr.role as seller_role
FROM products p
JOIN profiles pr ON p.user_id = pr.id
LIMIT 5;
```

### Frontend

```javascript
// Check trong browser console
console.log("ProductWithStats có seller_role?", product.seller_role);
console.log("PaymentModal imported?", typeof PaymentModal);
```

---

## 🐛 Common Issues & Fixes

| Vấn Đề                       | Nguyên Nhân              | Giải Pháp                |
| ---------------------------- | ------------------------ | ------------------------ |
| Không thấy nút "Mua ngay"    | Migration 028 chưa chạy  | Chạy migration 028       |
| seller_role undefined        | RPC function chưa update | Clear cache, reload      |
| PaymentModal lỗi             | Missing dependencies     | Check imports            |
| Credit limit không hoạt động | Chưa tạo credit_limits   | Tạo bằng SQL             |
| Transaction không tạo        | RLS policy block         | Check auth & permissions |

---

## ✨ Hoàn Thành

Khi tất cả checkboxes đều ✅, hệ thống sẵn sàng với:

- ✅ 2 luồng sản phẩm riêng biệt
- ✅ Thanh toán trả liền & trả sau
- ✅ Quản lý công nợ
- ✅ UI phân biệt rõ ràng
- ✅ Validation đầy đủ
- ✅ Security được bảo vệ

---

**Người thực hiện**: ******\_\_\_******  
**Ngày kiểm tra**: ******\_\_\_******  
**Ghi chú**: ******\_\_\_******
