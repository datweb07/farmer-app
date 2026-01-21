# 🔧 Fix Payment System Errors

## ❌ Lỗi Gặp Phải

```
Error creating transaction: null value in column "transaction_code"
of relation "payment_transactions" violates not-null constraint

Failed to load resource: the server responded with a status of 406
- payment_transactions
- credit_limits
```

## 🔍 Nguyên Nhân

### 1. Transaction Code Null

- Column `transaction_code` là NOT NULL nhưng không có DEFAULT value
- Column `invoice_number` tương tự
- RPC functions `generate_transaction_code()` và `generate_invoice_number()` đã có nhưng không được gọi tự động

### 2. HTTP 406 Errors

- Tables `payment_transactions`, `credit_limits`, `receivables` chưa tồn tại
- Migration 027 chưa được chạy
- Migration 028 chưa được chạy

## ✅ Giải Pháp

### Bước 1: Chạy Migration 027 (Payment System)

```sql
-- File: supabase/migrations/027_payment_credit_system.sql
-- Copy TOÀN BỘ nội dung và paste vào Supabase SQL Editor
-- Click Execute

-- Migration này tạo:
-- - 6 tables: payment_transactions, credit_limits, receivables, etc.
-- - 9 RPC functions
-- - 4 triggers
-- - RLS policies
-- - Initial data (financial_partners)
```

**⚠️ LƯU Ý**: File này đã được fix lỗi immutable expression (dùng VIEW thay vì GENERATED column)

### Bước 2: Chạy Migration 028 (Seller Role)

```sql
-- File: supabase/migrations/028_add_seller_role_to_products.sql
-- Copy nội dung và paste vào Supabase SQL Editor
-- Click Execute

-- Migration này update:
-- - get_products_with_stats() - thêm seller_role
-- - get_product_with_stats() - thêm seller_role
```

### Bước 3: Chạy Migration 029 (Fix Auto-Generate Codes) - MỚI

```sql
-- File: supabase/migrations/029_fix_auto_generate_codes.sql
-- Copy nội dung và paste vào Supabase SQL Editor
-- Click Execute

-- Adds DEFAULT values for auto-generation
ALTER TABLE payment_transactions
ALTER COLUMN transaction_code SET DEFAULT generate_transaction_code();

ALTER TABLE receivables
ALTER COLUMN invoice_number SET DEFAULT generate_invoice_number();
```

### Bước 4: Chạy Migration 030 (Fix RLS Policies) - MỚI & QUAN TRỌNG

```sql
-- File: supabase/migrations/030_fix_payment_rls_policies.sql
-- Copy nội dung và paste vào Supabase SQL Editor
-- Click Execute

-- Fix RLS policies:
-- - Cho phép buyers UPDATE transactions của mình (để complete payment)
-- - Cho phép sellers UPDATE transactions
-- - Cho phép customers UPDATE receivables của mình (để trả nợ)
-- - Thêm permissions cho RPC functions
-- - Grant table access cho authenticated users
```

**🔴 QUAN TRỌNG**: Migration 030 fix lỗi 406 bằng cách:

1. ✅ Cho phép buyer update transaction (để hoàn tất thanh toán)
2. ✅ Fix RLS policies quá nghiêm ngặt
3. ✅ Thêm GRANT permissions cho functions và tables

### Bước 5: Verify Migrations

```sql
-- Kiểm tra tables đã tạo
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'payment_transactions',
  'credit_limits',
  'receivables',
  'payment_installments',
  'pricing_rules',
  'financial_partners'
);

-- Kết quả mong đợi: 6 rows

-- Kiểm tra RPC functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%payment%' OR routine_name LIKE '%credit%' OR routine_name LIKE '%transaction%';

-- Kết quả mong đợi: 9+ functions

-- Kiểm tra DEFAULT value cho transaction_code
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
AND column_name = 'transaction_code';

-- Kết quả mong đợi: column_default = 'generate_transaction_code()'
```

---

## 🧪 Test Sau Khi Fix

### Test 1: Tạo Transaction (Trả Liền)

1. Đăng nhập với user
2. Vào trang Products
3. Chọn sản phẩm business (có nút "Mua ngay")
4. Click "Mua ngay"
5. Chọn "Trả liền" → "Chuyển khoản ngân hàng"
6. Nhập số lượng: 1
7. Click "Thanh toán"
8. **Kỳ vọng**:
   - ✅ Transaction tạo thành công
   - ✅ transaction_code tự động generate (vd: TXN202601210001)
   - ✅ status = 'processing' hoặc 'completed'
   - ✅ Không có lỗi 406 hoặc constraint violation
9. **Kiểm tra DB**:

```sql
SELECT transaction_code, type, status, final_amount
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 1;
```

### Test 2: Tạo Transaction (Trả Sau)

**Điều kiện**: Cần có credit_limit cho customer

1. Tạo credit limit test:

```sql
-- Lấy business_id (seller) và customer_id (buyer)
-- Thay <business_id> và <customer_id> bằng UUID thực tế
INSERT INTO credit_limits (
  business_id,
  customer_id,
  credit_limit,
  default_term_days,
  default_interest_rate,
  is_active
) VALUES (
  '<business_id>',
  '<customer_id>',
  5000000, -- 5 triệu
  30, -- 30 ngày
  2.0, -- 2%
  true
);
```

2. Thực hiện thanh toán trả sau
3. **Kỳ vọng**:
   - ✅ Hiển thị hạn mức trong modal
   - ✅ Transaction tạo với type = 'credit'
   - ✅ Receivable tự động tạo (trigger)
   - ✅ invoice_number tự động generate
   - ✅ credit_limits.used_credit tăng

4. **Kiểm tra DB**:

```sql
-- Check transaction
SELECT transaction_code, type, status, due_date, final_amount
FROM payment_transactions
WHERE type = 'credit'
ORDER BY created_at DESC
LIMIT 1;

-- Check receivable (should auto-create via trigger)
SELECT invoice_number, status, outstanding_amount, due_date
FROM receivables
ORDER BY created_at DESC
LIMIT 1;

-- Check credit usage
SELECT
  credit_limit,
  used_credit,
  available_credit
FROM credit_limits
WHERE customer_id = '<customer_id>'
AND business_id = '<business_id>';
```

---

## 📊 Cấu Trúc Dữ Liệu

### payment_transactions

```
transaction_code: TXN20260121xxxx (AUTO)
type: immediate | credit | installment | refund
status: pending | processing | completed | failed | cancelled
buyer_id: UUID (customer)
seller_id: UUID (business)
amount, discount_amount, tax_amount, final_amount
payment_method: bank_transfer | e_wallet | credit_card | credit
```

### credit_limits

```
business_id: UUID (seller)
customer_id: UUID (buyer)
credit_limit: NUMERIC (hạn mức)
used_credit: NUMERIC (đã dùng)
available_credit: GENERATED (còn lại)
default_term_days: INTEGER (30 ngày)
default_interest_rate: NUMERIC (2%)
```

### receivables

```
invoice_number: INV20260121xxxx (AUTO)
transaction_id: UUID (FK → payment_transactions)
business_id: UUID (seller)
customer_id: UUID (buyer)
original_amount, outstanding_amount, paid_amount
due_date: TIMESTAMP
status: pending | partial | paid | overdue
```

---

## 🔒 RLS Policies

### payment_transactions

- Buyer xem transactions của mình: `buyer_id = auth.uid()`
- Seller xem transactions của mình: `seller_id = auth.uid()`
- Buyer tạo transaction: `buyer_id = auth.uid()`
- Seller update status: `seller_id = auth.uid()`

### credit_limits

- Business quản lý tất cả: `business_id = auth.uid()`
- Customer xem của mình: `customer_id = auth.uid()`

### receivables

- Business quản lý tất cả: `business_id = auth.uid()`
- Customer xem của mình: `customer_id = auth.uid()`

---

## 🐛 Troubleshooting

### Lỗi: transaction_code null (sau khi chạy migration)

```sql
-- Verify DEFAULT value
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
AND column_name = 'transaction_code';

-- Nếu NULL, chạy lại migration 029
```

### Lỗi: 406 Not Acceptable

**Nguyên nhân**: Tables chưa tồn tại hoặc RLS blocking

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'payment_transactions'
);

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'payment_transactions';
```

### Lỗi: RPC function not found

```sql
-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'generate_transaction_code',
  'generate_invoice_number',
  'check_credit_availability'
);
```

### Lỗi: Trigger không chạy

```sql
-- Check triggers exist
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payment_transactions';

-- Expected:
-- - update_credit_usage_trigger
-- - create_receivable_trigger
-- - update_payment_transactions_timestamp
```

---

## ✅ Checklist Hoàn Thành

- [ ] Migration 027 chạy thành công (6 tables created)
- [ ] Migration 028 chạy thành công (RPC functions updated)
- [ ] Migration 029 chạy thành công (DEFAULT values set)
- [ ] Migration 030 chạy thành công (RLS policies fixed) **← MỚI**
- [ ] Test tạo transaction trả liền - PASS
- [ ] Test tạo transaction trả sau - PASS
- [ ] Test credit limit checking - PASS
- [ ] Không có lỗi 406
- [ ] Không có constraint violations
- [ ] transaction_code tự động generate
- [ ] invoice_number tự động generate
- [ ] Triggers hoạt động đúng

---

## 📞 Summary

**4 Migrations cần chạy theo thứ tự**:

1. ✅ Migration 027 - Payment System (628 lines)
2. ✅ Migration 028 - Seller Role (107 lines)
3. ✅ Migration 029 - Auto-Generate Codes (10 lines)
4. ✅ Migration 030 - Fix RLS Policies (110 lines) **← MỚI & FIX LỖI 406**

**Migration 030 fix lỗi 406** bằng cách:

- 🔓 Cho phép buyer UPDATE transaction (hoàn tất thanh toán)
- 🔓 Cho phép customer UPDATE receivables (trả nợ)
- ✅ Thêm GRANT permissions cho tables và functions

Sau khi chạy đủ 4 migrations, hệ thống thanh toán sẽ hoạt động hoàn toàn!
