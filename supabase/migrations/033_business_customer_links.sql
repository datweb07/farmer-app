-- ============================================
-- Business Customer Links
-- ============================================
-- Allows customers to link their accounts with businesses
-- for better order management and credit limit assignment

CREATE TABLE IF NOT EXISTS business_customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parties
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Link details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
  linked_at TIMESTAMP WITH TIME ZONE,
  
  -- Customer info at time of linking
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Business info
  business_name TEXT,
  
  -- Metadata
  notes TEXT,
  requested_by UUID REFERENCES profiles(id), -- Who initiated the link
  approved_by UUID REFERENCES profiles(id), -- Business user who approved
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_business_customer UNIQUE (business_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_customer_links_business ON business_customer_links(business_id);
CREATE INDEX IF NOT EXISTS idx_business_customer_links_customer ON business_customer_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_business_customer_links_status ON business_customer_links(status) WHERE status = 'active';

-- RLS Policies
ALTER TABLE business_customer_links ENABLE ROW LEVEL SECURITY;

-- Businesses can view all their customer links
CREATE POLICY "Businesses can view their customer links"
  ON business_customer_links FOR SELECT
  USING (auth.uid() = business_id);

-- Customers can view their own links
CREATE POLICY "Customers can view their links"
  ON business_customer_links FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can create link requests
CREATE POLICY "Customers can create link requests"
  ON business_customer_links FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Businesses can update link status (approve/reject)
CREATE POLICY "Businesses can update link status"
  ON business_customer_links FOR UPDATE
  USING (auth.uid() = business_id);

-- Customers can update their own pending links (cancel)
CREATE POLICY "Customers can cancel pending links"
  ON business_customer_links FOR UPDATE
  USING (auth.uid() = customer_id AND status = 'pending');

-- Both parties can delete links
CREATE POLICY "Users can delete their links"
  ON business_customer_links FOR DELETE
  USING (auth.uid() = business_id OR auth.uid() = customer_id);

-- Trigger for updated_at
CREATE TRIGGER update_business_customer_links_timestamp
  BEFORE UPDATE ON business_customer_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON business_customer_links TO authenticated;

-- Comments
COMMENT ON TABLE business_customer_links IS 'Links between business accounts and customer accounts for order management';
COMMENT ON COLUMN business_customer_links.status IS 'pending: waiting approval, active: linked, inactive: temporarily disabled, rejected: business declined';
