// ============================================
// Approval Notifications Helper
// ============================================
// Helper function to send notifications when Admin approves content
// ============================================

import { supabase } from "../supabase/supabase";
import type { NotificationType } from "./types";

interface ApprovalNotificationParams {
  userId: string;
  contentType: "post" | "product" | "project";
  contentId: string;
  contentTitle: string;
}

/**
 * Send notification when Admin approves user's content
 */
export async function sendApprovalNotification({
  userId,
  contentType,
  contentId: _contentId,
  contentTitle,
}: ApprovalNotificationParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Determine notification type and message
    let type: NotificationType;
    let title: string;
    let message: string;
    let link: string;

    switch (contentType) {
      case "post":
        type = "POST_APPROVED";
        title = "Bài viết đã được phê duyệt";
        message = `Bài viết "${contentTitle}" của bạn đã được Admin phê duyệt và hiển thị công khai.`;
        link = `/posts`;
        break;
      case "product":
        type = "PRODUCT_APPROVED";
        title = "Sản phẩm đã được phê duyệt";
        message = `Sản phẩm "${contentTitle}" của bạn đã được Admin phê duyệt và hiển thị trên marketplace.`;
        link = `/products`;
        break;
      case "project":
        type = "PROJECT_APPROVED";
        title = "Dự án đầu tư đã được phê duyệt";
        message = `Dự án "${contentTitle}" của bạn đã được Admin phê duyệt và sẵn sàng nhận đầu tư.`;
        link = `/invest`;
        break;
      default:
        return { success: false, error: "Invalid content type" };
    }

    // Insert notification into database
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      is_read: false,
    } as any);

    if (error) {
      console.error("🔴 [Approval Notification] Error:", error);
      return { success: false, error: error.message };
    }

    console.log(
      `✅ [Approval Notification] Sent ${type} notification to user ${userId}`,
    );
    return { success: true };
  } catch (err: any) {
    console.error("🔴 [Approval Notification] Unexpected error:", err);
    return { success: false, error: err.message };
  }
}
