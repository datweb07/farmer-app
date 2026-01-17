// ============================================
// Media Type Definitions
// ============================================

export interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  display_order: number;
  caption?: string;
  created_at: string;
}

export interface PostVideo {
  id: string;
  post_id: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVideo {
  id: string;
  product_id: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  created_at: string;
}
