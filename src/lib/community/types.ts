// ============================================
// Community & Products Type Definitions
// ============================================

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: "experience" | "salinity-solution" | "product";
  image_url?: string;
  product_link?: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostWithStats extends Post {
  likes_count: number;
  comments_count: number;
  shares_count: number;
  author_username: string;
  author_avatar?: string | null;
  author_points: number;
  is_liked?: boolean; // Whether current user liked this post
  is_shared?: boolean; // Whether current user shared this post
}

export interface PostShare {
  id: string;
  post_id: string;
  user_id: string;
  original_user_id: string;
  created_at: string;
}

export interface SharedPost extends PostWithStats {
  shared_at: string; // When the post was shared by the user
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  contact: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithStats extends Product {
  seller_username: string;
  seller_points: number;
  seller_role: "farmer" | "business"; // Phân biệt nông dân vs doanh nghiệp
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string | null; // For nested replies
  reply_count: number; // Number of replies
  like_count: number; // Number of likes
  user_liked?: boolean; // Whether current user liked this comment
  username?: string; // Author username (joined from profiles)
  avatar_url?: string | null; // Author avatar URL
  created_at: string;
  updated_at: string;
  replies?: PostComment[]; // Nested replies (loaded separately)
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface TopContributor {
  user_id: string;
  username: string;
  total_points: number;
  posts_count: number;
  likes_received: number;
  rank: number; // BIGINT from PostgreSQL
}

export interface CreatePostData {
  title: string;
  content: string;
  category: "experience" | "salinity-solution" | "product";
  image?: File;
  product_link?: string;
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  category: string;
  image?: File;
  contact: string;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  category?: "experience" | "salinity-solution" | "product";
  image_url?: string;
  product_link?: string;
  image?: File | null;
  removeImage?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  contact?: string;
  image?: File | null;
  removeImage?: boolean;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}
