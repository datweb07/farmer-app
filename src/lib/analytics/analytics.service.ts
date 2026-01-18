// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Analytics Service - Rewritten
// ============================================
// Direct database queries for better reliability
// Handles both JSON and direct table queries
// ============================================

import { supabase } from "../supabase/supabase";
import type {
  UserEngagementMetrics,
  TopContributor,
  UserGrowthMetrics,
  ProjectAnalyticsData,
  InvestmentTrend,
  ProjectCategoryPerformance,
  PlatformStatistics,
  ContentStatistics,
} from "./types";

/**
 * Helper to safely parse JSON response
 */
function safeParseJSON<T>(data: any): T | null {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      console.warn("Failed to parse JSON:", data);
      return null;
    }
  }
  return data;
}

/**
 * Get user engagement metrics - Direct query fallback
 */
export async function getUserEngagementMetrics(daysBack: number = 30): Promise<{
  data: UserEngagementMetrics[] | null;
  error?: string;
}> {
  try {
    // Generate date series
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const dates: UserEngagementMetrics[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dates.push({
        date: dateStr,
        active_users: 0,
        posts: 0,
        comments: 0,
        likes: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get posts by date
    const { data: posts } = await supabase
      .from("posts")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Get comments by date
    const { data: comments } = await supabase
      .from("post_comments")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Get likes by date
    const { data: likes } = await supabase
      .from("post_likes")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Aggregate data
    posts?.forEach((p) => {
      const date = p.created_at.split("T")[0];
      const entry = dates.find((d) => d.date === date);
      if (entry) entry.posts++;
    });

    comments?.forEach((c) => {
      const date = c.created_at.split("T")[0];
      const entry = dates.find((d) => d.date === date);
      if (entry) entry.comments++;
    });

    likes?.forEach((l) => {
      const date = l.created_at.split("T")[0];
      const entry = dates.find((d) => d.date === date);
      if (entry) entry.likes++;
    });

    // Calculate active users (simplified)
    dates.forEach((entry) => {
      entry.active_users = entry.posts + entry.comments;
    });

    return { data: dates };
  } catch (err) {
    console.error("🔴 [Analytics] Get engagement metrics error:", err);
    return { data: null, error: "Không thể tải dữ liệu engagement" };
  }
}

/**
 * Get top contributors - Direct query
 */
export async function getTopContributors(
  limit: number = 10,
  periodDays: number = 30,
): Promise<{
  data: TopContributor[] | null;
  error?: string;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    const cutoffISO = cutoffDate.toISOString();

    // Get all profiles with their activity
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .limit(100);

    if (profilesError) throw profilesError;
    if (!profiles) return { data: [] };

    // Get posts count per user
    const { data: posts } = await supabase
      .from("posts")
      .select("user_id")
      .gte("created_at", cutoffISO);

    // Get comments count per user
    const { data: comments } = await supabase
      .from("post_comments")
      .select("user_id")
      .gte("created_at", cutoffISO);

    // Get likes received per user (via their posts)
    const { data: userPosts } = await supabase
      .from("posts")
      .select("id, user_id");

    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .gte("created_at", cutoffISO);

    // Count activities per user
    const contributors: TopContributor[] = profiles.map((profile) => {
      const postCount =
        posts?.filter((p) => p.user_id === profile.id).length || 0;
      const commentCount =
        comments?.filter((c) => c.user_id === profile.id).length || 0;

      const userPostIds =
        userPosts?.filter((p) => p.user_id === profile.id).map((p) => p.id) ||
        [];
      const likeCount =
        likes?.filter((l) => userPostIds.includes(l.post_id)).length || 0;

      // Correct points calculation matching database function:
      // - Posts: +10 per post
      // - Likes: +5 per 10 likes
      // - Comments: NOT counted for points
      const points = postCount * 10 + Math.floor(likeCount / 10) * 5;

      return {
        user_id: profile.id,
        username: profile.username || "Unknown",
        avatar_url: profile.avatar_url,
        total_posts: postCount,
        total_comments: commentCount,
        total_likes_received: likeCount,
        points,
      };
    });

    // Filter and sort
    const activeContributors = contributors
      .filter((c) => c.total_posts > 0 || c.total_comments > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    return { data: activeContributors };
  } catch (err) {
    console.error("🔴 [Analytics] Get top contributors error:", err);
    return { data: null, error: "Không thể tải dữ liệu contributors" };
  }
}

/**
 * Get user growth metrics - Direct query
 */
export async function getUserGrowthMetrics(daysBack: number = 90): Promise<{
  data: UserGrowthMetrics[] | null;
  error?: string;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const dates: UserGrowthMetrics[] = [];
    const currentDate = new Date(startDate);

    // Generate date series
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dates.push({
        date: dateStr,
        total_users: 0,
        new_users: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get all users
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("created_at")
      .order("created_at", { ascending: true });

    if (!allUsers) return { data: dates };

    // Calculate cumulative and new users per day
    dates.forEach((entry, index) => {
      const entryDate = new Date(entry.date);

      // Count total users up to this date
      entry.total_users = allUsers.filter((u) => {
        const userDate = new Date(u.created_at);
        return userDate <= entryDate;
      }).length;

      // Count new users on this specific day
      entry.new_users = allUsers.filter((u) => {
        const userDate = new Date(u.created_at).toISOString().split("T")[0];
        return userDate === entry.date;
      }).length;
    });

    return { data: dates };
  } catch (err) {
    console.error("🔴 [Analytics] Get user growth error:", err);
    return { data: null, error: "Không thể tải dữ liệu tăng trưởng" };
  }
}

/**
 * Get project analytics - Direct query
 */
export async function getProjectAnalytics(projectId?: string): Promise<{
  data: ProjectAnalyticsData[] | null;
  error?: string;
}> {
  try {
    let query = supabase
      .from("investment_projects")
      .select(
        `
        id,
        title,
        area,
        funding_goal,
        current_funding,
        farmers_impacted,
        status,
        created_at,
        user_id
      `,
      )
      .eq("status", "active");

    if (projectId) {
      query = query.eq("id", projectId);
    }

    const { data: projects, error } = await query;

    if (error) throw error;
    if (!projects) return { data: [] };

    // Get investment counts for each project
    const { data: investments } = await supabase
      .from("project_investments")
      .select("project_id, amount");

    // Get user data for all project creators
    const userIds = Array.from(
      new Set(projects.map((p) => p.user_id).filter(Boolean)),
    );

    let users: any[] = [];
    if (userIds.length > 0) {
      const { data: userData } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      users = userData || [];
    }

    const userMap = new Map(users.map((u) => [u.id, u]));

    const result: ProjectAnalyticsData[] = projects.map((project) => {
      const projectInvestments =
        investments?.filter((i) => i.project_id === project.id) || [];
      const totalRaised = projectInvestments.reduce(
        (sum, i) => sum + (i.amount || 0),
        0,
      );
      const investorCount = projectInvestments.length;
      const avgInvestment = investorCount > 0 ? totalRaised / investorCount : 0;
      const fundingPercentage =
        project.funding_goal > 0
          ? (totalRaised / project.funding_goal) * 100
          : 0;

      const daysActive = Math.floor(
        (Date.now() - new Date(project.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const creator = userMap.get(project.user_id);
      const creatorName = creator?.full_name || creator?.username || "Unknown";

      return {
        project_id: project.id,
        title: project.title,
        creator_username: creatorName,
        funding_goal: project.funding_goal,
        current_funding: totalRaised,
        funding_percentage: fundingPercentage,
        total_investors: investorCount,
        avg_investment: avgInvestment,
        created_at: project.created_at,
        days_active: daysActive,
        roi_estimate: project.farmers_impacted || 0,
        status: project.status,
        location: project.area || "Unknown",
      };
    });

    return { data: result };
  } catch (err) {
    console.error("🔴 [Analytics] Get project analytics error:", err);
    return { data: null, error: "Không thể tải dữ liệu dự án" };
  }
}

/**
 * Get investment trends - Direct query
 */
export async function getInvestmentTrends(daysBack: number = 30): Promise<{
  data: InvestmentTrend[] | null;
  error?: string;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const dates: InvestmentTrend[] = [];
    const currentDate = new Date(startDate);

    // Generate date series
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dates.push({
        date: dateStr,
        investment_count: 0,
        total_amount: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get investments
    const { data: investments } = await supabase
      .from("project_investments")
      .select("created_at, amount")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Aggregate by date
    investments?.forEach((inv) => {
      const date = inv.created_at.split("T")[0];
      const entry = dates.find((d) => d.date === date);
      if (entry) {
        entry.investment_count++;
        entry.total_amount += inv.amount || 0;
      }
    });

    return { data: dates };
  } catch (err) {
    console.error("🔴 [Analytics] Get investment trends error:", err);
    return { data: null, error: "Không thể tải dữ liệu đầu tư" };
  }
}

/**
 * Get project categories performance - Direct query
 */
export async function getProjectCategoriesPerformance(): Promise<{
  data: ProjectCategoryPerformance[] | null;
  error?: string;
}> {
  try {
    const { data: projects } = await supabase
      .from("investment_projects")
      .select("id, area, funding_goal, current_funding, farmers_impacted")
      .eq("status", "active");

    if (!projects) return { data: [] };

    // Get investments
    const { data: investments } = await supabase
      .from("project_investments")
      .select("project_id, amount");

    // Group by category
    const categoryMap = new Map<
      string,
      {
        projects: any[];
        totalFunding: number;
        successfulCount: number;
        totalROI: number;
      }
    >();

    projects.forEach((project) => {
      const category = project.area || "Unknown";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          projects: [],
          totalFunding: 0,
          successfulCount: 0,
          totalROI: 0,
        });
      }

      const cat = categoryMap.get(category)!;
      cat.projects.push(project);

      const projectInvestments =
        investments?.filter((i) => i.project_id === project.id) || [];
      const totalRaised = projectInvestments.reduce(
        (sum, i) => sum + (i.amount || 0),
        0,
      );
      cat.totalFunding += totalRaised;

      if (totalRaised >= project.funding_goal) {
        cat.successfulCount++;
      }

      cat.totalROI += project.farmers_impacted || 0;
    });

    const result: ProjectCategoryPerformance[] = Array.from(
      categoryMap.entries(),
    ).map(([category, data]) => ({
      category,
      total_projects: data.projects.length,
      total_funding: data.totalFunding,
      avg_funding: data.totalFunding / data.projects.length,
      success_rate: (data.successfulCount / data.projects.length) * 100,
      avg_roi: data.totalROI / data.projects.length,
    }));

    return { data: result.sort((a, b) => b.total_funding - a.total_funding) };
  } catch (err) {
    console.error("🔴 [Analytics] Get categories performance error:", err);
    return { data: null, error: "Không thể tải dữ liệu danh mục" };
  }
}

/**
 * Get platform statistics - Direct query
 */
export async function getPlatformStatistics(): Promise<{
  data: PlatformStatistics | null;
  error?: string;
}> {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const week = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const month = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const prevMonth = new Date(
      now.getTime() - 60 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Get all counts in parallel
    const [
      { count: totalUsers },
      { data: postsToday },
      { data: postsWeek },
      { data: postsMonth },
      { count: totalPosts },
      { count: totalProducts },
      { count: totalProjects },
      { count: totalComments },
      { count: totalLikes },
      { count: totalInvestments },
      { data: usersLastMonth },
      { data: postsLastMonth },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("user_id").gte("created_at", today),
      supabase.from("posts").select("user_id").gte("created_at", week),
      supabase.from("posts").select("user_id").gte("created_at", month),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "approved"),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "approved"),
      supabase
        .from("investment_projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true }),
      supabase.from("post_likes").select("*", { count: "exact", head: true }),
      supabase
        .from("project_investments")
        .select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("id").lt("created_at", month),
      supabase
        .from("posts")
        .select("id")
        .lt("created_at", month)
        .gte("created_at", prevMonth),
    ]);

    // Calculate active users
    const activeUsersToday = new Set(postsToday?.map((p) => p.user_id)).size;
    const activeUsersWeek = new Set(postsWeek?.map((p) => p.user_id)).size;
    const activeUsersMonth = new Set(postsMonth?.map((p) => p.user_id)).size;

    // Calculate growth rates
    const usersLastMonthCount = usersLastMonth?.length || 1;
    const userGrowthRate =
      (((totalUsers || 0) - usersLastMonthCount) / usersLastMonthCount) * 100;

    const postsLastMonthCount = postsLastMonth?.length || 1;
    const contentGrowthRate =
      (((totalPosts || 0) - postsLastMonthCount) / postsLastMonthCount) * 100;

    // Calculate engagement rate
    const avgEngagementRate = totalPosts
      ? (((totalComments || 0) + (totalLikes || 0)) / totalPosts) * 100
      : 0;

    const stats: PlatformStatistics = {
      total_users: totalUsers || 0,
      active_users_today: activeUsersToday,
      active_users_week: activeUsersWeek,
      active_users_month: activeUsersMonth,
      total_posts: totalPosts || 0,
      total_products: totalProducts || 0,
      total_projects: totalProjects || 0,
      total_comments: totalComments || 0,
      total_likes: totalLikes || 0,
      total_investments: totalInvestments || 0,
      avg_engagement_rate: avgEngagementRate,
      user_growth_rate_month: userGrowthRate,
      content_growth_rate_month: contentGrowthRate,
    };

    return { data: stats };
  } catch (err) {
    console.error("🔴 [Analytics] Get platform statistics error:", err);
    return { data: null, error: "Không thể tải thống kê nền tảng" };
  }
}

/**
 * Get content statistics - Direct query
 */
export async function getContentStatistics(): Promise<{
  data: ContentStatistics | null;
  error?: string;
}> {
  try {
    // Get posts by category
    const { data: posts } = await supabase
      .from("posts")
      .select("category, views_count")
      .eq("moderation_status", "approved");

    // Get products by category
    const { data: products } = await supabase
      .from("products")
      .select("category, price")
      .eq("moderation_status", "approved");

    // Group posts by category
    const postsByCategory = new Map<
      string,
      { total: number; avg_views: number; views: number[] }
    >();
    posts?.forEach((post) => {
      const cat = post.category || "Unknown";
      if (!postsByCategory.has(cat)) {
        postsByCategory.set(cat, { total: 0, avg_views: 0, views: [] });
      }
      const data = postsByCategory.get(cat)!;
      data.total++;
      data.views.push(post.views_count || 0);
    });

    // Calculate averages
    const postsStats = Array.from(postsByCategory.entries()).map(
      ([category, data]) => ({
        category,
        total: data.total,
        avg_views: data.views.reduce((a, b) => a + b, 0) / data.views.length,
      }),
    );

    // Group products by category
    const productsByCategory = new Map<
      string,
      { total: number; avg_price: number; prices: number[] }
    >();
    products?.forEach((product) => {
      const cat = product.category || "Unknown";
      if (!productsByCategory.has(cat)) {
        productsByCategory.set(cat, { total: 0, avg_price: 0, prices: [] });
      }
      const data = productsByCategory.get(cat)!;
      data.total++;
      data.prices.push(product.price || 0);
    });

    // Calculate averages
    const productsStats = Array.from(productsByCategory.entries()).map(
      ([category, data]) => ({
        category,
        total: data.total,
        avg_price: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
      }),
    );

    return {
      data: {
        posts: postsStats,
        products: productsStats,
      },
    };
  } catch (err) {
    console.error("🔴 [Analytics] Get content statistics error:", err);
    return { data: null, error: "Không thể tải thống kê nội dung" };
  }
}

/**
 * Export analytics data to CSV
 */
export function exportToCSV(data: any[], filename: string): void {
  try {
    if (!data || data.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    // Get headers
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      // UTF-8 BOM
      "\uFEFF",
      // Headers
      headers.join(","),
      // Rows
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(
              value === null || value === undefined ? "" : value,
            );
            return stringValue.includes(",")
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue;
          })
          .join(","),
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("🔴 [Analytics] Export CSV error:", err);
    alert("Không thể xuất file CSV");
  }
}

/**
 * Export analytics data to Excel (HTML table format)
 */
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = "Sheet1",
): void {
  try {
    if (!data || data.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    const headers = Object.keys(data[0]);

    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>${headers.map((h) => `<td>${row[h] !== null && row[h] !== undefined ? row[h] : ""}</td>`).join("")}</tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${new Date().toISOString().split("T")[0]}.xls`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("🔴 [Analytics] Export Excel error:", err);
    alert("Không thể xuất file Excel");
  }
}

/**
 * Print report
 */
export function printReport(): void {
  window.print();
}
