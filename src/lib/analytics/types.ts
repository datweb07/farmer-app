// ============================================
// Analytics Types
// ============================================
// TypeScript types for analytics system
// ============================================

// User Analytics Types
export interface UserEngagementMetrics {
  date: string;
  active_users: number;
  posts: number;
  comments: number;
  likes: number;
}

export interface TopContributor {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_posts: number;
  total_comments: number;
  total_likes_received: number;
  points: number;
}

export interface UserGrowthMetrics {
  date: string;
  total_users: number;
  new_users: number;
}

// Project Analytics Types
export interface ProjectAnalyticsData {
  project_id: string;
  title: string;
  creator_username: string;
  funding_goal: number;
  current_funding: number;
  funding_percentage: number;
  total_investors: number;
  avg_investment: number;
  created_at: string;
  days_active: number;
  roi_estimate: number;
  status: string;
  location: string;
}

export interface InvestmentTrend {
  date: string;
  investments: number;
  amount: number;
}

export interface ProjectCategoryPerformance {
  category: string;
  total_projects: number;
  total_funding: number;
  avg_funding_percentage: number;
  successful_projects: number;
}

// Platform Statistics Types
export interface PlatformStatistics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  total_posts: number;
  total_products: number;
  total_projects: number;
  total_comments: number;
  total_likes: number;
  total_investments: number;
  total_investment_amount: number;
  avg_engagement_rate: number;
  user_growth_rate_month: number;
  content_growth_rate_month: number;
}

export interface ContentStatistics {
  posts: Array<{
    category: string;
    total: number;
    avg_views: number;
  }>;
  products: Array<{
    category: string;
    total: number;
    avg_price: number;
  }>;
}

// Export Types
export type ExportFormat = "pdf" | "excel" | "csv";

export interface ExportOptions {
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeCharts?: boolean;
}

// Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  [key: string]: string | number;
}
