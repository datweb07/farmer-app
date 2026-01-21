// @ts-nocheck
// ============================================
// Settings Service
// ============================================

import { supabase } from "../supabase/supabase";
import type {
  UserSettings,
  UpdateSettingsPayload,
  ExportedUserData,
} from "./types";

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<{
  settings: UserSettings | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { settings: null, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase.rpc("get_user_settings", {
      user_uuid: user.id,
    });

    if (error) {
      console.error("🔴 [Settings] Get settings error:", error);
      return { settings: null, error: "Không thể tải cài đặt" };
    }

    return { settings: data };
  } catch (err) {
    console.error("🔴 [Settings] Unexpected error:", err);
    return { settings: null, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  updates: UpdateSettingsPayload,
): Promise<{ success: boolean; settings?: UserSettings; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase.rpc("update_user_settings", {
      user_uuid: user.id,
      settings_data: updates,
    });

    if (error) {
      console.error("🔴 [Settings] Update settings error:", error);
      return { success: false, error: "Không thể cập nhật cài đặt" };
    }

    return { success: true, settings: data };
  } catch (err) {
    console.error("🔴 [Settings] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Export user data (GDPR)
 */
export async function exportUserData(): Promise<{
  data: ExportedUserData | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase.rpc("export_user_data", {
      user_uuid: user.id,
    });

    if (error) {
      console.error("🔴 [Settings] Export data error:", error);
      return { data: null, error: "Không thể xuất dữ liệu" };
    }

    return { data };
  } catch (err) {
    console.error("🔴 [Settings] Unexpected error:", err);
    return { data: null, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Delete user account
 */
export async function deleteUserAccount(): Promise<{
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

    // Delete user from auth (will cascade to profiles and related data)
    const { error } = await supabase.rpc("delete_user_account", {
      user_uuid: user.id,
    });

    if (error) {
      console.error("🔴 [Settings] Delete account error:", error);
      return { success: false, error: "Không thể xóa tài khoản" };
    }

    // Sign out after deletion
    await supabase.auth.signOut();

    return { success: true };
  } catch (err) {
    console.error("🔴 [Settings] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Download exported data as JSON file
 */
export function downloadUserData(
  data: ExportedUserData,
  filename: string = "my-data.json",
) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
