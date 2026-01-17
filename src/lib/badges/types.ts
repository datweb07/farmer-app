// ============================================
// Badge System Types
// ============================================

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    criteria_type: string;
    criteria_value: number | null;
    display_order: number;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    earned_at: string;
}

export interface BadgeProgress {
    badge_id: string;
    badge_name: string;
    badge_description: string;
    badge_icon: string;
    badge_color: string;
    earned: boolean;
    progress: number;
    rank: number; // User's leaderboard rank
    target: number;
    earned_at: string | null;
}

export type BadgeId =
    | 'first_post'
    | 'helpful_contributor'
    | 'active_member'
    | 'investor'
    | 'expert';
