// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Project Rating Service
// ============================================
// Handles project rating operations and leaderboard
// ============================================

import { supabase } from '../supabase/supabase';
import type {
    ProjectRating,
    ProjectRatingStats,
    CreateRatingData,
    LeaderboardProject,
} from './types';

/**
 * Check if user can rate a project (must have invested)
 */
export async function canUserRateProject(
    projectId: string
): Promise<{ canRate: boolean; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { canRate: false, error: 'Bạn cần đăng nhập để đánh giá' };
        }

        // Check if user has invested in this project
        const { data, error } = await supabase
            .from('project_investments')
            .select('id')
            .eq('project_id', projectId)
            .eq('investor_id', user.id)
            .eq('status', 'confirmed')
            .limit(1);

        if (error) {
            console.error('Error checking investment:', error);
            return { canRate: false, error: 'Không thể kiểm tra quyền đánh giá' };
        }

        if (!data || data.length === 0) {
            return { canRate: false, error: 'Chỉ nhà đầu tư mới có thể đánh giá dự án' };
        }

        return { canRate: true, error: null };
    } catch (err) {
        console.error('Error in canUserRateProject:', err);
        return { canRate: false, error: 'Đã xảy ra lỗi' };
    }
}

/**
 * Get user's rating for a specific project
 */
export async function getUserRatingForProject(
    projectId: string
): Promise<{ rating: ProjectRating | null; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { rating: null, error: null };
        }

        const { data, error } = await supabase
            .from('project_ratings')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error fetching user rating:', error);
            return { rating: null, error: 'Không thể tải đánh giá' };
        }

        return { rating: data, error: null };
    } catch (err) {
        console.error('Error in getUserRatingForProject:', err);
        return { rating: null, error: 'Đã xảy ra lỗi' };
    }
}

/**
 * Rate a project (create or update)
 */
export async function rateProject(
    data: CreateRatingData
): Promise<{ success: boolean; rating?: ProjectRating; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Bạn cần đăng nhập để đánh giá' };
        }

        // Validate rating
        if (data.rating < 1 || data.rating > 5) {
            return { success: false, error: 'Đánh giá phải từ 1 đến 5 sao' };
        }

        // Check if user can rate
        const canRate = await canUserRateProject(data.project_id);
        if (!canRate.canRate) {
            return { success: false, error: canRate.error };
        }

        // Check if user has already rated
        const existingRating = await getUserRatingForProject(data.project_id);

        if (existingRating.rating) {
            // Update existing rating
            const { data: updated, error } = await supabase
                .from('project_ratings')
                .update({
                    rating: data.rating,
                    review: data.review,
                })
                .eq('id', existingRating.rating.id)
                .select()
                .single();

            if (error) {
                console.error('Error updating rating:', error);
                return { success: false, error: 'Không thể cập nhật đánh giá' };
            }

            return { success: true, rating: updated, error: null };
        } else {
            // Create new rating
            const { data: created, error } = await supabase
                .from('project_ratings')
                .insert({
                    project_id: data.project_id,
                    user_id: user.id,
                    rating: data.rating,
                    review: data.review,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating rating:', error);
                return { success: false, error: 'Không thể tạo đánh giá' };
            }

            return { success: true, rating: created, error: null };
        }
    } catch (err) {
        console.error('Error in rateProject:', err);
        return { success: false, error: 'Đã xảy ra lỗi' };
    }
}

/**
 * Get project rating statistics
 */
export async function getProjectRatingStats(
    projectId: string
): Promise<{ stats: ProjectRatingStats | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .rpc('get_project_rating_stats', { p_project_id: projectId });

        if (error) {
            console.error('Error fetching rating stats:', error);
            return { stats: null, error: 'Không thể tải thống kê đánh giá' };
        }

        if (!data || data.length === 0) {
            return {
                stats: {
                    avg_rating: 0,
                    total_ratings: 0,
                    rating_score: 0,
                },
                error: null,
            };
        }

        return { stats: data[0], error: null };
    } catch (err) {
        console.error('Error in getProjectRatingStats:', err);
        return { stats: null, error: 'Đã xảy ra lỗi' };
    }
}

/**
 * Get project leaderboard
 */
export async function getProjectLeaderboard(
    limit: number = 10
): Promise<{ projects: LeaderboardProject[]; error: string | null }> {
    try {
        const { data, error } = await supabase
            .rpc('get_project_leaderboard', { p_limit: limit });

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return { projects: [], error: 'Không thể tải bảng xếp hạng' };
        }

        return { projects: data || [], error: null };
    } catch (err) {
        console.error('Error in getProjectLeaderboard:', err);
        return { projects: [], error: 'Đã xảy ra lỗi' };
    }
}

/**
 * Get all ratings for a project with pagination
 */
export async function getProjectRatings(
    projectId: string,
    page: number = 1,
    pageSize: number = 10
): Promise<{ ratings: ProjectRating[]; total: number; error: string | null }> {
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Get ratings with count
        const { data, error, count } = await supabase
            .from('project_ratings')
            .select('*', { count: 'exact' })
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching ratings:', error);
            return { ratings: [], total: 0, error: 'Không thể tải đánh giá' };
        }

        return { ratings: data || [], total: count || 0, error: null };
    } catch (err) {
        console.error('Error in getProjectRatings:', err);
        return { ratings: [], total: 0, error: 'Đã xảy ra lỗi' };
    }
}
