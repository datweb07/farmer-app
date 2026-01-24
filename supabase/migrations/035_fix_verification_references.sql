-- Fix verification_documents foreign key references to use profiles instead of auth.users

-- Drop existing foreign key constraints
ALTER TABLE verification_documents 
DROP CONSTRAINT IF EXISTS verification_documents_user_id_fkey;

ALTER TABLE verification_documents 
DROP CONSTRAINT IF EXISTS verification_documents_verified_by_fkey;

-- Add new foreign key constraints referencing profiles
ALTER TABLE verification_documents 
ADD CONSTRAINT verification_documents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE verification_documents 
ADD CONSTRAINT verification_documents_verified_by_fkey 
FOREIGN KEY (verified_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Farmers can view own verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Farmers can upload own verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Farmers can update own pending documents" ON verification_documents;
DROP POLICY IF EXISTS "Business users can view all verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Business users can update verification documents" ON verification_documents;

-- Recreate RLS policies with correct references
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
