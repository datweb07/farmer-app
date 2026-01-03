// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Leaderboard Service
// ============================================
// Handles leaderboard and user points calculations
// ============================================

import { supabase } from '../supabase/supabase';
import type { TopContributor } from './types';

/**
 * Get top contributors for leaderboard
 */
export async function getTopContributors(limit: number = 10): Promise<{
    contributors: TopContributor[];
    error?: string;
}> {
    try {
        console.log('🔵 [Leaderboard] Fetching top contributors...');

        const { data, error } = await supabase.rpc('get_top_contributors', {
            limit_count: limit,
        });

        if (error) {
            console.error('🔴 [Leaderboard] Fetch error:', error);
            return { contributors: [], error: 'Không thể tải bảng xếp hạng' };
        }

        console.log('✅ [Leaderboard] Fetched', data?.length || 0, 'contributors');
        return { contributors: (data as TopContributor[]) || [] };
    } catch (err) {
        console.error('🔴 [Leaderboard] Unexpected error:', err);
        return { contributors: [], error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get user's points
 */
export async function getUserPoints(userId: string): Promise<{
    points: number;
    error?: string;
}> {
    try {
        const { data, error } = await supabase.rpc('calculate_user_points', {
            user_uuid: userId,
        });

        if (error) {
            console.error('🔴 [Leaderboard] Points calculation error:', error);
            return { points: 0, error: 'Không thể tính điểm' };
        }

        return { points: data || 0 };
    } catch (err) {
        console.error('🔴 [Leaderboard] Unexpected error:', err);
        return { points: 0, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get current user's rank
 */
export async function getCurrentUserRank(): Promise<{
    rank: number | null;
    points: number;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { rank: null, points: 0, error: 'Chưa đăng nhập' };
        }

        // Get all contributors
        const { contributors } = await getTopContributors(1000); // Get more to find user's rank

        // Find user's rank
        const userIndex = contributors.findIndex(c => c.user_id === user.id);
        const rank = userIndex >= 0 ? userIndex + 1 : null;

        // Get user's points
        const { points } = await getUserPoints(user.id);

        return { rank, points };
    } catch (err) {
        console.error('🔴 [Leaderboard] Unexpected error:', err);
        return { rank: null, points: 0, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}
