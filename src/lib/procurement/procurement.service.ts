// @ts-nocheck - New Supabase objects are declared by migration 038.
import { supabase } from "../supabase/supabase";
import type {
  BusinessReputation,
  BusinessReview,
  CompleteProcurementRequest,
  CreateProcurementRequest,
  ProcurementRequest,
} from "./types";

export async function createProcurementRequest(input: CreateProcurementRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { request: null, error: "Vui lòng đăng nhập." };

  const { data, error } = await supabase
    .from("procurement_requests")
    .insert({
      ...input,
      farmer_id: user.id,
      note: input.note?.trim() || null,
    })
    .select()
    .single();

  if (error?.code === "23505") {
    return { request: null, error: "Bạn đã đăng ký thu mua cho bài viết này." };
  }
  return { request: data as ProcurementRequest | null, error: error?.message };
}

export async function getIncomingProcurementRequests() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { requests: [], error: "Vui lòng đăng nhập." };
  const { data, error } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("business_id", user.id)
    .order("created_at", { ascending: false });
  return { requests: (data || []) as ProcurementRequest[], error: error?.message };
}

export async function getFarmerProcurementRequests() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { requests: [], error: "Vui lòng đăng nhập." };
  const { data, error } = await supabase
    .from("procurement_requests")
    .select("*")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false });
  return { requests: (data || []) as ProcurementRequest[], error: error?.message };
}

export async function acceptProcurementRequest(requestId: string) {
  const { error } = await supabase
    .from("procurement_requests")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("status", "pending");
  return { success: !error, error: error?.message };
}

export async function completeProcurementRequest(
  requestId: string,
  input: CompleteProcurementRequest,
) {
  const { error } = await supabase
    .from("procurement_requests")
    .update({ ...input, status: "completed" })
    .eq("id", requestId)
    .in("status", ["pending", "accepted"]);
  return { success: !error, error: error?.message };
}

export async function submitBusinessReview(
  request: ProcurementRequest,
  values: Pick<BusinessReview, "price_integrity" | "punctuality_care" | "transparency_attitude" | "comment">,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Vui lòng đăng nhập." };
  const { error } = await supabase.from("business_reviews").insert({
    request_id: request.id,
    farmer_id: user.id,
    business_id: request.business_id,
    ...values,
  });
  if (error?.code === "23505") return { success: false, error: "Giao dịch này đã được đánh giá." };
  return { success: !error, error: error?.message };
}

export async function getReviewedRequestIds(requestIds: string[]) {
  if (requestIds.length === 0) return new Set<string>();
  const { data } = await supabase
    .from("business_reviews")
    .select("request_id")
    .in("request_id", requestIds);
  return new Set((data || []).map((item) => item.request_id));
}

export async function getBusinessReputation(businessId: string) {
  const { data, error } = await supabase
    .from("business_reputation_scores")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return { reputation: data as BusinessReputation | null, error: error?.message };
}

export async function getBusinessReviews(businessId: string) {
  const { data, error } = await supabase
    .from("business_reviews")
    .select("*, profiles!business_reviews_farmer_id_fkey(username)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(20);
  const reviews = (data || []).map((item) => ({
    ...item,
    farmer_username: item.profiles?.username || "Nông dân",
  })) as BusinessReview[];
  return { reviews, error: error?.message };
}

export async function getBusinessRanking(limit = 3) {
  const { data, error } = await supabase
    .from("business_reputation_scores")
    .select("*")
    .order("total_score", { ascending: false })
    .order("successful_lots", { ascending: false })
    .limit(limit);
  return { businesses: (data || []) as BusinessReputation[], error: error?.message };
}

