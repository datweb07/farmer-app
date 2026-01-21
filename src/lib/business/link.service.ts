// @ts-nocheck
// ============================================
// Business Customer Link Service
// ============================================

import { supabase } from "../supabase/supabase";

export interface BusinessCustomerLink {
  id: string;
  business_id: string;
  customer_id: string;
  status: "pending" | "active" | "inactive" | "rejected";
  linked_at?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  business_name?: string;
  notes?: string;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Check if customer is linked with a business
 */
export async function checkBusinessLink(businessId: string): Promise<{
  linked: boolean;
  link?: BusinessCustomerLink;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { linked: false, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase
      .from("business_customer_links")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking business link:", error);
      return { linked: false, error: error.message };
    }

    return { linked: !!data, link: data || undefined };
  } catch (err: any) {
    console.error("Exception in checkBusinessLink:", err);
    return { linked: false, error: err.message };
  }
}

/**
 * Create a link request to a business
 */
export async function createBusinessLink(businessId: string): Promise<{
  link: BusinessCustomerLink | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { link: null, error: "Chưa đăng nhập" };
    }

    // Get customer profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, phone_number")
      .eq("id", user.id)
      .single();

    // Get business profile
    const { data: businessProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", businessId)
      .single();

    const { data, error } = await supabase
      .from("business_customer_links")
      .insert({
        business_id: businessId,
        customer_id: user.id,
        status: "active", // Auto-approve for simplicity
        linked_at: new Date().toISOString(),
        customer_name: profile?.username,
        customer_email: null, // Not using email anymore
        customer_phone: profile?.phone_number,
        business_name: businessProfile?.username,
        requested_by: user.id,
        approved_by: businessId,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Check if already exists
      if (error.code === "23505") {
        return {
          link: null,
          error: "Bạn đã liên kết với doanh nghiệp này rồi",
        };
      }
      console.error("Error creating business link:", error);
      return { link: null, error: error.message };
    }

    return { link: data };
  } catch (err: any) {
    console.error("Exception in createBusinessLink:", err);
    return { link: null, error: err.message };
  }
}

/**
 * Get customer's active business links
 */
export async function getCustomerLinks(): Promise<{
  links: BusinessCustomerLink[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { links: [], error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase
      .from("business_customer_links")
      .select("*")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting customer links:", error);
      return { links: [], error: error.message };
    }

    return { links: data || [] };
  } catch (err: any) {
    console.error("Exception in getCustomerLinks:", err);
    return { links: [], error: err.message };
  }
}

/**
 * Get business's customer links (for business dashboard)
 */
export async function getBusinessLinks(): Promise<{
  links: BusinessCustomerLink[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { links: [], error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase
      .from("business_customer_links")
      .select("*")
      .eq("business_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting business links:", error);
      return { links: [], error: error.message };
    }

    return { links: data || [] };
  } catch (err: any) {
    console.error("Exception in getBusinessLinks:", err);
    return { links: [], error: err.message };
  }
}

/**
 * Remove a business link
 */
export async function removeBusinessLink(linkId: string): Promise<{
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
      .from("business_customer_links")
      .delete()
      .eq("id", linkId)
      .or(`business_id.eq.${user.id},customer_id.eq.${user.id}`);

    if (error) {
      console.error("Error removing business link:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in removeBusinessLink:", err);
    return { success: false, error: err.message };
  }
}
