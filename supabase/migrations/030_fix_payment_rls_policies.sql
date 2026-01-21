-- ============================================
-- Fix Payment System RLS Policies
-- ============================================
-- Fixes RLS policies to allow proper payment flow

-- ============================================
-- 1. FIX PAYMENT_TRANSACTIONS POLICIES
-- ============================================

-- Drop existing update policy (too restrictive)
DROP POLICY IF EXISTS "Sellers can update transaction status" ON payment_transactions;

-- Create new policy: Buyers can update their own transactions (for payment completion)
CREATE POLICY "Buyers can update own transactions"
  ON payment_transactions FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Create new policy: Sellers can update transactions they're involved in
CREATE POLICY "Sellers can update transactions"
  ON payment_transactions FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- ============================================
-- 2. ADD MISSING INSERT POLICY FOR TRANSACTIONS
-- ============================================

-- Ensure buyers can create transactions
DROP POLICY IF EXISTS "Buyers can create transactions" ON payment_transactions;

CREATE POLICY "Buyers can create transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- ============================================
-- 3. FIX CREDIT_LIMITS POLICIES
-- ============================================

-- Current policies are OK, but let's make sure they exist

-- Drop and recreate for clarity
DROP POLICY IF EXISTS "Businesses can manage credit limits" ON credit_limits;
DROP POLICY IF EXISTS "Customers can view their credit limits" ON credit_limits;

-- Businesses can manage all credit limits they own
CREATE POLICY "Businesses can manage credit limits"
  ON credit_limits FOR ALL
  USING (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

-- Customers can view their own credit limits
CREATE POLICY "Customers can view their credit limits"
  ON credit_limits FOR SELECT
  USING (auth.uid() = customer_id);

-- ============================================
-- 4. FIX RECEIVABLES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Businesses can manage receivables" ON receivables;
DROP POLICY IF EXISTS "Customers can view their receivables" ON receivables;

-- Businesses can manage all receivables
CREATE POLICY "Businesses can manage receivables"
  ON receivables FOR ALL
  USING (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

-- Customers can view and update their own receivables (for making payments)
CREATE POLICY "Customers can view their receivables"
  ON receivables FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can update their receivables"
  ON receivables FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ============================================
-- 5. PAYMENT_INSTALLMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view installments for their transactions" ON payment_installments;

-- Users can view installments if they're buyer or seller
CREATE POLICY "Users can view their installments"
  ON payment_installments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payment_transactions pt
      WHERE pt.id = payment_installments.transaction_id
      AND (pt.buyer_id = auth.uid() OR pt.seller_id = auth.uid())
    )
  );

-- Buyers can update installments (mark as paid)
CREATE POLICY "Buyers can update installments"
  ON payment_installments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM payment_transactions pt
      WHERE pt.id = payment_installments.transaction_id
      AND pt.buyer_id = auth.uid()
    )
  );

-- ============================================
-- 6. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Ensure authenticated users can execute RPC functions
GRANT EXECUTE ON FUNCTION generate_transaction_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION check_credit_availability(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_applicable_pricing(UUID, UUID, UUID, NUMERIC) TO authenticated;

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON credit_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON receivables TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_installments TO authenticated;
GRANT SELECT ON pricing_rules TO authenticated;
GRANT SELECT ON financial_partners TO authenticated;
