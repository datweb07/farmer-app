# Hệ Thống Thanh Toán & Công Nợ - Tài Liệu Đầy Đủ

## 📋 Tổng Quan

Hệ thống thanh toán & quản lý công nợ hoàn chỉnh cho nền tảng nông nghiệp với 2 vai trò chính:

- **Nông dân (Farmer)**: Mua sản phẩm, sử dụng hạn mức trả sau
- **Doanh nghiệp (Business)**: Bán sản phẩm, quản lý công nợ, chiết khấu hóa đơn

---

## 🗄️ Database Schema

### 1. payment_transactions

**Quản lý tất cả giao dịch thanh toán**

```sql
Các trường chính:
- transaction_code: Mã giao dịch duy nhất (TXN20260121XXXX)
- type: immediate | credit | installment | refund
- status: pending | processing | completed | failed | cancelled
- buyer_id, seller_id, product_id
- amount, discount_amount, tax_amount, final_amount
- payment_method: bank_transfer | e_wallet | credit_card | cash | credit
- credit_term_days, due_date, interest_rate, late_fee_rate
- paid_amount, remaining_amount
```

**RLS Policies**:

- Users can view own transactions (as buyer or seller)
- Buyers can create transactions
- Sellers can update transaction status

### 2. credit_limits

**Hạn mức trả sau cho khách hàng**

```sql
Các trường chính:
- business_id: Doanh nghiệp cấp hạn mức
- customer_id: Nông dân được cấp
- credit_limit: Hạn mức tối đa
- used_credit: Đã sử dụng
- available_credit: Còn lại (computed)
- default_term_days: Kỳ hạn mặc định
- default_interest_rate, default_late_fee_rate
- risk_level: low | medium | high
- credit_score: 0-1000
- is_active: true/false
```

**RLS Policies**:

- Businesses can manage their credit limits
- Customers can view their own credit limits

### 3. receivables

**Khoản phải thu (công nợ)**

```sql
Các trường chính:
- transaction_id: Liên kết với giao dịch
- invoice_number: Số hóa đơn (INV20260121XXXX)
- business_id, customer_id
- original_amount: Tổng tiền ban đầu
- outstanding_amount: Còn phải thu
- paid_amount: Đã thu
- interest_amount, late_fee_amount
- due_date: Hạn thanh toán
- days_overdue: Số ngày trễ hạn (computed)
- status: pending | partial | paid | overdue | written_off | discounted
- is_discounted: Đã chiết khấu hóa đơn chưa
- discount_rate, discounted_amount, discounted_to
```

**RLS Policies**:

- Businesses can manage their receivables
- Customers can view their debts

### 4. payment_installments

**Thanh toán trả góp**

```sql
Các trường chính:
- transaction_id, receivable_id
- installment_number: Kỳ thứ
- total_installments: Tổng số kỳ
- amount: Tiền mỗi kỳ
- paid_amount, remaining_amount
- due_date
- status: pending | paid | overdue | waived
```

### 5. pricing_rules

**Quy tắc giá theo khách hàng**

```sql
Các trường chính:
- business_id: Doanh nghiệp đặt quy tắc
- customer_id: Khách hàng cụ thể (NULL = áp dụng cho tất cả)
- product_id: Sản phẩm cụ thể (NULL = tất cả sản phẩm)
- discount_percentage: Chiết khấu %
- fixed_discount: Chiết khấu cố định
- special_price: Giá đặc biệt
- credit_term_days: Kỳ hạn credit
- interest_rate: Lãi suất
- valid_from, valid_until: Thời gian hiệu lực
- priority: Độ ưu tiên (cao hơn = áp dụng trước)
```

**Logic áp dụng**:

- Customer + Product (ưu tiên cao nhất)
- Customer only
- Product only
- Default (thấp nhất)

### 6. financial_partners

**Đối tác tài chính (ngân hàng, fintech)**

```sql
Các trường chính:
- name: Tên đối tác
- type: bank | fintech | investor | other
- contact_person, phone, email, address
- discount_rate: Tỷ lệ chiết khấu hóa đơn
- advance_rate: Tỷ lệ ứng trước
- processing_fee: Phí xử lý
- is_active
```

**Đối tác mặc định**:

- Agribank
- Sacombank
- VNPay
- MoMo

---

## 🔧 Backend Functions

### Transaction Management

#### `generate_transaction_code()`

```sql
-- Tạo mã giao dịch duy nhất: TXN + YYYYMMDD + 4 số random
RETURNS TEXT
```

#### `generate_invoice_number()`

```sql
-- Tạo số hóa đơn: INV + YYYYMMDD + 4 số random
RETURNS TEXT
```

#### `check_credit_availability(customer_id, business_id, amount)`

```sql
-- Kiểm tra hạn mức credit có đủ không
RETURNS JSONB {
  available: boolean,
  reason: string (nếu không đủ),
  credit_limit: number,
  available_credit: number,
  term_days: number,
  interest_rate: number
}
```

#### `get_applicable_pricing(business_id, customer_id, product_id, base_price)`

```sql
-- Lấy giá áp dụng dựa trên pricing rules
RETURNS JSONB {
  base_price: number,
  discount: number,
  final_price: number,
  discount_percentage: number,
  credit_term_days: number,
  interest_rate: number
}
```

### Auto Triggers

#### `update_credit_usage_trigger`

```sql
-- Tự động cập nhật used_credit khi có giao dịch credit hoàn thành
ON payment_transactions AFTER INSERT OR UPDATE
```

#### `create_receivable_trigger`

```sql
-- Tự động tạo receivable khi giao dịch credit hoàn thành
ON payment_transactions AFTER INSERT OR UPDATE
```

#### Timestamp triggers

- `update_payment_timestamp()` - Tự động cập nhật updated_at

---

## 💻 TypeScript Types

### Main Interfaces

```typescript
// Transactions
PaymentTransaction
PaymentTransactionWithDetails (includes buyer/seller info)

// Credit
CreditLimit
CreditLimitWithDetails (includes customer stats)

// Receivables
Receivable
ReceivableWithDetails (includes customer & transaction info)

// Installments
PaymentInstallment

// Pricing
PricingRule
PricingRuleWithDetails

// Partners
FinancialPartner
```

### Enums

```typescript
TransactionType = "immediate" | "credit" | "installment" | "refund";
TransactionStatus =
  "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";
PaymentMethod =
  "bank_transfer" | "e_wallet" | "credit_card" | "cash" | "credit";
ReceivableStatus =
  "pending" | "partial" | "paid" | "overdue" | "written_off" | "discounted";
RiskLevel = "low" | "medium" | "high";
```

### Dashboard Stats

```typescript
PaymentDashboardStats {
  total_revenue: number
  pending_payments: number
  overdue_amount: number
  total_credit_issued: number
  total_receivables: number
  average_payment_days: number
  revenue_trend: number (%)
  credit_trend: number (%)
  overdue_trend: number (%)
}

CreditDashboardStats {
  total_credit_limit: number
  total_used_credit: number
  total_available_credit: number
  active_customers: number
  overdue_count: number
  high_risk_count: number
  utilization_rate: number (%)
}

ReceivableDashboardStats {
  total_outstanding: number
  total_overdue: number
  aging_0_30_days: number
  aging_31_60_days: number
  aging_61_90_days: number
  aging_over_90_days: number
  collection_rate: number (%)
  average_days_overdue: number
}
```

---

## 🔌 Service Layer APIs

### payment.service.ts

#### `createTransaction(request: CreateTransactionRequest)`

```typescript
// Tạo giao dịch mới
Returns: {
  (transaction, error);
}
```

#### `processPayment(request: ProcessPaymentRequest)`

```typescript
// Xử lý thanh toán ngay
Returns: {
  (success, transaction, error);
}
```

#### `getUserTransactions(filters?: TransactionFilters)`

```typescript
// Lấy danh sách giao dịch của user
Returns: {
  (transactions, error);
}
```

#### `getTransactionDetails(transactionId: string)`

```typescript
// Chi tiết 1 giao dịch
Returns: {
  (transaction, error);
}
```

#### `cancelTransaction(transactionId: string, reason?: string)`

```typescript
// Hủy giao dịch
Returns: {
  (success, error);
}
```

#### `getPaymentDashboardStats()`

```typescript
// Thống kê dashboard cho business
Returns: {
  (stats, error);
}
```

#### `checkCreditAvailability(businessId: string, amount: number)`

```typescript
// Kiểm tra hạn mức credit
Returns: {
  (result, error);
}
```

#### `getApplicablePricing(businessId, productId, basePrice)`

```typescript
// Lấy giá áp dụng
Returns: {
  (pricing, error);
}
```

### credit.service.ts

#### `createCreditLimit(request: CreateCreditLimitRequest)`

```typescript
// Tạo hạn mức credit cho khách hàng
Returns: {
  (creditLimit, error);
}
```

#### `updateCreditLimit(creditLimitId, updates: UpdateCreditLimitRequest)`

```typescript
// Cập nhật hạn mức
Returns: {
  (creditLimit, error);
}
```

#### `getBusinessCreditLimits(filters?: CreditLimitFilters)`

```typescript
// Lấy danh sách hạn mức của business
Returns: {
  (creditLimits, error);
}
```

#### `getCustomerCreditLimit(businessId: string)`

```typescript
// Lấy hạn mức của customer với business cụ thể
Returns: {
  (creditLimit, error);
}
```

#### `deactivateCreditLimit(creditLimitId: string)`

```typescript
// Vô hiệu hóa hạn mức
Returns: {
  (success, error);
}
```

#### `getCreditDashboardStats()`

```typescript
// Thống kê credit cho business
Returns: {
  (stats, error);
}
```

#### `searchCustomers(searchQuery: string)`

```typescript
// Tìm kiếm khách hàng
Returns: {
  (customers, error);
}
```

### receivables.service.ts

#### `getBusinessReceivables(filters?: ReceivableFilters)`

```typescript
// Lấy danh sách khoản phải thu
Returns: {
  (receivables, error);
}
```

#### `getCustomerReceivables(filters?: ReceivableFilters)`

```typescript
// Lấy danh sách công nợ của customer
Returns: {
  (receivables, error);
}
```

#### `makePayment(request: MakePaymentRequest)`

```typescript
// Thanh toán khoản nợ
Returns: {
  (success, receivable, error);
}
```

#### `discountInvoice(request: DiscountInvoiceRequest)`

```typescript
// Chiết khấu hóa đơn với đối tác tài chính
Returns: {
  (success, receivable, error);
}
```

#### `getReceivableDashboardStats()`

```typescript
// Thống kê công nợ
Returns: {
  (stats, error);
}
```

#### `getFinancialPartners()`

```typescript
// Lấy danh sách đối tác tài chính
Returns: {
  (partners, error);
}
```

---

## 🎨 UI Components

### PaymentModal.tsx

**Component thanh toán sản phẩm**

**Features**:

- ✅ Chọn hình thức: Trả liền vs Trả sau
- ✅ Hiển thị giá có chiết khấu (nếu có)
- ✅ Kiểm tra hạn mức credit tự động
- ✅ Chọn phương thức thanh toán (bank, e-wallet, credit card)
- ✅ Hiển thị lãi suất & tiền lãi dự kiến (credit)
- ✅ Loading states & error handling
- ✅ Success confirmation

**Props**:

```typescript
{
  product: {
    id: string
    name: string
    price: number
    image_url?: string
    user_id: string (seller ID)
  }
  onClose: () => void
  onSuccess: () => void
}
```

**States**:

- `method`: Bước hiện tại (method | processing | success | error)
- `paymentType`: immediate | credit
- `paymentMethod`: bank_transfer | e_wallet | credit_card
- `quantity`: Số lượng
- Pricing info (basePrice, finalPrice, discount)
- Credit info (creditAvailable, creditLimit, creditTermDays, interestRate)

---

## 🔐 Security & Permissions

### Row Level Security (RLS)

**payment_transactions**:

- ✅ Users can view own transactions (buyer OR seller)
- ✅ Buyers can create transactions
- ✅ Sellers can update transaction status

**credit_limits**:

- ✅ Businesses manage their credit limits
- ✅ Customers view their own limits

**receivables**:

- ✅ Businesses manage receivables
- ✅ Customers view their debts

**pricing_rules**:

- ✅ Businesses manage their pricing rules
- ✅ Anyone can view applicable rules

### Role-Based Access

**Farmer (Nông dân)**:

- ✅ Mua sản phẩm
- ✅ Sử dụng hạn mức trả sau (nếu có)
- ✅ Xem công nợ của mình
- ✅ Thanh toán công nợ

**Business (Doanh nghiệp)**:

- ✅ Bán sản phẩm
- ✅ Quản lý hạn mức credit cho khách hàng
- ✅ Xem & quản lý khoản phải thu
- ✅ Chiết khấu hóa đơn
- ✅ Thiết lập giá theo khách hàng
- ✅ Xem báo cáo & thống kê

---

## 📊 Business Flows

### Flow 1: Thanh toán ngay (Immediate Payment)

```
1. Farmer chọn sản phẩm → Click "Mua"
2. PaymentModal hiện lên
3. Hệ thống check pricing rules → Hiển thị giá cuối cùng
4. Farmer chọn "Trả liền"
5. Chọn phương thức: Bank Transfer / E-Wallet / Credit Card
6. Click "Xác nhận thanh toán"
7. Tạo transaction với status = 'processing'
8. Xử lý thanh toán (gọi payment gateway)
9. Update status = 'completed'
10. Success! → Đóng modal
```

### Flow 2: Trả sau (Credit Payment)

```
1. Farmer chọn sản phẩm → Click "Mua"
2. PaymentModal hiện lên
3. Hệ thống:
   - Check credit availability
   - Get applicable pricing
   - Calculate interest
4. Farmer chọn "Trả sau"
5. Hiển thị:
   - Hạn mức còn lại
   - Thời hạn
   - Lãi suất & tiền lãi
   - Tổng phải trả
6. Click "Xác nhận thanh toán"
7. Tạo transaction với:
   - type = 'credit'
   - status = 'pending'
   - due_date = now + credit_term_days
8. Trigger auto-create receivable
9. Update used_credit trong credit_limits
10. Success! → Đóng modal
```

### Flow 3: Quản lý hạn mức (Business)

```
1. Business vào Credit Management Dashboard
2. Click "Thêm hạn mức"
3. Tìm kiếm khách hàng (farmer)
4. Nhập:
   - Hạn mức (credit_limit)
   - Kỳ hạn mặc định (term_days)
   - Lãi suất
   - Risk level
   - Credit score
5. Click "Tạo hạn mức"
6. Hệ thống tạo credit_limit record
7. Farmer có thể sử dụng credit ngay
```

### Flow 4: Chiết khấu hóa đơn (Invoice Discounting)

```
1. Business vào Receivables Dashboard
2. Chọn receivable chưa thu (outstanding)
3. Click "Chiết khấu hóa đơn"
4. Chọn đối tác tài chính (bank/fintech)
5. Nhập tỷ lệ chiết khấu
6. Hệ thống tính:
   - discounted_amount = outstanding * (1 - discount_rate%)
7. Click "Xác nhận"
8. Update receivable:
   - is_discounted = true
   - status = 'discounted'
9. Business nhận tiền từ đối tác ngay
10. Đối tác thu nợ từ farmer sau
```

### Flow 5: Thanh toán công nợ (Farmer)

```
1. Farmer vào "Công nợ của tôi"
2. Xem danh sách receivables
3. Click "Thanh toán" trên 1 khoản nợ
4. Nhập số tiền muốn trả (có thể trả 1 phần)
5. Chọn phương thức thanh toán
6. Click "Xác nhận"
7. Hệ thống:
   - Update paid_amount
   - Update outstanding_amount
   - Update status (paid nếu hết nợ, partial nếu còn)
   - Reduce used_credit trong credit_limits
8. Success! Nợ giảm
```

---

## 🚀 API Integration Points

### Frontend → Backend

**Tạo giao dịch**:

```typescript
POST / api / transactions;
Body: CreateTransactionRequest;
Response: {
  (transaction, error);
}
```

**Xử lý thanh toán**:

```typescript
POST / api / payments / process;
Body: ProcessPaymentRequest;
Response: {
  (success, transaction, error);
}
```

**Check credit**:

```typescript
GET /api/credit/availability?businessId=XXX&amount=1000
Response: { available, credit_limit, ... }
```

**Get pricing**:

```typescript
GET /api/pricing?businessId=XXX&productId=YYY&basePrice=1000
Response: { base_price, discount, final_price, ... }
```

### Backend → Payment Gateway

**VNPay Integration**:

```typescript
POST https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
Params: {
  vnp_TxnRef: transaction_code,
  vnp_Amount: final_amount * 100,
  vnp_OrderInfo: description,
  ...
}
```

**MoMo Integration**:

```typescript
POST https://test-payment.momo.vn/v2/gateway/api/create
Body: {
  orderId: transaction_code,
  amount: final_amount,
  orderInfo: description,
  ...
}
```

---

## 📈 Dashboard Analytics

### Payment Dashboard (Business)

**Metrics**:

- Total Revenue (Tổng doanh thu)
- Pending Payments (Chờ thanh toán)
- Overdue Amount (Quá hạn)
- Total Credit Issued (Tổng credit đã cấp)
- Average Payment Days (Số ngày thanh toán TB)

**Charts**:

- Revenue trend (7 days, 30 days, 3 months)
- Payment methods distribution
- Transaction status breakdown

### Credit Dashboard (Business)

**Metrics**:

- Total Credit Limit (Tổng hạn mức)
- Used Credit (Đã sử dụng)
- Available Credit (Còn lại)
- Active Customers (Khách hàng đang có credit)
- Overdue Count (Số khách quá hạn)
- High Risk Count (Khách high risk)
- Utilization Rate (Tỷ lệ sử dụng %)

**Lists**:

- Top customers by credit usage
- High risk customers
- Customers near limit

### Receivables Dashboard (Business)

**Metrics**:

- Total Outstanding (Tổng công nợ)
- Total Overdue (Tổng quá hạn)
- Aging Analysis:
  - 0-30 days
  - 31-60 days
  - 61-90 days
  - Over 90 days
- Collection Rate (Tỷ lệ thu hồi %)
- Average Days Overdue (Số ngày quá hạn TB)

**Actions**:

- Send payment reminders
- Discount invoices
- Mark as written off

---

## 🧪 Testing Checklist

### 1. Payment Flow Testing

**Immediate Payment**:

- [ ] Create transaction with bank_transfer
- [ ] Create transaction with e_wallet
- [ ] Create transaction with credit_card
- [ ] Verify transaction status updates
- [ ] Check payment reference saved
- [ ] Verify completed_at timestamp

**Credit Payment**:

- [ ] Check credit availability (sufficient)
- [ ] Check credit availability (insufficient)
- [ ] Create credit transaction
- [ ] Verify receivable auto-created
- [ ] Verify used_credit updated
- [ ] Check due_date calculated correctly
- [ ] Verify interest calculation

### 2. Credit Management Testing

**Create Credit Limit**:

- [ ] Create limit for farmer
- [ ] Verify RLS (business can see, farmer can see)
- [ ] Check available_credit computed correctly
- [ ] Try creating duplicate (should fail - unique constraint)

**Update Credit Limit**:

- [ ] Increase limit
- [ ] Decrease limit (check used_credit constraint)
- [ ] Change risk level
- [ ] Deactivate limit

### 3. Receivables Testing

**List Receivables**:

- [ ] Business sees own receivables
- [ ] Farmer sees own debts
- [ ] Filter by status
- [ ] Filter by overdue
- [ ] Check days_overdue computed correctly

**Make Payment**:

- [ ] Full payment (status → paid)
- [ ] Partial payment (status → partial)
- [ ] Verify outstanding_amount updates
- [ ] Verify used_credit reduces
- [ ] Check paid_at timestamp (full payment only)

**Invoice Discounting**:

- [ ] Discount to bank
- [ ] Verify status → discounted
- [ ] Check discounted_amount calculated
- [ ] Try discounting already discounted (should fail)

### 4. Pricing Rules Testing

**Apply Pricing**:

- [ ] Customer + Product specific rule
- [ ] Customer only rule
- [ ] Product only rule
- [ ] Default pricing (no rule)
- [ ] Check priority ordering
- [ ] Verify discount_percentage applied
- [ ] Verify special_price overrides

### 5. Dashboard Stats Testing

**Payment Stats**:

- [ ] Verify total_revenue sum
- [ ] Check pending_payments count
- [ ] Verify overdue_amount calculation
- [ ] Check average_payment_days

**Credit Stats**:

- [ ] Verify total sums
- [ ] Check utilization_rate calculation
- [ ] Count active customers
- [ ] Count high risk

**Receivable Stats**:

- [ ] Verify aging buckets
- [ ] Check collection_rate calculation
- [ ] Verify average_days_overdue

### 6. Security Testing

**RLS Policies**:

- [ ] User A cannot see User B's transactions
- [ ] Business cannot create credit limit for another business's customers
- [ ] Farmer cannot modify receivables directly
- [ ] Check financial_partners visible to all authenticated

**Permissions**:

- [ ] Farmer role can create transactions
- [ ] Business role can create credit limits
- [ ] Only seller can update transaction status
- [ ] Only business can discount invoices

---

## 🔮 Future Enhancements

### Phase 2 Features

1. **Installment Plans**:
   - Trả góp nhiều kỳ
   - Auto-generate installment schedule
   - Payment reminders per installment

2. **Advanced Analytics**:
   - Predictive credit scoring
   - Default risk analysis
   - Customer lifetime value
   - Churn prediction

3. **Automated Workflows**:
   - Auto-send payment reminders (email/SMS)
   - Auto-apply late fees
   - Auto-escalate overdue invoices
   - Auto-adjust credit limits based on behavior

4. **Integration với Banking APIs**:
   - Real-time payment verification
   - Auto-reconciliation
   - Instant credit limit top-up
   - Bank statement matching

5. **Mobile Payments**:
   - QR code payments
   - NFC payments
   - In-app wallet

6. **Reporting**:
   - PDF invoice generation
   - Export to Excel
   - Tax reports
   - Accounting integration (Misa, Fast, etc.)

### Performance Optimizations

1. **Database**:
   - Add materialized views for dashboards
   - Partition large tables by date
   - Index optimization

2. **Caching**:
   - Redis cache for pricing rules
   - Cache credit availability checks
   - Cache dashboard stats (5-minute TTL)

3. **Background Jobs**:
   - Async invoice generation
   - Batch payment processing
   - Scheduled stats calculation

---

## 📚 API Documentation

### Postman Collection

```json
{
  "info": {
    "name": "Payment & Credit System API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Transactions",
      "item": [
        {
          "name": "Create Transaction",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/transactions",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"seller_id\": \"{{sellerId}}\",\n  \"product_id\": \"{{productId}}\",\n  \"amount\": 1000000,\n  \"type\": \"credit\",\n  \"credit_term_days\": 30\n}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## 🆘 Troubleshooting

### Common Issues

**Issue 1**: Credit not available

```
Error: "No credit limit found"
Solution: Business needs to create credit limit first
```

**Issue 2**: Transaction fails

```
Error: "Insufficient credit limit"
Solution: Check available_credit, may need to increase limit or pay existing debts
```

**Issue 3**: Pricing not applied

```
Error: Shows base price instead of discounted
Solution: Check pricing_rule is_active and valid_from/valid_until dates
```

**Issue 4**: Receivable not created

```
Error: No receivable after credit transaction
Solution: Check trigger exists and transaction status = 'completed'
```

---

## ✅ Migration Checklist

**Before Running Migration**:

- [ ] Backup database
- [ ] Review all table structures
- [ ] Check RLS policies
- [ ] Verify trigger functions

**Run Migration**:

```sql
-- In Supabase SQL Editor
-- Copy entire 027_payment_credit_system.sql
-- Execute
```

**After Migration**:

- [ ] Verify tables created: `SELECT * FROM information_schema.tables WHERE table_name LIKE 'payment_%' OR table_name LIKE 'credit_%' OR table_name LIKE 'receivables'`
- [ ] Check functions: `SELECT * FROM information_schema.routines WHERE routine_name LIKE '%credit%' OR routine_name LIKE '%payment%'`
- [ ] Test RLS policies with test users
- [ ] Insert test data
- [ ] Run all service layer functions

**Test Data Setup**:

```sql
-- Create test business user (assume already exists)
-- Create test farmer user (assume already exists)

-- Create credit limit
INSERT INTO credit_limits (
  business_id, customer_id, credit_limit,
  default_term_days, default_interest_rate
) VALUES (
  '{{business_user_id}}',
  '{{farmer_user_id}}',
  10000000,
  30,
  12.0
);

-- Create pricing rule
INSERT INTO pricing_rules (
  business_id, customer_id, discount_percentage
) VALUES (
  '{{business_user_id}}',
  '{{farmer_user_id}}',
  10.0
);
```

---

**📅 Document Version**: 1.0  
**🔧 Last Updated**: January 21, 2026  
**👨‍💻 Status**: Backend Complete, Frontend In Progress  
**🚀 Next**: Complete UI components for Credit Management & Receivables Dashboards
