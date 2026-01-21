-- ============================================
-- Fix Payment System - Auto Generate Codes
-- ============================================
-- Adds DEFAULT values to auto-generate transaction_code and invoice_number

-- Update payment_transactions to auto-generate transaction_code
ALTER TABLE payment_transactions 
ALTER COLUMN transaction_code SET DEFAULT generate_transaction_code();

-- Update receivables to auto-generate invoice_number  
ALTER TABLE receivables 
ALTER COLUMN invoice_number SET DEFAULT generate_invoice_number();
