// @ts-nocheck
// ============================================
// Dashboard Service
// ============================================
// Handles dashboard data aggregation
// ============================================

import { supabase } from "../supabase/supabase";
import type { UserStats, ActivityItem } from "./types";
import type { PostWithStats } from "../community/types";
import type { ProductWithStats } from "../community/types";
import type { InvestmentProjectWithStats } from "../investments/types";
import { getPosts } from "../community/posts.service";
import { getProducts } from "../community/products.service";
import { getProjects } from "../investments/investments.service";
import {
  getCurrentUserRank,
  getTopContributors,
} from "../community/leaderboard.service";
/**
 * Get user statistics
 */
export async function getUserStats(): Promise<{
  stats: UserStats | null;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { stats: null, error: "Chưa đăng nhập" };
    }

    // Get user's posts count
    const { count: postsCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get user's products count
    const { count: productsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get user's comments count
    const { count: commentsCount } = await supabase
      .from("post_comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get total likes received on user's posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", user.id);

    let likesReceived = 0;
    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p) => p.id);
      const { count: likesCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds);
      likesReceived = likesCount || 0;
    }

    // Get total shares received
    let sharesReceived = 0;
    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p) => p.id);
      const { count: sharesCount } = await supabase
        .from("post_shares")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds);
      sharesReceived = sharesCount || 0;
    }

    // Get user points and rank from leaderboard service
    const { rank, points } = await getCurrentUserRank();
    const { contributors } = await getTopContributors(1000);

    const stats: UserStats = {
      total_posts: postsCount || 0,
      total_products: productsCount || 0,
      total_comments: commentsCount || 0,
      total_likes_received: likesReceived,
      total_shares_received: sharesReceived,
      total_points: points || 0,
      rank_position: rank || 0,
      total_users: contributors.length || 0,
    };

    return { stats };
  } catch (error: any) {
    console.error("Error getting user stats:", error);
    return { stats: null, error: error.message };
  }
}

/**
 * Get user's recent activities
 */
export async function getRecentActivities(limit: number = 10): Promise<{
  activities: ActivityItem[];
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { activities: [], error: "Chưa đăng nhập" };
    }

    const activities: ActivityItem[] = [];

    // Get recent posts
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentPosts) {
      recentPosts.forEach((post) => {
        activities.push({
          id: `post-${post.id}`,
          type: "POST_CREATED",
          title: "Đăng bài viết mới",
          description: post.title,
          timestamp: post.created_at,
          link: `/posts/${post.id}`,
          icon: "📝",
          color: "blue",
        });
      });
    }

    // Get recent products
    const { data: recentProducts } = await supabase
      .from("products")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentProducts) {
      recentProducts.forEach((product) => {
        activities.push({
          id: `product-${product.id}`,
          type: "PRODUCT_CREATED",
          title: "Đăng sản phẩm mới",
          description: product.name,
          timestamp: product.created_at,
          link: `/products/${product.id}`,
          icon: "🛒",
          color: "purple",
        });
      });
    }

    // Get recent comments
    const { data: recentComments } = await supabase
      .from("post_comments")
      .select("id, content, created_at, post_id, posts(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentComments) {
      recentComments.forEach((comment) => {
        activities.push({
          id: `comment-${comment.id}`,
          type: "POST_COMMENTED",
          title: "Bình luận",
          description: `"${comment.content.substring(0, 50)}..."`,
          timestamp: comment.created_at,
          link: `/posts/${comment.post_id}`,
          icon: "💬",
          color: "green",
        });
      });
    }

    // Get recent likes given
    const { data: recentLikes } = await supabase
      .from("post_likes")
      .select("id, created_at, post_id, posts(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2);

    if (recentLikes) {
      recentLikes.forEach((like) => {
        activities.push({
          id: `like-${like.id}`,
          type: "POST_LIKED",
          title: "Thích bài viết",
          description: like.posts?.title || "Bài viết",
          timestamp: like.created_at,
          link: `/posts/${like.post_id}`,
          icon: "❤️",
          color: "red",
        });
      });
    }

    // Sort all activities by timestamp
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return { activities: activities.slice(0, limit) };
  } catch (error: any) {
    console.error("Error getting recent activities:", error);
    return { activities: [], error: error.message };
  }
}

/**
 * Get trending posts (most liked/viewed in last 7 days)
 */
export async function getTrendingPosts(limit: number = 5): Promise<{
  posts: PostWithStats[];
  error?: string;
}> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Use the existing getPosts service function
    const result = await getPosts({ limit: 20 });

    if (result.error) {
      console.error("Error getting trending posts:", result.error);
      return { posts: [], error: result.error };
    }

    // Filter and sort by engagement (likes + comments + views)
    const trendingPosts = result.posts
      .filter((post: PostWithStats) => new Date(post.created_at) > sevenDaysAgo)
      .sort((a: PostWithStats, b: PostWithStats) => {
        const scoreA =
          a.likes_count * 3 + a.comments_count * 2 + a.views_count * 0.1;
        const scoreB =
          b.likes_count * 3 + b.comments_count * 2 + b.views_count * 0.1;
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return { posts: trendingPosts };
  } catch (error: any) {
    console.error("Error getting trending posts:", error);
    return { posts: [], error: error.message };
  }
}

/**
 * Get recent products
 */
export async function getRecentProducts(limit: number = 4): Promise<{
  products: ProductWithStats[];
  error?: string;
}> {
  try {
    // Use the existing getProducts service function
    const result = await getProducts({ limit });

    if (result.error) {
      console.error("Error getting recent products:", result.error);
      return { products: [], error: result.error };
    }

    return { products: result.products };
  } catch (error: any) {
    console.error("Error getting recent products:", error);
    return { products: [], error: error.message };
  }
}

/**
 * Get active investment projects
 */
export async function getActiveProjects(limit: number = 3): Promise<{
  projects: InvestmentProjectWithStats[];
  error?: string;
}> {
  try {
    // Use the existing getProjects service function
    const result = await getProjects({ limit: 20 });

    if (result.error) {
      console.error("Error getting active projects:", result.error);
      return { projects: [], error: result.error };
    }

    // Filter for active projects that need funding
    const activeProjects = result.projects
      .filter(
        (p: InvestmentProjectWithStats) =>
          p.status === "active" && p.progress_percentage < 100
      )
      .slice(0, limit);

    return { projects: activeProjects };
  } catch (error: any) {
    console.error("Error getting active projects:", error);
    return { projects: [], error: error.message };
  }
}
