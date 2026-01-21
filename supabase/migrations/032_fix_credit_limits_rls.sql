-- ============================================
-- Fix Credit Limits RLS Policies
-- ============================================
-- Issue: Buyers cannot read credit_limits when filtering by business_id
-- Solution: Update policy to allow reading if user is EITHER customer OR business

-- Drop existing policies
DROP POLICY IF EXISTS "Businesses can manage credit limits" ON credit_limits;
DROP POLICY IF EXISTS "Customers can view their credit limits" ON credit_limits;

-- Create new policies
CREATE POLICY "Businesses can manage their credit limits"
  ON credit_limits FOR ALL
  USING (auth.uid() = business_id);

CREATE POLICY "Users can view credit limits they are involved in"
  ON credit_limits FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = business_id);

-- Comment
COMMENT ON POLICY "Users can view credit limits they are involved in" ON credit_limits IS 
  'Allows both customers and businesses to view credit limits where they are involved';
