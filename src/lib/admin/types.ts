// ============================================
// Admin System Types
// ============================================

export interface AdminStats {
  total_users: number;
  active_users: number;
  banned_users: number;
  total_posts: number;
  pending_posts: number;
  total_products: number;
  pending_products: number;
  total_projects: number;
  pending_projects: number;
  total_reports: number;
  pending_reports: number;
  total_investments: number;
  total_comments: number;
}

export interface AdminUser {
  id: string;
  username: string;
  phone_number: string;
  role: "farmer" | "business";
  is_admin: boolean;
  is_banned: boolean;
  banned_reason: string | null;
  points: number;
  total_posts: number;
  total_products: number;
  created_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  reporter_name: string;
  content_type: "post" | "product" | "project" | "comment" | "user";
  content_id: string;
  reason: "spam" | "inappropriate" | "harassment" | "misleading" | "other";
  description: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  resolved_by: string | null;
  resolver_name: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type:
    | "ban_user"
    | "unban_user"
    | "delete_post"
    | "delete_product"
    | "delete_project"
    | "approve_project"
    | "reject_project"
    | "delete_comment"
    | "change_role"
    | "resolve_report";
  target_type: string;
  target_id: string;
  reason: string | null;
  metadata: any;
  created_at: string;
}

export interface ModerationContent {
  id: string;
  title?: string;
  name?: string;
  content?: string;
  description?: string;
  user_id: string;
  author_name?: string;
  seller_name?: string;
  creator_name?: string;
  moderation_status: "pending" | "approved" | "rejected";
  moderation_note: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  image_url?: string;
  category?: string;
  likes_count?: number;
  comments_count?: number;
  price?: number;
  funding_goal?: number;
  current_funding?: number;
}

export interface BanUserRequest {
  user_id: string;
  ban_status: boolean;
  reason?: string;
}

export interface ModerateContentRequest {
  content_type: "post" | "product" | "project";
  content_id: string;
  new_status: "approved" | "rejected";
  note?: string;
}

export interface DeleteContentRequest {
  content_type: "post" | "product" | "project" | "comment";
  content_id: string;
  reason: string;
}

export interface ChangeRoleRequest {
  user_id: string;
  new_role: "farmer" | "business";
  make_admin?: boolean;
}

export interface CreateReportRequest {
  content_type: "post" | "product" | "project" | "comment" | "user";
  content_id: string;
  reason: "spam" | "inappropriate" | "harassment" | "misleading" | "other";
  description?: string;
}

export interface ResolveReportRequest {
  report_id: string;
  resolution_note?: string;
  new_status: "resolved" | "dismissed";
}
