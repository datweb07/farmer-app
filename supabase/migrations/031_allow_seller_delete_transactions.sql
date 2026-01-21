-- ============================================
-- Migration 031: Allow Sellers to Delete Transactions
-- ============================================
-- Description: Add RLS policy to allow sellers to delete their own transactions
-- Author: System
-- Date: 2026-01-21

-- Drop existing delete policy if exists
DROP POLICY IF EXISTS "Sellers can delete own transactions" ON payment_transactions;

-- Create new delete policy for sellers
CREATE POLICY "Sellers can delete own transactions"
  ON payment_transactions
  FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());

-- Add comment
COMMENT ON POLICY "Sellers can delete own transactions" ON payment_transactions IS
  'Allows sellers to delete their own transactions for order management';
