-- Add bank column to credit_limits table
ALTER TABLE credit_limits 
ADD COLUMN IF NOT EXISTS bank TEXT DEFAULT 'vietcombank';

-- Add comment
COMMENT ON COLUMN credit_limits.bank IS 'Ngân hàng được sử dụng cho hạn mức tín dụng';
