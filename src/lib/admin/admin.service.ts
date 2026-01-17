// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Admin Service
// ============================================
// All admin operations with proper authorization checks
// ============================================

import { supabase } from "../supabase/supabase";
import type {
  AdminStats,
  AdminUser,
  ContentReport,
  AdminAction,
  ModerationContent,
  BanUserRequest,
  ModerateContentRequest,
  DeleteContentRequest,
  ChangeRoleRequest,
  CreateReportRequest,
  ResolveReportRequest,
} from "./types";

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<{
  stats: AdminStats | null;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("get_admin_stats");

    if (error) {
      console.error("🔴 [Admin] Get stats error:", error);
      return { stats: null, error: error.message };
    }

    return { stats: data };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { stats: null, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get users with filters and pagination
 */
export async function getUsers(params?: {
  search?: string;
  role?: "farmer" | "business";
  status?: "active" | "banned";
  limit?: number;
  offset?: number;
}): Promise<{
  users: AdminUser[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("get_users_admin", {
      search_query: params?.search || null,
      role_filter: params?.role || null,
      status_filter: params?.status || null,
      limit_count: params?.limit || 20,
      offset_count: params?.offset || 0,
    });

    if (error) {
      console.error("🔴 [Admin] Get users error:", error);
      return { users: [], error: error.message };
    }

    return { users: data || [] };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { users: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get content for moderation
 */
export async function getContentForModeration(
  contentType: "posts" | "products" | "projects",
  status: "pending" | "approved" | "rejected" = "pending",
  limit: number = 20,
): Promise<{
  content: ModerationContent[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("get_content_for_moderation", {
      content_type_filter: contentType,
      status_filter: status,
      limit_count: limit,
    });

    if (error) {
      console.error("🔴 [Admin] Get content error:", error);
      return { content: [], error: error.message };
    }

    return { content: data || [] };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { content: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Ban or unban a user
 */
export async function banUser(request: BanUserRequest): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_ban_user", {
      target_user_id: request.user_id,
      ban_status: request.ban_status,
      ban_reason: request.reason || null,
    });

    if (error) {
      console.error("🔴 [Admin] Ban user error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Admin] User ban status updated");
    return { success: true };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Moderate content (approve/reject)
 */
export async function moderateContent(
  request: ModerateContentRequest,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_moderate_content", {
      content_type_param: request.content_type,
      content_id_param: request.content_id,
      new_status: request.new_status,
      note: request.note || null,
    });

    if (error) {
      console.error("🔴 [Admin] Moderate content error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Admin] Content moderated");
    return { success: true };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Delete content
 */
export async function deleteContent(request: DeleteContentRequest): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_delete_content", {
      content_type_param: request.content_type,
      content_id_param: request.content_id,
      delete_reason: request.reason,
    });

    if (error) {
      console.error("🔴 [Admin] Delete content error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Admin] Content deleted");
    return { success: true };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Change user role
 */
export async function changeUserRole(request: ChangeRoleRequest): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("admin_change_user_role", {
      target_user_id: request.user_id,
      new_role: request.new_role,
      make_admin: request.make_admin || false,
    });

    if (error) {
      console.error("🔴 [Admin] Change role error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Admin] User role changed");
    return { success: true };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Create a content report
 */
export async function createReport(request: CreateReportRequest): Promise<{
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

    const { error } = await supabase.from("content_reports").insert({
      reporter_id: user.id,
      content_type: request.content_type,
      content_id: request.content_id,
      reason: request.reason,
      description: request.description || null,
    });

    if (error) {
      console.error("🔴 [Admin] Create report error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Admin] Report created");
    return { success: true };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get content reports
 */
export async function getReports(
  status?: "pending" | "reviewing" | "resolved" | "dismissed",
  limit: number = 20,
): Promise<{
  reports: ContentReport[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("get_content_reports_admin", {
      status_filter: status || null,
      limit_count: limit,
    });

    if (error) {
      console.error("🔴 [Admin] Get reports error:", error);
      return { reports: [], error: error.message };
    }

    return { reports: data || [] };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { reports: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Resolve a report
 */
export async function resolveReport(request: ResolveReportRequest): Promise<{
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
      .from("content_reports")
      .update({
        status: request.new_status,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_note: request.resolution_note || null,
      })
      .eq("id", request.report_id);

    if (error) {
      console.error("🔴 [Admin] Resolve report error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Admin] Report resolved");
    return { success: true };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get admin action logs
 */
export async function getAdminLogs(limit: number = 50): Promise<{
  logs: AdminAction[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("🔴 [Admin] Get logs error:", error);
      return { logs: [], error: error.message };
    }

    return { logs: data || [] };
  } catch (err) {
    console.error("🔴 [Admin] Unexpected error:", err);
    return { logs: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (error || !data) return false;

    return data.is_admin === true;
  } catch {
    return false;
  }
}
