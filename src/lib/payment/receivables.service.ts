// @ts-nocheck
// ============================================
// Receivables Management Service
// ============================================

import { supabase } from "../supabase/supabase";
import type {
  Receivable,
  ReceivableWithDetails,
  ReceivableFilters,
  MakePaymentRequest,
  DiscountInvoiceRequest,
  ReceivableDashboardStats,
} from "./types";

/**
 * Get all receivables for business
 */
export async function getBusinessReceivables(
  filters?: ReceivableFilters,
): Promise<{
  receivables: ReceivableWithDetails[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { receivables: [], error: "Chưa đăng nhập" };
    }

    let query = supabase
      .from("receivables_with_overdue")
      .select(
        `
        *,
        customer:profiles!customer_id(username, avatar_url, phone_number),
        transaction:payment_transactions!transaction_id(transaction_code, product_id),
        product:payment_transactions!transaction_id(product:products(name))
      `,
      )
      .eq("business_id", user.id);

    // Apply filters
    if (filters) {
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.customer_id)
        query = query.eq("customer_id", filters.customer_id);
      if (filters.is_overdue)
        query = query
          .lt("due_date", new Date().toISOString())
          .gt("outstanding_amount", 0);
      if (filters.from_due_date)
        query = query.gte("due_date", filters.from_due_date);
      if (filters.to_due_date)
        query = query.lte("due_date", filters.to_due_date);
      if (filters.min_amount)
        query = query.gte("outstanding_amount", filters.min_amount);
      if (filters.max_amount)
        query = query.lte("outstanding_amount", filters.max_amount);
    }

    query = query.order("due_date", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching receivables:", error);
      return { receivables: [], error: error.message };
    }

    const receivables: ReceivableWithDetails[] = data.map((r: any) => ({
      ...r,
      customer_username: r.customer?.username,
      customer_avatar_url: r.customer?.avatar_url,
      customer_phone: r.customer?.phone_number,
      transaction_code: r.transaction?.transaction_code,
      product_name: r.product?.product?.name,
    }));

    return { receivables };
  } catch (err: any) {
    console.error("Exception in getBusinessReceivables:", err);
    return { receivables: [], error: err.message };
  }
}

/**
 * Get customer's receivables (debts)
 */
export async function getCustomerReceivables(
  filters?: ReceivableFilters,
): Promise<{
  receivables: ReceivableWithDetails[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { receivables: [], error: "Chưa đăng nhập" };
    }

    let query = supabase
      .from("receivables_with_overdue")
      .select(
        `
        *,
        business:profiles!business_id(username, avatar_url, phone_number),
        transaction:payment_transactions!transaction_id(transaction_code, product_id),
        product:payment_transactions!transaction_id(product:products(name, image_url))
      `,
      )
      .eq("customer_id", user.id);

    // Apply filters
    if (filters) {
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.is_overdue)
        query = query
          .lt("due_date", new Date().toISOString())
          .gt("outstanding_amount", 0);
      if (filters.from_due_date)
        query = query.gte("due_date", filters.from_due_date);
      if (filters.to_due_date)
        query = query.lte("due_date", filters.to_due_date);
    }

    query = query.order("due_date", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching customer receivables:", error);
      return { receivables: [], error: error.message };
    }

    const receivables: ReceivableWithDetails[] = data.map((r: any) => ({
      ...r,
      transaction_code: r.transaction?.transaction_code,
      product_name: r.product?.product?.name,
    }));

    return { receivables };
  } catch (err: any) {
    console.error("Exception in getCustomerReceivables:", err);
    return { receivables: [], error: err.message };
  }
}

/**
 * Make payment on receivable
 */
export async function makePayment(request: MakePaymentRequest): Promise<{
  success: boolean;
  receivable?: Receivable;
  error?: string;
}> {
  try {
    // Get receivable details
    const { data: receivable, error: fetchError } = await supabase
      .from("receivables")
      .select("*")
      .eq("id", request.receivable_id)
      .single();

    if (fetchError) {
      console.error("Error fetching receivable:", fetchError);
      return { success: false, error: fetchError.message };
    }

    const new_paid_amount = Number(receivable.paid_amount) + request.amount;
    const new_outstanding =
      Number(receivable.outstanding_amount) - request.amount;

    // Determine new status
    let new_status = receivable.status;
    if (new_outstanding <= 0) {
      new_status = "paid";
    } else if (new_paid_amount > 0) {
      new_status = "partial";
    }

    // Update receivable
    const { data: updated, error: updateError } = await supabase
      .from("receivables")
      .update({
        paid_amount: new_paid_amount,
        outstanding_amount: Math.max(0, new_outstanding),
        status: new_status,
        paid_at: new_outstanding <= 0 ? new Date().toISOString() : null,
      })
      .eq("id", request.receivable_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating receivable:", updateError);
      return { success: false, error: updateError.message };
    }

    // Update related transaction
    await supabase
      .from("payment_transactions")
      .update({
        paid_amount: new_paid_amount,
        remaining_amount: Math.max(0, new_outstanding),
        status: new_outstanding <= 0 ? "completed" : "processing",
        completed_at: new_outstanding <= 0 ? new Date().toISOString() : null,
      })
      .eq("id", receivable.transaction_id);

    // Update credit limit (reduce used credit)
    if (new_outstanding <= 0 || request.amount > 0) {
      await supabase.rpc("reduce_used_credit", {
        p_business_id: receivable.business_id,
        p_customer_id: receivable.customer_id,
        p_amount: request.amount,
      });
    }

    return { success: true, receivable: updated };
  } catch (err: any) {
    console.error("Exception in makePayment:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Discount invoice (chiết khấu hóa đơn)
 */
export async function discountInvoice(
  request: DiscountInvoiceRequest,
): Promise<{
  success: boolean;
  receivable?: Receivable;
  error?: string;
}> {
  try {
    // Get receivable details
    const { data: receivable, error: fetchError } = await supabase
      .from("receivables")
      .select("*, partner:financial_partners!partner_id(*)")
      .eq("id", request.receivable_id)
      .single();

    if (fetchError) {
      console.error("Error fetching receivable:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (receivable.is_discounted) {
      return { success: false, error: "Hóa đơn đã được chiết khấu" };
    }

    // Get partner details
    const { data: partner, error: partnerError } = await supabase
      .from("financial_partners")
      .select("*")
      .eq("id", request.partner_id)
      .single();

    if (partnerError) {
      console.error("Error fetching partner:", partnerError);
      return { success: false, error: partnerError.message };
    }

    // Calculate discounted amount
    const discount_amount =
      (Number(receivable.outstanding_amount) * request.discount_rate) / 100;
    const discounted_amount =
      Number(receivable.outstanding_amount) - discount_amount;

    // Update receivable
    const { data: updated, error: updateError } = await supabase
      .from("receivables")
      .update({
        is_discounted: true,
        discount_rate: request.discount_rate,
        discounted_amount,
        discounted_to: partner.name,
        discounted_at: new Date().toISOString(),
        status: "discounted",
      })
      .eq("id", request.receivable_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating receivable:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, receivable: updated };
  } catch (err: any) {
    console.error("Exception in discountInvoice:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get receivables dashboard stats
 */
export async function getReceivableDashboardStats(): Promise<{
  stats: ReceivableDashboardStats | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { stats: null, error: "Chưa đăng nhập" };
    }

    const { data: receivables, error } = await supabase
      .from("receivables_with_overdue")
      .select("outstanding_amount, days_overdue, paid_amount, original_amount")
      .eq("business_id", user.id);

    if (error) {
      console.error("Error fetching receivables:", error);
      return { stats: null, error: error.message };
    }

    const total_outstanding = receivables.reduce(
      (sum, r) => sum + Number(r.outstanding_amount),
      0,
    );

    const overdue = receivables.filter((r) => r.days_overdue > 0);
    const total_overdue = overdue.reduce(
      (sum, r) => sum + Number(r.outstanding_amount),
      0,
    );

    // Aging buckets
    const aging_0_30_days = receivables
      .filter((r) => r.days_overdue > 0 && r.days_overdue <= 30)
      .reduce((sum, r) => sum + Number(r.outstanding_amount), 0);

    const aging_31_60_days = receivables
      .filter((r) => r.days_overdue > 30 && r.days_overdue <= 60)
      .reduce((sum, r) => sum + Number(r.outstanding_amount), 0);

    const aging_61_90_days = receivables
      .filter((r) => r.days_overdue > 60 && r.days_overdue <= 90)
      .reduce((sum, r) => sum + Number(r.outstanding_amount), 0);

    const aging_over_90_days = receivables
      .filter((r) => r.days_overdue > 90)
      .reduce((sum, r) => sum + Number(r.outstanding_amount), 0);

    // Collection rate
    const total_billed = receivables.reduce(
      (sum, r) => sum + Number(r.original_amount),
      0,
    );
    const total_collected = receivables.reduce(
      (sum, r) => sum + Number(r.paid_amount),
      0,
    );
    const collection_rate =
      total_billed > 0 ? (total_collected / total_billed) * 100 : 0;

    // Average days overdue
    const average_days_overdue =
      overdue.length > 0
        ? overdue.reduce((sum, r) => sum + r.days_overdue, 0) / overdue.length
        : 0;

    const stats: ReceivableDashboardStats = {
      total_outstanding,
      total_overdue,
      aging_0_30_days,
      aging_31_60_days,
      aging_61_90_days,
      aging_over_90_days,
      collection_rate,
      average_days_overdue,
    };

    return { stats };
  } catch (err: any) {
    console.error("Exception in getReceivableDashboardStats:", err);
    return { stats: null, error: err.message };
  }
}

/**
 * Get financial partners list
 */
export async function getFinancialPartners(): Promise<{
  partners: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("financial_partners")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching financial partners:", error);
      return { partners: [], error: error.message };
    }

    return { partners: data || [] };
  } catch (err: any) {
    console.error("Exception in getFinancialPartners:", err);
    return { partners: [], error: err.message };
  }
}
