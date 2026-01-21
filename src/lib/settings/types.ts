// ============================================
// User Settings Types
// ============================================

export type Language = "vi" | "en";
export type Theme = "light" | "dark" | "system";
export type ProfileVisibility = "public" | "followers" | "private";

export interface UserSettings {
  id: string;
  user_id: string;

  // Preferences
  language: Language;
  theme: Theme;

  // Notification Preferences
  email_notifications: boolean;
  email_new_follower: boolean;
  email_post_like: boolean;
  email_post_comment: boolean;
  email_project_update: boolean;

  push_notifications: boolean;
  push_new_follower: boolean;
  push_post_like: boolean;
  push_post_comment: boolean;
  push_project_update: boolean;

  // Privacy Settings
  profile_visibility: ProfileVisibility;
  show_email: boolean;
  show_phone: boolean;
  allow_messages: boolean;
  show_activity: boolean;

  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsPayload {
  language?: Language;
  theme?: Theme;
  email_notifications?: boolean;
  email_new_follower?: boolean;
  email_post_like?: boolean;
  email_post_comment?: boolean;
  email_project_update?: boolean;
  push_notifications?: boolean;
  push_new_follower?: boolean;
  push_post_like?: boolean;
  push_post_comment?: boolean;
  push_project_update?: boolean;
  profile_visibility?: ProfileVisibility;
  show_email?: boolean;
  show_phone?: boolean;
  allow_messages?: boolean;
  show_activity?: boolean;
}

export interface ExportedUserData {
  profile: any;
  settings: UserSettings;
  posts: any[];
  comments: any[];
  products: any[];
  followers: any[];
  export_date: string;
}
