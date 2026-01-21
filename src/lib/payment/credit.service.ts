// @ts-nocheck
// ============================================
// Credit Management Service
// ============================================

import { supabase } from "../supabase/supabase";
import type {
  CreditLimit,
  CreditLimitWithDetails,
  CreateCreditLimitRequest,
  UpdateCreditLimitRequest,
  CreditLimitFilters,
  CreditDashboardStats,
} from "./types";

/**
 * Create credit limit for customer (business only)
 */
export async function createCreditLimit(
  request: CreateCreditLimitRequest,
): Promise<{
  creditLimit: CreditLimit | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { creditLimit: null, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase
      .from("credit_limits")
      .insert({
        business_id: user.id,
        customer_id: request.customer_id,
        credit_limit: request.credit_limit,
        default_term_days: request.default_term_days,
        default_interest_rate: request.default_interest_rate,
        default_late_fee_rate: request.default_late_fee_rate || 2,
        risk_level: request.risk_level || "medium",
        credit_score: request.credit_score,
        notes: request.notes,
        is_active: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating credit limit:", error);
      return { creditLimit: null, error: error.message };
    }

    return { creditLimit: data };
  } catch (err: any) {
    console.error("Exception in createCreditLimit:", err);
    return { creditLimit: null, error: err.message };
  }
}

/**
 * Update credit limit
 */
export async function updateCreditLimit(
  creditLimitId: string,
  updates: UpdateCreditLimitRequest,
): Promise<{
  creditLimit: CreditLimit | null;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("credit_limits")
      .update(updates)
      .eq("id", creditLimitId)
      .select()
      .single();

    if (error) {
      console.error("Error updating credit limit:", error);
      return { creditLimit: null, error: error.message };
    }

    return { creditLimit: data };
  } catch (err: any) {
    console.error("Exception in updateCreditLimit:", err);
    return { creditLimit: null, error: err.message };
  }
}

/**
 * Get all credit limits for business
 */
export async function getBusinessCreditLimits(
  filters?: CreditLimitFilters,
): Promise<{
  creditLimits: CreditLimitWithDetails[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { creditLimits: [], error: "Chưa đăng nhập" };
    }

    let query = supabase
      .from("credit_limits")
      .select(
        `
        *,
        customer:profiles!customer_id(username, avatar_url, phone_number)
      `,
      )
      .eq("business_id", user.id);

    // Apply filters
    if (filters) {
      if (filters.is_active !== undefined)
        query = query.eq("is_active", filters.is_active);
      if (filters.risk_level)
        query = query.eq("risk_level", filters.risk_level);
      if (filters.min_limit)
        query = query.gte("credit_limit", filters.min_limit);
      if (filters.max_limit)
        query = query.lte("credit_limit", filters.max_limit);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching credit limits:", error);
      return { creditLimits: [], error: error.message };
    }

    // Get transaction stats for each customer
    const customerIds = data.map((cl) => cl.customer_id);
    const { data: txnStats, error: txnError } = await supabase
      .from("payment_transactions")
      .select("buyer_id, status")
      .in("buyer_id", customerIds)
      .eq("seller_id", user.id)
      .eq("type", "credit");

    const statsMap = new Map();
    if (!txnError && txnStats) {
      txnStats.forEach((txn) => {
        if (!statsMap.has(txn.buyer_id)) {
          statsMap.set(txn.buyer_id, { total: 0, overdue: 0 });
        }
        const stats = statsMap.get(txn.buyer_id);
        stats.total++;
        // Note: Would need to check receivables for actual overdue count
      });
    }

    const creditLimits: CreditLimitWithDetails[] = data.map((cl: any) => {
      const stats = statsMap.get(cl.customer_id) || { total: 0, overdue: 0 };
      return {
        ...cl,
        customer_username: cl.customer?.username,
        customer_avatar_url: cl.customer?.avatar_url,
        customer_phone: cl.customer?.phone_number,
        total_transactions: stats.total,
        overdue_count: stats.overdue,
      };
    });

    return { creditLimits };
  } catch (err: any) {
    console.error("Exception in getBusinessCreditLimits:", err);
    return { creditLimits: [], error: err.message };
  }
}

/**
 * Get customer's credit limit with specific business
 */
export async function getCustomerCreditLimit(businessId: string): Promise<{
  creditLimit: CreditLimit | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { creditLimit: null, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase
      .from("credit_limits")
      .select("*")
      .eq("customer_id", user.id)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching credit limit:", error);
      return { creditLimit: null, error: error.message };
    }

    // maybeSingle returns null if no data found
    if (!data) {
      return { creditLimit: null };
    }

    return { creditLimit: data };
  } catch (err: any) {
    console.error("Exception in getCustomerCreditLimit:", err);
    return { creditLimit: null, error: err.message };
  }
}

/**
 * Delete/deactivate credit limit
 */
export async function deactivateCreditLimit(creditLimitId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from("credit_limits")
      .update({ is_active: false })
      .eq("id", creditLimitId);

    if (error) {
      console.error("Error deactivating credit limit:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in deactivateCreditLimit:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get credit dashboard stats (for business)
 */
export async function getCreditDashboardStats(): Promise<{
  stats: CreditDashboardStats | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { stats: null, error: "Chưa đăng nhập" };
    }

    // Get all credit limits
    const { data: creditLimits, error: clError } = await supabase
      .from("credit_limits")
      .select("*")
      .eq("business_id", user.id);

    if (clError) {
      console.error("Error fetching credit limits:", clError);
      return { stats: null, error: clError.message };
    }

    // Get overdue receivables
    const { data: receivables, error: recError } = await supabase
      .from("receivables_with_overdue")
      .select("customer_id, days_overdue")
      .eq("business_id", user.id);

    if (recError) {
      console.error("Error fetching receivables:", recError);
      return { stats: null, error: recError.message };
    }

    // Calculate stats
    const total_credit_limit = creditLimits.reduce(
      (sum, cl) => sum + Number(cl.credit_limit),
      0,
    );
    const total_used_credit = creditLimits.reduce(
      (sum, cl) => sum + Number(cl.used_credit),
      0,
    );
    const total_available_credit = total_credit_limit - total_used_credit;
    const active_customers = creditLimits.filter((cl) => cl.is_active).length;
    const high_risk_count = creditLimits.filter(
      (cl) => cl.risk_level === "high",
    ).length;

    // Count unique customers with overdue
    const overdueCustomers = new Set(
      receivables.filter((r) => r.days_overdue > 0).map((r) => r.customer_id),
    );
    const overdue_count = overdueCustomers.size;

    const utilization_rate =
      total_credit_limit > 0
        ? (total_used_credit / total_credit_limit) * 100
        : 0;

    const stats: CreditDashboardStats = {
      total_credit_limit,
      total_used_credit,
      total_available_credit,
      active_customers,
      overdue_count,
      high_risk_count,
      utilization_rate,
    };

    return { stats };
  } catch (err: any) {
    console.error("Exception in getCreditDashboardStats:", err);
    return { stats: null, error: err.message };
  }
}

/**
 * Search customers for credit limit assignment
 */
export async function searchCustomers(searchQuery: string): Promise<{
  customers: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, phone_number, role")
      .eq("role", "farmer")
      .or(`username.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
      .limit(20);

    if (error) {
      console.error("Error searching customers:", error);
      return { customers: [], error: error.message };
    }

    return { customers: data || [] };
  } catch (err: any) {
    console.error("Exception in searchCustomers:", err);
    return { customers: [], error: err.message };
  }
}

/**
 * Delete credit limit
 */
export async function deleteCreditLimit(creditLimitId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const { error } = await supabase
      .from("credit_limits")
      .delete()
      .eq("id", creditLimitId)
      .eq("business_id", user.id); // Security: only delete own credit limits

    if (error) {
      console.error("Error deleting credit limit:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in deleteCreditLimit:", err);
    return { success: false, error: err.message };
  }
}
