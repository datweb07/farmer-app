// ============================================
// Payment & Credit System Types
// ============================================

// ============================================
// Enums
// ============================================

export type TransactionType = "immediate" | "credit" | "installment" | "refund";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentMethod =
  | "bank_transfer"
  | "e_wallet"
  | "credit_card"
  | "cash"
  | "credit";

export type ReceivableStatus =
  | "pending"
  | "partial"
  | "paid"
  | "overdue"
  | "written_off"
  | "discounted";

export type InstallmentStatus = "pending" | "paid" | "overdue" | "waived";

export type RiskLevel = "low" | "medium" | "high";

export type FinancialPartnerType = "bank" | "fintech" | "investor" | "other";

// ============================================
// Main Interfaces
// ============================================

export interface PaymentTransaction {
  id: string;
  transaction_code: string;
  type: TransactionType;
  status: TransactionStatus;

  // Parties
  buyer_id: string;
  seller_id: string;
  product_id?: string;

  // Amounts
  amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;

  // Payment details
  payment_method?: PaymentMethod;
  payment_provider?: string;
  payment_reference?: string;

  // Credit details
  credit_term_days?: number;
  due_date?: string;
  interest_rate?: number;
  late_fee_rate?: number;

  // Status
  paid_amount: number;
  remaining_amount?: number;

  notes?: string;
  metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface PaymentTransactionWithDetails extends PaymentTransaction {
  buyer_username?: string;
  buyer_avatar_url?: string;
  seller_username?: string;
  seller_avatar_url?: string;
  product_name?: string;
  product_image_url?: string;
}

export interface CreditLimit {
  id: string;
  business_id: string;
  customer_id: string;

  // Credit amounts
  credit_limit: number;
  used_credit: number;
  available_credit: number;

  // Terms
  default_term_days: number;
  default_interest_rate: number;
  default_late_fee_rate: number;

  // Status
  is_active: boolean;
  approved_by?: string;
  approved_at?: string;

  // Risk
  risk_level: RiskLevel;
  credit_score?: number;

  notes?: string;

  created_at: string;
  updated_at: string;
}

export interface CreditLimitWithDetails extends CreditLimit {
  customer_username?: string;
  customer_avatar_url?: string;
  customer_phone?: string;
  overdue_count?: number;
  total_transactions?: number;
}

export interface Receivable {
  id: string;
  transaction_id: string;
  invoice_number: string;

  // Parties
  business_id: string;
  customer_id: string;

  // Amounts
  original_amount: number;
  outstanding_amount: number;
  paid_amount: number;
  interest_amount: number;
  late_fee_amount: number;

  // Terms
  due_date: string;
  days_overdue: number;
  status: ReceivableStatus;

  // Discounting
  is_discounted: boolean;
  discount_rate?: number;
  discounted_amount?: number;
  discounted_to?: string;
  discounted_at?: string;

  notes?: string;

  created_at: string;
  updated_at: string;
  paid_at?: string;
}

export interface ReceivableWithDetails extends Receivable {
  customer_username?: string;
  customer_avatar_url?: string;
  customer_phone?: string;
  transaction_code?: string;
  product_name?: string;
}

export interface PaymentInstallment {
  id: string;
  transaction_id: string;
  receivable_id?: string;

  installment_number: number;
  total_installments: number;

  amount: number;
  paid_amount: number;
  remaining_amount: number;

  due_date: string;
  status: InstallmentStatus;

  paid_at?: string;
  payment_reference?: string;

  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  business_id: string;
  customer_id?: string;
  product_id?: string;

  // Pricing
  discount_percentage: number;
  fixed_discount: number;
  special_price?: number;

  // Credit terms
  credit_term_days?: number;
  interest_rate?: number;

  // Validity
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;

  priority: number;
  notes?: string;

  created_at: string;
  updated_at: string;
}

export interface PricingRuleWithDetails extends PricingRule {
  customer_username?: string;
  product_name?: string;
}

export interface FinancialPartner {
  id: string;
  name: string;
  type: FinancialPartnerType;

  // Contact
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;

  // Terms
  discount_rate?: number;
  advance_rate?: number;
  processing_fee: number;

  is_active: boolean;
  notes?: string;
  metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateTransactionRequest {
  seller_id: string;
  product_id?: string;
  amount: number;
  discount_amount?: number;
  tax_amount?: number;
  type: TransactionType;
  payment_method?: PaymentMethod;
  payment_provider?: string;
  credit_term_days?: number;
  notes?: string;
}

export interface ProcessPaymentRequest {
  transaction_id: string;
  payment_method: PaymentMethod;
  payment_provider?: string;
  payment_reference?: string;
}

export interface CreateCreditLimitRequest {
  customer_id: string;
  credit_limit: number;
  default_term_days: number;
  default_interest_rate: number;
  default_late_fee_rate?: number;
  risk_level?: RiskLevel;
  credit_score?: number;
  notes?: string;
}

export interface UpdateCreditLimitRequest {
  credit_limit?: number;
  default_term_days?: number;
  default_interest_rate?: number;
  default_late_fee_rate?: number;
  is_active?: boolean;
  risk_level?: RiskLevel;
  credit_score?: number;
  notes?: string;
}

export interface MakePaymentRequest {
  receivable_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  notes?: string;
}

export interface DiscountInvoiceRequest {
  receivable_id: string;
  partner_id: string;
  discount_rate: number;
}

export interface CreatePricingRuleRequest {
  customer_id?: string;
  product_id?: string;
  discount_percentage?: number;
  fixed_discount?: number;
  special_price?: number;
  credit_term_days?: number;
  interest_rate?: number;
  valid_from?: string;
  valid_until?: string;
  priority?: number;
  notes?: string;
}

export interface CreditAvailabilityCheck {
  available: boolean;
  reason?: string;
  credit_limit?: number;
  available_credit?: number;
  required?: number;
  term_days?: number;
  interest_rate?: number;
}

export interface ApplicablePricing {
  base_price: number;
  discount: number;
  final_price: number;
  discount_percentage?: number;
  credit_term_days?: number;
  interest_rate?: number;
}

// ============================================
// Dashboard Types
// ============================================

export interface PaymentDashboardStats {
  total_revenue: number;
  pending_payments: number;
  overdue_amount: number;
  total_credit_issued: number;
  total_receivables: number;
  average_payment_days: number;

  // Trends
  revenue_trend: number; // % change
  credit_trend: number;
  overdue_trend: number;
}

export interface CreditDashboardStats {
  total_credit_limit: number;
  total_used_credit: number;
  total_available_credit: number;
  active_customers: number;
  overdue_count: number;
  high_risk_count: number;

  utilization_rate: number; // %
}

export interface ReceivableDashboardStats {
  total_outstanding: number;
  total_overdue: number;
  aging_0_30_days: number;
  aging_31_60_days: number;
  aging_61_90_days: number;
  aging_over_90_days: number;

  collection_rate: number; // %
  average_days_overdue: number;
}

// ============================================
// Filter Types
// ============================================

export interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  payment_method?: PaymentMethod;
  buyer_id?: string;
  seller_id?: string;
  role?: "buyer" | "seller"; // Filter by user role in transaction
  from_date?: string;
  to_date?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface ReceivableFilters {
  status?: ReceivableStatus;
  customer_id?: string;
  is_overdue?: boolean;
  from_due_date?: string;
  to_due_date?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface CreditLimitFilters {
  is_active?: boolean;
  risk_level?: RiskLevel;
  min_limit?: number;
  max_limit?: number;
  has_overdue?: boolean;
}
