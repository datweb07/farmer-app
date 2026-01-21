// ============================================
// Follow System Types
// ============================================

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  follower?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  following?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ProjectFollow {
  id: string;
  user_id: string;
  project_id: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  project?: {
    id: string;
    title: string;
    image_url?: string;
    status: string;
  };
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by: boolean;
}

export interface ProjectFollowStats {
  followers_count: number;
  is_following: boolean;
}
