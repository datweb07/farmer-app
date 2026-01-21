// @ts-nocheck
// ============================================
// Payment Transaction Service
// ============================================

import { supabase } from "../supabase/supabase";
import type {
  PaymentTransaction,
  PaymentTransactionWithDetails,
  CreateTransactionRequest,
  ProcessPaymentRequest,
  TransactionFilters,
  PaymentDashboardStats,
} from "./types";

/**
 * Create new payment transaction
 */
export async function createTransaction(
  request: CreateTransactionRequest,
): Promise<{
  transaction: PaymentTransaction | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { transaction: null, error: "Chưa đăng nhập" };
    }

    // Calculate final amount
    const final_amount =
      request.amount -
      (request.discount_amount || 0) +
      (request.tax_amount || 0);

    // Calculate due date for credit
    let due_date = null;
    if (request.type === "credit" && request.credit_term_days) {
      const date = new Date();
      date.setDate(date.getDate() + request.credit_term_days);
      due_date = date.toISOString();
    }

    const { data, error } = await supabase
      .from("payment_transactions")
      .insert({
        buyer_id: user.id,
        seller_id: request.seller_id,
        product_id: request.product_id,
        type: request.type,
        amount: request.amount,
        discount_amount: request.discount_amount || 0,
        tax_amount: request.tax_amount || 0,
        final_amount,
        payment_method: request.payment_method,
        payment_provider: request.payment_provider,
        credit_term_days: request.credit_term_days,
        due_date,
        remaining_amount: final_amount,
        notes: request.notes,
        status: request.type === "immediate" ? "processing" : "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating transaction:", error);
      return { transaction: null, error: error.message };
    }

    return { transaction: data };
  } catch (err: any) {
    console.error("Exception in createTransaction:", err);
    return { transaction: null, error: err.message };
  }
}

/**
 * Process payment for immediate transactions
 */
export async function processPayment(request: ProcessPaymentRequest): Promise<{
  success: boolean;
  transaction?: PaymentTransaction;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    // First get the transaction to get final_amount
    const { data: existingTxn, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("final_amount, buyer_id")
      .eq("id", request.transaction_id)
      .single();

    if (fetchError || !existingTxn) {
      console.error("Error fetching transaction:", fetchError);
      return { success: false, error: "Không tìm thấy giao dịch" };
    }

    // Check if user is the buyer
    if (existingTxn.buyer_id !== user.id) {
      return { success: false, error: "Không có quyền cập nhật giao dịch này" };
    }

    // Update transaction
    const { data, error } = await supabase
      .from("payment_transactions")
      .update({
        payment_method: request.payment_method,
        payment_provider: request.payment_provider,
        payment_reference: request.payment_reference,
        status: "completed",
        completed_at: new Date().toISOString(),
        paid_amount: existingTxn.final_amount,
        remaining_amount: 0,
      })
      .eq("id", request.transaction_id)
      .select()
      .single();

    if (error) {
      console.error("Error processing payment:", error);
      return { success: false, error: error.message };
    }

    return { success: true, transaction: data };
  } catch (err: any) {
    console.error("Exception in processPayment:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a payment transaction (seller only)
 */
export async function deleteTransaction(transactionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" };
    }

    // Delete the transaction (RLS will ensure only seller can delete)
    const { error } = await supabase
      .from("payment_transactions")
      .delete()
      .eq("id", transactionId)
      .eq("seller_id", user.id); // Extra safety check

    if (error) {
      console.error("Error deleting transaction:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in deleteTransaction:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get user transactions (buyer or seller)
 */
export async function getUserTransactions(
  filters?: TransactionFilters,
): Promise<{
  transactions: PaymentTransactionWithDetails[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { transactions: [], error: "Chưa đăng nhập" };
    }

    let query = supabase
      .from("payment_transactions")
      .select(
        `
        *,
        buyer:profiles!buyer_id(username, avatar_url),
        seller:profiles!seller_id(username, avatar_url),
        product:products(name, image_url)
      `,
      )
      .order("created_at", { ascending: false });

    // Apply role filter first
    if (filters?.role === "buyer") {
      query = query.eq("buyer_id", user.id);
    } else if (filters?.role === "seller") {
      query = query.eq("seller_id", user.id);
    } else {
      // Default: show both buyer and seller transactions
      query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    }

    // Apply other filters
    if (filters) {
      if (filters.type) query = query.eq("type", filters.type);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.payment_method)
        query = query.eq("payment_method", filters.payment_method);
      if (filters.buyer_id) query = query.eq("buyer_id", filters.buyer_id);
      if (filters.seller_id) query = query.eq("seller_id", filters.seller_id);
      if (filters.from_date) query = query.gte("created_at", filters.from_date);
      if (filters.to_date) query = query.lte("created_at", filters.to_date);
      if (filters.min_amount)
        query = query.gte("final_amount", filters.min_amount);
      if (filters.max_amount)
        query = query.lte("final_amount", filters.max_amount);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return { transactions: [], error: error.message };
    }

    // Transform data
    const transactions: PaymentTransactionWithDetails[] = data.map(
      (t: any) => ({
        ...t,
        buyer_username: t.buyer?.username,
        buyer_avatar_url: t.buyer?.avatar_url,
        seller_username: t.seller?.username,
        seller_avatar_url: t.seller?.avatar_url,
        product_name: t.product?.name,
        product_image_url: t.product?.image_url,
      }),
    );

    return { transactions };
  } catch (err: any) {
    console.error("Exception in getUserTransactions:", err);
    return { transactions: [], error: err.message };
  }
}

/**
 * Get transaction details by ID
 */
export async function getTransactionDetails(transactionId: string): Promise<{
  transaction: PaymentTransactionWithDetails | null;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select(
        `
        *,
        buyer:profiles!buyer_id(username, avatar_url, phone_number),
        seller:profiles!seller_id(username, avatar_url, phone_number),
        product:products(name, image_url, price, category)
      `,
      )
      .eq("id", transactionId)
      .single();

    if (error) {
      console.error("Error fetching transaction details:", error);
      return { transaction: null, error: error.message };
    }

    const transaction: PaymentTransactionWithDetails = {
      ...data,
      buyer_username: data.buyer?.username,
      buyer_avatar_url: data.buyer?.avatar_url,
      seller_username: data.seller?.username,
      seller_avatar_url: data.seller?.avatar_url,
      product_name: data.product?.name,
      product_image_url: data.product?.image_url,
    };

    return { transaction };
  } catch (err: any) {
    console.error("Exception in getTransactionDetails:", err);
    return { transaction: null, error: err.message };
  }
}

/**
 * Cancel transaction
 */
export async function cancelTransaction(
  transactionId: string,
  reason?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from("payment_transactions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        notes: reason,
      })
      .eq("id", transactionId)
      .eq("status", "pending");

    if (error) {
      console.error("Error cancelling transaction:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in cancelTransaction:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get payment dashboard stats (for business users)
 */
export async function getPaymentDashboardStats(): Promise<{
  stats: PaymentDashboardStats | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { stats: null, error: "Chưa đăng nhập" };
    }

    // Get all completed transactions where user is seller
    const { data: completedTxns, error: completedError } = await supabase
      .from("payment_transactions")
      .select("final_amount, completed_at, created_at")
      .eq("seller_id", user.id)
      .eq("status", "completed");

    if (completedError) {
      console.error("Error fetching completed transactions:", completedError);
      return { stats: null, error: completedError.message };
    }

    // Get pending payments
    const { data: pendingTxns, error: pendingError } = await supabase
      .from("payment_transactions")
      .select("final_amount")
      .eq("seller_id", user.id)
      .in("status", ["pending", "processing"]);

    if (pendingError) {
      console.error("Error fetching pending transactions:", pendingError);
      return { stats: null, error: pendingError.message };
    }

    // Get receivables
    const { data: receivables, error: receivablesError } = await supabase
      .from("receivables_with_overdue")
      .select("outstanding_amount, days_overdue")
      .eq("business_id", user.id);

    if (receivablesError) {
      console.error("Error fetching receivables:", receivablesError);
      return { stats: null, error: receivablesError.message };
    }

    // Get credit transactions
    const { data: creditTxns, error: creditError } = await supabase
      .from("payment_transactions")
      .select("final_amount")
      .eq("seller_id", user.id)
      .eq("type", "credit");

    if (creditError) {
      console.error("Error fetching credit transactions:", creditError);
      return { stats: null, error: creditError.message };
    }

    // Calculate stats
    const total_revenue = completedTxns.reduce(
      (sum, t) => sum + Number(t.final_amount),
      0,
    );
    const pending_payments = pendingTxns.reduce(
      (sum, t) => sum + Number(t.final_amount),
      0,
    );
    const total_receivables = receivables.reduce(
      (sum, r) => sum + Number(r.outstanding_amount),
      0,
    );
    const overdue_amount = receivables
      .filter((r) => r.days_overdue > 0)
      .reduce((sum, r) => sum + Number(r.outstanding_amount), 0);
    const total_credit_issued = creditTxns.reduce(
      (sum, t) => sum + Number(t.final_amount),
      0,
    );

    // Calculate average payment days
    const completedWithDays = completedTxns.filter(
      (t) => t.completed_at && t.created_at,
    );
    const average_payment_days =
      completedWithDays.length > 0
        ? completedWithDays.reduce((sum, t) => {
            const days = Math.floor(
              (new Date(t.completed_at).getTime() -
                new Date(t.created_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return sum + days;
          }, 0) / completedWithDays.length
        : 0;

    // TODO: Calculate trends (compare with previous period)
    const stats: PaymentDashboardStats = {
      total_revenue,
      pending_payments,
      overdue_amount,
      total_credit_issued,
      total_receivables,
      average_payment_days,
      revenue_trend: 0,
      credit_trend: 0,
      overdue_trend: 0,
    };

    return { stats };
  } catch (err: any) {
    console.error("Exception in getPaymentDashboardStats:", err);
    return { stats: null, error: err.message };
  }
}

/**
 * Check credit availability before purchase
 */
export async function checkCreditAvailability(
  businessId: string,
  amount: number,
): Promise<{
  result: any;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { result: null, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase.rpc("check_credit_availability", {
      p_customer_id: user.id,
      p_business_id: businessId,
      p_amount: amount,
    });

    if (error) {
      console.error("Error checking credit availability:", error);
      return { result: null, error: error.message };
    }

    return { result: data };
  } catch (err: any) {
    console.error("Exception in checkCreditAvailability:", err);
    return { result: null, error: err.message };
  }
}

/**
 * Get applicable pricing for a product
 */
export async function getApplicablePricing(
  businessId: string,
  productId: string,
  basePrice: number,
): Promise<{
  pricing: any;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { pricing: null, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase.rpc("get_applicable_pricing", {
      p_business_id: businessId,
      p_customer_id: user.id,
      p_product_id: productId,
      p_base_price: basePrice,
    });

    if (error) {
      console.error("Error getting applicable pricing:", error);
      return { pricing: null, error: error.message };
    }

    return { pricing: data };
  } catch (err: any) {
    console.error("Exception in getApplicablePricing:", err);
    return { pricing: null, error: err.message };
  }
}
