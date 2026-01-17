// ============================================
// Notifications Type Definitions
// ============================================

export type NotificationType =
  | "POST_LIKE"
  | "POST_COMMENT"
  | "COMMENT_REPLY"
  | "POST_SHARE"
  | "PROJECT_INVESTMENT"
  | "PROJECT_RATING"
  | "PRODUCT_VIEW_MILESTONE"
  | "FOLLOW"
  | "MENTION";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  actor_id?: string;
  actor_username?: string;
  actor_avatar?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationStats {
  unread_count: number;
  total_count: number;
}

export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  actor_id?: string;
}
