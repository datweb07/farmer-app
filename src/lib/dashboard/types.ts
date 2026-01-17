// ============================================
// Dashboard Type Definitions
// ============================================

export interface UserStats {
  total_posts: number;
  total_products: number;
  total_comments: number;
  total_likes_received: number;
  total_shares_received: number;
  total_points: number;
  rank_position: number;
  total_users: number;
}

export interface ActivityItem {
  id: string;
  type:
    | "POST_CREATED"
    | "POST_LIKED"
    | "POST_COMMENTED"
    | "POST_SHARED"
    | "PRODUCT_CREATED"
    | "PROJECT_CREATED"
    | "PROJECT_INVESTED"
    | "PROJECT_RATED";
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  icon: string;
  color: string;
}

export interface DashboardStats {
  user_stats: UserStats;
  recent_activities: ActivityItem[];
}
