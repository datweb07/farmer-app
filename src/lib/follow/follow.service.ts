// @ts-nocheck
// ============================================
// Follow Service
// ============================================
// User and project follow functionality

import { supabase } from "../supabase/supabase";
import type {
  UserFollow,
  ProjectFollow,
  FollowStats,
  ProjectFollowStats,
} from "./types";

/**
 * Follow a user
 */
export async function followUser(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    if (user.id === userId) {
      return { success: false, error: "Không thể follow chính mình" };
    }

    const { error } = await supabase.from("user_follows").insert({
      follower_id: user.id,
      following_id: userId,
    });

    if (error) {
      console.error("🔴 [Follow] Follow user error:", error);
      return { success: false, error: "Không thể follow người dùng này" };
    }

    return { success: true };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", userId);

    if (error) {
      console.error("🔴 [Follow] Unfollow user error:", error);
      return { success: false, error: "Không thể unfollow người dùng này" };
    }

    return { success: true };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Follow a project
 */
export async function followProject(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const { error } = await supabase.from("project_follows").insert({
      user_id: user.id,
      project_id: projectId,
    });

    if (error) {
      console.error("🔴 [Follow] Follow project error:", error);
      return { success: false, error: "Không thể follow dự án này" };
    }

    return { success: true };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Unfollow a project
 */
export async function unfollowProject(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const { error } = await supabase
      .from("project_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("project_id", projectId);

    if (error) {
      console.error("🔴 [Follow] Unfollow project error:", error);
      return { success: false, error: "Không thể unfollow dự án này" };
    }

    return { success: true };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get user follow stats
 */
export async function getUserFollowStats(
  userId: string,
): Promise<FollowStats | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc("get_user_follow_stats", {
      user_uuid: userId,
      current_user_id: user?.id || null,
    });

    if (error) {
      console.error("🔴 [Follow] Get stats error:", error);
      return null;
    }

    return (
      data?.[0] || {
        followers_count: 0,
        following_count: 0,
        is_following: false,
        is_followed_by: false,
      }
    );
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return null;
  }
}

/**
 * Get project follow stats
 */
export async function getProjectFollowStats(
  projectId: string,
): Promise<ProjectFollowStats | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc("get_project_follow_stats", {
      proj_uuid: projectId,
      current_user_id: user?.id || null,
    });

    if (error) {
      console.error("🔴 [Follow] Get project stats error:", error);
      return null;
    }

    return (
      data?.[0] || {
        followers_count: 0,
        is_following: false,
      }
    );
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return null;
  }
}

/**
 * Get user's followers
 */
export async function getUserFollowers(
  userId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ followers: UserFollow[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("get_user_followers", {
      user_uuid: userId,
      limit_count: limit,
      offset_count: offset,
    });

    if (error) {
      console.error("🔴 [Follow] Get followers error:", error);
      return { followers: [], error: "Không thể tải danh sách followers" };
    }

    return { followers: data || [] };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { followers: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get user's following
 */
export async function getUserFollowing(
  userId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ following: UserFollow[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("get_user_following", {
      user_uuid: userId,
      limit_count: limit,
      offset_count: offset,
    });

    if (error) {
      console.error("🔴 [Follow] Get following error:", error);
      return { following: [], error: "Không thể tải danh sách following" };
    }

    return { following: data || [] };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { following: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get following feed (posts from followed users)
 */
export async function getFollowingFeed(
  limit: number = 20,
  offset: number = 0,
): Promise<{ posts: any[]; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { posts: [], error: "Chưa đăng nhập" };
    }

    const { data, error } = await supabase.rpc("get_following_feed", {
      user_uuid: user.id,
      limit_count: limit,
      offset_count: offset,
    });

    if (error) {
      console.error("🔴 [Follow] Get feed error:", error);
      return { posts: [], error: "Không thể tải feed" };
    }

    return { posts: data || [] };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { posts: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get project followers
 */
export async function getProjectFollowers(
  projectId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ followers: ProjectFollow[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("project_follows")
      .select(
        `
        id,
        user_id,
        project_id,
        created_at,
        user:profiles!project_follows_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("🔴 [Follow] Get project followers error:", error);
      return { followers: [], error: "Không thể tải danh sách followers" };
    }

    return { followers: (data as any) || [] };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { followers: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get user's followed projects
 */
export async function getUserFollowedProjects(
  userId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ projects: ProjectFollow[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("project_follows")
      .select(
        `
        id,
        user_id,
        project_id,
        created_at,
        project:investment_projects!project_follows_project_id_fkey(
          id,
          title,
          image_url,
          status,
          funding_goal,
          current_funding
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("🔴 [Follow] Get followed projects error:", error);
      return { projects: [], error: "Không thể tải danh sách dự án" };
    }

    return { projects: (data as any) || [] };
  } catch (err) {
    console.error("🔴 [Follow] Unexpected error:", err);
    return { projects: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}
