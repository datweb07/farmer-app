-- ============================================
-- User Settings & Privacy System
-- ============================================

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Preferences
  language TEXT DEFAULT 'vi' CHECK (language IN ('vi', 'en')),
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  email_new_follower BOOLEAN DEFAULT true,
  email_post_like BOOLEAN DEFAULT true,
  email_post_comment BOOLEAN DEFAULT true,
  email_project_update BOOLEAN DEFAULT true,
  
  push_notifications BOOLEAN DEFAULT true,
  push_new_follower BOOLEAN DEFAULT true,
  push_post_like BOOLEAN DEFAULT false,
  push_post_comment BOOLEAN DEFAULT true,
  push_project_update BOOLEAN DEFAULT true,
  
  -- Privacy Settings
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'followers', 'private')),
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT true,
  allow_messages BOOLEAN DEFAULT true,
  show_activity BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- RLS Policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get user settings (creates default if not exists)
CREATE OR REPLACE FUNCTION get_user_settings(user_uuid UUID)
RETURNS user_settings AS $$
DECLARE
  settings_record user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings_record
  FROM user_settings
  WHERE user_id = user_uuid;
  
  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO user_settings (user_id)
    VALUES (user_uuid)
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user settings
CREATE OR REPLACE FUNCTION update_user_settings(
  user_uuid UUID,
  settings_data JSONB
)
RETURNS user_settings AS $$
DECLARE
  updated_settings user_settings;
BEGIN
  -- Ensure settings exist
  INSERT INTO user_settings (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update settings
  UPDATE user_settings
  SET
    language = COALESCE((settings_data->>'language')::TEXT, language),
    theme = COALESCE((settings_data->>'theme')::TEXT, theme),
    email_notifications = COALESCE((settings_data->>'email_notifications')::BOOLEAN, email_notifications),
    email_new_follower = COALESCE((settings_data->>'email_new_follower')::BOOLEAN, email_new_follower),
    email_post_like = COALESCE((settings_data->>'email_post_like')::BOOLEAN, email_post_like),
    email_post_comment = COALESCE((settings_data->>'email_post_comment')::BOOLEAN, email_post_comment),
    email_project_update = COALESCE((settings_data->>'email_project_update')::BOOLEAN, email_project_update),
    push_notifications = COALESCE((settings_data->>'push_notifications')::BOOLEAN, push_notifications),
    push_new_follower = COALESCE((settings_data->>'push_new_follower')::BOOLEAN, push_new_follower),
    push_post_like = COALESCE((settings_data->>'push_post_like')::BOOLEAN, push_post_like),
    push_post_comment = COALESCE((settings_data->>'push_post_comment')::BOOLEAN, push_post_comment),
    push_project_update = COALESCE((settings_data->>'push_project_update')::BOOLEAN, push_project_update),
    profile_visibility = COALESCE((settings_data->>'profile_visibility')::TEXT, profile_visibility),
    show_email = COALESCE((settings_data->>'show_email')::BOOLEAN, show_email),
    show_phone = COALESCE((settings_data->>'show_phone')::BOOLEAN, show_phone),
    allow_messages = COALESCE((settings_data->>'allow_messages')::BOOLEAN, allow_messages),
    show_activity = COALESCE((settings_data->>'show_activity')::BOOLEAN, show_activity),
    updated_at = NOW()
  WHERE user_id = user_uuid
  RETURNING * INTO updated_settings;
  
  RETURN updated_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export user data (GDPR compliance)
CREATE OR REPLACE FUNCTION export_user_data(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  user_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', (
      SELECT row_to_json(p.*)
      FROM profiles p
      WHERE p.id = user_uuid
    ),
    'settings', (
      SELECT row_to_json(s.*)
      FROM user_settings s
      WHERE s.user_id = user_uuid
    ),
    'posts', (
      SELECT jsonb_agg(row_to_json(p.*))
      FROM posts p
      WHERE p.user_id = user_uuid
    ),
    'comments', (
      SELECT jsonb_agg(row_to_json(c.*))
      FROM post_comments c
      WHERE c.user_id = user_uuid
    ),
    'products', (
      SELECT jsonb_agg(row_to_json(pr.*))
      FROM products pr
      WHERE pr.user_id = user_uuid
    ),
    'followers', (
      SELECT jsonb_agg(row_to_json(f.*))
      FROM user_follows f
      WHERE f.follower_id = user_uuid OR f.following_id = user_uuid
    ),
    'export_date', NOW()
  ) INTO user_data;
  
  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_settings_timestamp ON user_settings;
CREATE TRIGGER trigger_update_user_settings_timestamp
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_timestamp();

-- Comments
COMMENT ON TABLE user_settings IS 'User preferences, notification settings, and privacy options';
COMMENT ON FUNCTION get_user_settings(UUID) IS 'Get user settings, creates default if not exists';
COMMENT ON FUNCTION update_user_settings(UUID, JSONB) IS 'Update user settings';
COMMENT ON FUNCTION export_user_data(UUID) IS 'Export all user data for GDPR compliance';
