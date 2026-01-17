// ============================================
// Database Types for Supabase
// ============================================
// These types provide type safety for database queries
// Auto-generated from the database schema
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          phone_number: string | null;
          role: "farmer" | "business";
          organization_id: string | null;
          points: number;
          avatar_url: string | null;
          is_admin: boolean;
          is_banned: boolean;
          banned_reason: string | null;
          banned_at: string | null;
          banned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          phone_number?: string | null;
          role?: "farmer" | "business";
          organization_id?: string | null;
          points?: number;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          banned_reason?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          phone_number?: string | null;
          role?: "farmer" | "business";
          organization_id?: string | null;
          points?: number;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          banned_reason?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          phone_number: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          phone_number?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          phone_number?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      password_reset_codes: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          phone_number: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          phone_number: string;
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          phone_number?: string;
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          category: "experience" | "salinity-solution" | "product";
          image_url: string | null;
          product_link: string | null;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          category: "experience" | "salinity-solution" | "product";
          image_url?: string | null;
          product_link?: string | null;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          category?: "experience" | "salinity-solution" | "product";
          image_url?: string | null;
          product_link?: string | null;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          price: number;
          category: string;
          image_url: string | null;
          contact: string;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description: string;
          price: number;
          category: string;
          image_url?: string | null;
          contact: string;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          price?: number;
          category?: string;
          image_url?: string | null;
          contact?: string;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      post_views: {
        Row: {
          id: string;
          post_id: string;
          user_id: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string | null;
          viewed_at?: string;
        };
      };
      product_views: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string | null;
          viewed_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_username_available: {
        Args: {
          check_username: string;
        };
        Returns: boolean;
      };
      request_password_reset: {
        Args: {
          reset_phone_number: string;
        };
        Returns: {
          user_id: string;
          username: string;
          code: string;
          expires_at: string;
        }[];
      };
      verify_password_reset_code: {
        Args: {
          reset_phone_number: string;
          reset_code: string;
        };
        Returns: {
          user_id: string | null;
          username: string | null;
          valid: boolean;
        }[];
      };
      mark_reset_code_used: {
        Args: {
          reset_phone_number: string;
          reset_code: string;
        };
        Returns: boolean;
      };
      update_user_password: {
        Args: {
          p_user_id: string;
          p_new_password: string;
        };
        Returns: boolean;
      };
      get_post_with_stats: {
        Args: {
          post_uuid: string;
        };
        Returns: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          category: string;
          image_url: string | null;
          product_link: string | null;
          views_count: number;
          likes_count: number;
          comments_count: number;
          created_at: string;
          updated_at: string;
          author_username: string;
          author_points: number;
        }[];
      };
      get_posts_with_stats: {
        Args: {
          category_filter?: string | null;
          search_query?: string | null;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          category: string;
          image_url: string | null;
          product_link: string | null;
          views_count: number;
          likes_count: number;
          comments_count: number;
          created_at: string;
          updated_at: string;
          author_username: string;
          author_points: number;
        }[];
      };
      calculate_user_points: {
        Args: {
          user_uuid: string;
        };
        Returns: number;
      };
      get_top_contributors: {
        Args: {
          limit_count?: number;
        };
        Returns: {
          user_id: string;
          username: string;
          total_points: number;
          posts_count: number;
          likes_received: number;
        }[];
      };
      increment_post_views: {
        Args: {
          post_uuid: string;
          viewer_id?: string | null;
        };
        Returns: void;
      };
      increment_product_views: {
        Args: {
          product_uuid: string;
          viewer_id?: string | null;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
