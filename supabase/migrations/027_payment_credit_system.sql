-- ============================================
-- Payment & Credit System Migration
-- ============================================
-- Complete payment, credit management, and receivables system

-- ============================================
-- 1. PAYMENT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction info
  transaction_code TEXT UNIQUE NOT NULL, -- Mã giao dịch (auto-generated)
  type TEXT NOT NULL CHECK (type IN ('immediate', 'credit', 'installment', 'refund')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  
  -- Parties involved
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Nông dân
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Doanh nghiệp
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Amount details
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0), -- Tổng tiền
  discount_amount NUMERIC(15,2) DEFAULT 0 CHECK (discount_amount >= 0), -- Chiết khấu
  tax_amount NUMERIC(15,2) DEFAULT 0 CHECK (tax_amount >= 0), -- Thuế
  final_amount NUMERIC(15,2) NOT NULL CHECK (final_amount > 0), -- Số tiền cuối cùng
  
  -- Payment method
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'e_wallet', 'credit_card', 'cash', 'credit')),
  payment_provider TEXT, -- VNPay, MoMo, ZaloPay, etc.
  payment_reference TEXT, -- Mã tham chiếu từ cổng thanh toán
  
  -- Credit info (if type = 'credit')
  credit_term_days INTEGER, -- Số ngày trả sau
  due_date TIMESTAMP WITH TIME ZONE, -- Hạn thanh toán
  interest_rate NUMERIC(5,2) DEFAULT 0, -- Lãi suất (%)
  late_fee_rate NUMERIC(5,2) DEFAULT 0, -- Phí trả chậm (%)
  
  -- Status tracking
  paid_amount NUMERIC(15,2) DEFAULT 0 CHECK (paid_amount >= 0), -- Đã trả
  remaining_amount NUMERIC(15,2) CHECK (remaining_amount >= 0), -- Còn nợ
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}', -- Additional data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_buyer ON payment_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_seller ON payment_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_due_date ON payment_transactions(due_date);

-- ============================================
-- 2. CREDIT LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parties
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Doanh nghiệp cấp hạn mức
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Nông dân được cấp
  
  -- Credit details
  credit_limit NUMERIC(15,2) NOT NULL CHECK (credit_limit > 0), -- Hạn mức tối đa
  used_credit NUMERIC(15,2) DEFAULT 0 CHECK (used_credit >= 0), -- Đã sử dụng
  available_credit NUMERIC(15,2) GENERATED ALWAYS AS (credit_limit - used_credit) STORED, -- Còn lại
  
  -- Terms
  default_term_days INTEGER DEFAULT 30 CHECK (default_term_days > 0), -- Kỳ hạn mặc định
  default_interest_rate NUMERIC(5,2) DEFAULT 0 CHECK (default_interest_rate >= 0), -- Lãi suất mặc định
  default_late_fee_rate NUMERIC(5,2) DEFAULT 2 CHECK (default_late_fee_rate >= 0), -- Phí trả chậm
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES profiles(id), -- Người duyệt
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Risk assessment
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  credit_score INTEGER CHECK (credit_score >= 0 AND credit_score <= 1000),
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT credit_limits_unique UNIQUE (business_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_limits_business ON credit_limits(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_limits_customer ON credit_limits(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_limits_active ON credit_limits(is_active) WHERE is_active = true;

-- ============================================
-- 3. RECEIVABLES (Khoản phải thu)
-- ============================================
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL, -- Số hóa đơn
  
  -- Parties
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Amounts
  original_amount NUMERIC(15,2) NOT NULL CHECK (original_amount > 0),
  outstanding_amount NUMERIC(15,2) NOT NULL CHECK (outstanding_amount >= 0),
  paid_amount NUMERIC(15,2) DEFAULT 0 CHECK (paid_amount >= 0),
  
  -- Interest & fees
  interest_amount NUMERIC(15,2) DEFAULT 0 CHECK (interest_amount >= 0),
  late_fee_amount NUMERIC(15,2) DEFAULT 0 CHECK (late_fee_amount >= 0),
  
  -- Terms
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'written_off', 'discounted')),
  
  -- Invoice discounting (chiết khấu hóa đơn)
  is_discounted BOOLEAN DEFAULT false,
  discount_rate NUMERIC(5,2), -- Tỷ lệ chiết khấu
  discounted_amount NUMERIC(15,2), -- Số tiền sau chiết khấu
  discounted_to TEXT, -- Ngân hàng / đối tác tài chính
  discounted_at TIMESTAMP WITH TIME ZONE,
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receivables_transaction ON receivables(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receivables_business ON receivables(business_id);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(due_date);

-- View: Receivables with calculated days_overdue
CREATE OR REPLACE VIEW receivables_with_overdue AS
SELECT 
  r.*,
  CASE 
    WHEN r.due_date < NOW() AND r.outstanding_amount > 0 
    THEN EXTRACT(DAY FROM NOW() - r.due_date)::INTEGER 
    ELSE 0 
  END AS days_overdue
FROM receivables r;

-- ============================================
-- 4. PAYMENT INSTALLMENTS (Trả góp)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  receivable_id UUID REFERENCES receivables(id) ON DELETE CASCADE,
  
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  total_installments INTEGER NOT NULL CHECK (total_installments > 0),
  
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  paid_amount NUMERIC(15,2) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(15,2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
  
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT installment_valid_number CHECK (installment_number <= total_installments)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_installments_transaction ON payment_installments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_receivable ON payment_installments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_installments_due_date ON payment_installments(due_date);

-- ============================================
-- 5. PRICING RULES (Customer-based pricing)
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = applies to all
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- NULL = applies to all products
  
  -- Pricing
  discount_percentage NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  fixed_discount NUMERIC(15,2) DEFAULT 0 CHECK (fixed_discount >= 0),
  special_price NUMERIC(15,2), -- Giá đặc biệt
  
  -- Credit terms
  credit_term_days INTEGER,
  interest_rate NUMERIC(5,2),
  
  -- Validity
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  priority INTEGER DEFAULT 0, -- Higher priority = applied first
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rules_business ON pricing_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_customer ON pricing_rules(customer_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_product ON pricing_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = true;

-- ============================================
-- 6. FINANCIAL PARTNERS (Đối tác tài chính)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'fintech', 'investor', 'other')),
  
  -- Contact
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  
  -- Terms
  discount_rate NUMERIC(5,2) CHECK (discount_rate >= 0 AND discount_rate <= 100), -- Tỷ lệ chiết khấu
  advance_rate NUMERIC(5,2) CHECK (advance_rate >= 0 AND advance_rate <= 100), -- Tỷ lệ ứng trước
  processing_fee NUMERIC(5,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_financial_partners_active ON financial_partners(is_active) WHERE is_active = true;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Payment Transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions as buyer"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Users can view own transactions as seller"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can create transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update transaction status"
  ON payment_transactions FOR UPDATE
  USING (auth.uid() = seller_id);

-- Credit Limits
ALTER TABLE credit_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage credit limits"
  ON credit_limits FOR ALL
  USING (auth.uid() = business_id);

CREATE POLICY "Customers can view their credit limits"
  ON credit_limits FOR SELECT
  USING (auth.uid() = customer_id);

-- Receivables
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage receivables"
  ON receivables FOR ALL
  USING (auth.uid() = business_id);

CREATE POLICY "Customers can view their receivables"
  ON receivables FOR SELECT
  USING (auth.uid() = customer_id);

-- Payment Installments
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view installments for their transactions"
  ON payment_installments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payment_transactions pt
      WHERE pt.id = payment_installments.transaction_id
      AND (pt.buyer_id = auth.uid() OR pt.seller_id = auth.uid())
    )
  );

-- Pricing Rules
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage pricing rules"
  ON pricing_rules FOR ALL
  USING (auth.uid() = business_id);

CREATE POLICY "Anyone can view applicable pricing rules"
  ON pricing_rules FOR SELECT
  USING (true);

-- Financial Partners
ALTER TABLE financial_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view financial partners"
  ON financial_partners FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Generate transaction code
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM payment_transactions WHERE transaction_code = code) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  invoice_num TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    invoice_num := 'INV' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM receivables WHERE invoice_number = invoice_num) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN invoice_num;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate days overdue for receivable
CREATE OR REPLACE FUNCTION calculate_days_overdue(
  p_due_date TIMESTAMP WITH TIME ZONE,
  p_outstanding_amount NUMERIC
)
RETURNS INTEGER AS $$
BEGIN
  IF p_due_date < NOW() AND p_outstanding_amount > 0 THEN
    RETURN EXTRACT(DAY FROM NOW() - p_due_date)::INTEGER;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check credit availability
CREATE OR REPLACE FUNCTION check_credit_availability(
  p_customer_id UUID,
  p_business_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  credit_info RECORD;
  result JSONB;
BEGIN
  SELECT 
    credit_limit,
    used_credit,
    available_credit,
    is_active,
    default_term_days,
    default_interest_rate
  INTO credit_info
  FROM credit_limits
  WHERE customer_id = p_customer_id
    AND business_id = p_business_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    result := jsonb_build_object(
      'available', false,
      'reason', 'No credit limit found',
      'credit_limit', 0,
      'available_credit', 0
    );
  ELSIF credit_info.available_credit < p_amount THEN
    result := jsonb_build_object(
      'available', false,
      'reason', 'Insufficient credit limit',
      'credit_limit', credit_info.credit_limit,
      'available_credit', credit_info.available_credit,
      'required', p_amount
    );
  ELSE
    result := jsonb_build_object(
      'available', true,
      'credit_limit', credit_info.credit_limit,
      'available_credit', credit_info.available_credit,
      'term_days', credit_info.default_term_days,
      'interest_rate', credit_info.default_interest_rate
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Get applicable pricing
CREATE OR REPLACE FUNCTION get_applicable_pricing(
  p_business_id UUID,
  p_customer_id UUID,
  p_product_id UUID,
  p_base_price NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  pricing RECORD;
  final_price NUMERIC;
  discount NUMERIC := 0;
BEGIN
  -- Find most specific pricing rule (highest priority)
  SELECT *
  INTO pricing
  FROM pricing_rules
  WHERE business_id = p_business_id
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
    AND (
      (customer_id = p_customer_id AND product_id = p_product_id) OR
      (customer_id = p_customer_id AND product_id IS NULL) OR
      (customer_id IS NULL AND product_id = p_product_id) OR
      (customer_id IS NULL AND product_id IS NULL)
    )
  ORDER BY 
    CASE 
      WHEN customer_id IS NOT NULL AND product_id IS NOT NULL THEN 4
      WHEN customer_id IS NOT NULL THEN 3
      WHEN product_id IS NOT NULL THEN 2
      ELSE 1
    END DESC,
    priority DESC
  LIMIT 1;
  
  IF FOUND THEN
    IF pricing.special_price IS NOT NULL THEN
      final_price := pricing.special_price;
      discount := p_base_price - final_price;
    ELSE
      discount := COALESCE(pricing.fixed_discount, 0) + 
                  (p_base_price * COALESCE(pricing.discount_percentage, 0) / 100);
      final_price := p_base_price - discount;
    END IF;
    
    RETURN jsonb_build_object(
      'base_price', p_base_price,
      'discount', discount,
      'final_price', final_price,
      'discount_percentage', pricing.discount_percentage,
      'credit_term_days', pricing.credit_term_days,
      'interest_rate', pricing.interest_rate
    );
  ELSE
    RETURN jsonb_build_object(
      'base_price', p_base_price,
      'discount', 0,
      'final_price', p_base_price,
      'discount_percentage', 0
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Update credit usage
CREATE OR REPLACE FUNCTION update_credit_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'credit' AND NEW.status = 'completed' THEN
    -- Increase used credit
    UPDATE credit_limits
    SET used_credit = used_credit + NEW.final_amount,
        updated_at = NOW()
    WHERE customer_id = NEW.buyer_id
      AND business_id = NEW.seller_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credit_usage_trigger
  AFTER INSERT OR UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_usage();

-- Function: Auto-create receivable for credit transactions
CREATE OR REPLACE FUNCTION create_receivable_for_credit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'credit' AND NEW.status = 'completed' THEN
    INSERT INTO receivables (
      transaction_id,
      invoice_number,
      business_id,
      customer_id,
      original_amount,
      outstanding_amount,
      due_date,
      status
    ) VALUES (
      NEW.id,
      generate_invoice_number(),
      NEW.seller_id,
      NEW.buyer_id,
      NEW.final_amount,
      NEW.final_amount,
      NEW.due_date,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_receivable_trigger
  AFTER INSERT OR UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_receivable_for_credit();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_transactions_timestamp
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_timestamp();

CREATE TRIGGER update_credit_limits_timestamp
  BEFORE UPDATE ON credit_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_timestamp();

CREATE TRIGGER update_receivables_timestamp
  BEFORE UPDATE ON receivables
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_timestamp();

CREATE TRIGGER update_pricing_rules_timestamp
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_timestamp();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Add some default financial partners
INSERT INTO financial_partners (name, type, discount_rate, advance_rate, processing_fee, notes) VALUES
  ('Ngân hàng Nông nghiệp & Phát triển Nông thôn', 'bank', 2.5, 80, 0.5, 'Agribank - Hỗ trợ nông nghiệp'),
  ('Ngân hàng TMCP Sài Gòn Thương Tín', 'bank', 3.0, 75, 0.3, 'Sacombank'),
  ('VNPay', 'fintech', 1.5, 90, 0.2, 'Cổng thanh toán điện tử'),
  ('MoMo', 'fintech', 1.8, 85, 0.25, 'Ví điện tử')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON payment_transactions TO authenticated;
GRANT ALL ON credit_limits TO authenticated;
GRANT ALL ON receivables TO authenticated;
GRANT ALL ON payment_installments TO authenticated;
GRANT ALL ON pricing_rules TO authenticated;
GRANT SELECT ON financial_partners TO authenticated;
GRANT SELECT ON receivables_with_overdue TO authenticated;
