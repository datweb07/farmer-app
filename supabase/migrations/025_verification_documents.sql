-- Migration: Add farmer verification documents for credit payments
-- This table stores farmer verification documents (giấy xác nhận sản xuất nông nghiệp)
-- Required for credit/pay-later purchases

-- Create verification_documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  
  -- Document info
  document_type TEXT NOT NULL DEFAULT 'farming_certificate', -- Type of document
  document_url TEXT NOT NULL, -- URL to uploaded document image
  reference_link TEXT, -- Link to official form/template
  
  -- Verification status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES profiles(id), -- Business user who verified
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT, -- Reason if rejected
  
  -- Metadata
  notes TEXT, -- Any additional notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_verification_documents_user_id ON verification_documents(user_id);
CREATE INDEX idx_verification_documents_transaction_id ON verification_documents(transaction_id);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);
CREATE INDEX idx_verification_documents_verified_by ON verification_documents(verified_by);

-- Enable RLS
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Farmers can view their own documents
CREATE POLICY "Farmers can view own verification documents"
  ON verification_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = verification_documents.user_id
    )
  );

-- Farmers can insert their own documents
CREATE POLICY "Farmers can upload own verification documents"
  ON verification_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = verification_documents.user_id
    )
  );

-- Farmers can update their own pending documents
CREATE POLICY "Farmers can update own pending documents"
  ON verification_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = verification_documents.user_id
    )
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = verification_documents.user_id
    )
    AND status = 'pending'
  );

-- Business users can view all documents
CREATE POLICY "Business users can view all verification documents"
  ON verification_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'business'
    )
  );

-- Business users can update documents (approve/reject)
CREATE POLICY "Business users can update verification documents"
  ON verification_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'business'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'business'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_verification_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER verification_documents_updated_at
  BEFORE UPDATE ON verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_documents_updated_at();

-- Add verification_document_id to payment_transactions table (optional link)
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS verification_document_id UUID REFERENCES verification_documents(id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_verification_document_id 
ON payment_transactions(verification_document_id);

-- Update transaction status to require verification for credit payments
-- Add new status: 'pending_verification'
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_status_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_status_check 
CHECK (status IN (
  'pending', 
  'pending_verification', -- New status for credit payments awaiting verification
  'processing', 
  'completed', 
  'failed', 
  'cancelled', 
  'refunded'
));

-- Comment
COMMENT ON TABLE verification_documents IS 'Stores farmer verification documents for credit purchases';
COMMENT ON COLUMN verification_documents.document_type IS 'Type of verification document (e.g., farming_certificate)';
COMMENT ON COLUMN verification_documents.status IS 'pending, approved, or rejected';
COMMENT ON COLUMN verification_documents.verified_by IS 'Business user who verified the document';
