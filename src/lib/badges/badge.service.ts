// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Badge Service
// ============================================
// Handles badge-related operations

import { supabase } from '../supabase/supabase';
import type { BadgeProgress, UserBadge } from './types';

/**
 * Get user's badge progress (earned and unearned)
 */
export async function getUserBadgeProgress(
    userId: string
): Promise<BadgeProgress[]> {
    try {
        const { data, error } = await supabase.rpc('get_user_badge_progress', {
            p_user_id: userId,
        });

        if (error) {
            console.error('Error fetching badge progress:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Unexpected error fetching badge progress:', err);
        return [];
    }
}

/**
 * Get user's earned badges only
 */
export async function getUserEarnedBadges(
    userId: string
): Promise<UserBadge[]> {
    try {
        const { data, error } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', userId)
            .order('earned_at', { ascending: false });

        if (error) {
            console.error('Error fetching earned badges:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Unexpected error fetching earned badges:', err);
        return [];
    }
}

/**
 * Get badge count for a user
 */
export async function getUserBadgeCount(userId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('user_badges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching badge count:', error);
            return 0;
        }

        return count || 0;
    } catch (err) {
        console.error('Unexpected error fetching badge count:', err);
        return 0;
    }
}

/**
 * Subscribe to new badge awards for a user
 */
export function subscribeToUserBadges(
    userId: string,
    onNewBadge: (badge: UserBadge) => void
) {
    const subscription = supabase
        .channel(`user_badges:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'user_badges',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                console.log('New badge earned!', payload.new);
                onNewBadge(payload.new as UserBadge);
            }
        )
        .subscribe();

    return subscription;
}

/**
 * Get recently earned badges across all users (for community feed)
 */
export async function getRecentBadgeAwards(limit: number = 10) {
    try {
        const { data, error } = await supabase
            .from('user_badges')
            .select(
                `
        *,
        profiles!user_badges_user_id_fkey(username, avatar_url),
        badge_definitions!user_badges_badge_id_fkey(name, icon, color)
      `
            )
            .order('earned_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent badge awards:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Unexpected error fetching recent badge awards:', err);
        return [];
    }
}
