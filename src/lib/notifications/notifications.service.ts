// @ts-nocheck
// ============================================
// Notifications Service
// ============================================
// Handles all notification-related operations
// ============================================

import { supabase } from "../supabase/supabase";
import type { Notification, NotificationStats } from "./types";
import { getUserSettings } from "../settings/settings.service";

async function filterEnabledNotifications(notifications: Notification[]) {
  const { settings } = await getUserSettings();
  if (!settings) return notifications;
  if (!settings.push_notifications) return [];

  return notifications.filter((notification) => {
    switch (notification.type) {
      case "FOLLOW":
        return settings.push_new_follower;
      case "POST_LIKE":
        return settings.push_post_like;
      case "POST_COMMENT":
      case "COMMENT_REPLY":
        return settings.push_post_comment;
      case "PROJECT_INVESTMENT":
      case "PROJECT_RATING":
      case "PROJECT_APPROVED":
        return settings.push_project_update;
      case "PROCUREMENT_REQUEST":
      case "PROCUREMENT_COMPLETED":
      case "BUSINESS_REVIEW_RECEIVED":
        return settings.push_procurement;
      default:
        return true;
    }
  });
}

/**
 * Get notifications for current user
 */
export async function getNotifications(params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<{
  notifications: Notification[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { notifications: [], error: "Chưa đăng nhập" };
    }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (params?.unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return { notifications: [], error: error.message };
    }

    return { notifications: await filterEnabledNotifications(data || []) };
  } catch (error: any) {
    console.error("Error in getNotifications:", error);
    return { notifications: [], error: error.message };
  }
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { count: 0, error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error getting unread count:", error);
      return { count: 0, error: error.message };
    }

    const enabled = await filterEnabledNotifications(data || []);
    return { count: enabled.length };
  } catch (error: any) {
    console.error("Error in getUnreadCount:", error);
    return { count: 0, error: error.message };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in markAsRead:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<{
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

    const { error } = await supabase.rpc("mark_all_notifications_read", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error marking all as read:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in markAllAsRead:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteNotification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all read notifications
 */
export async function deleteAllRead(): Promise<{
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
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("is_read", true);

    if (error) {
      console.error("Error deleting read notifications:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteAllRead:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
      filterEnabledNotifications([payload.new as Notification]).then((enabled) => {
        if (enabled[0]) callback(enabled[0]);
      });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
