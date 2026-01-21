-- ============================================
-- Follow System Migration
-- ============================================
-- User follows and project follows with notifications

-- User Follows Table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_follows_no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id)
);

-- Indexes for user follows
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- Project Follows Table
CREATE TABLE IF NOT EXISTS project_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES investment_projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT project_follows_unique UNIQUE (user_id, project_id)
);

-- Indexes for project follows
CREATE INDEX IF NOT EXISTS idx_project_follows_user ON project_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_project_follows_project ON project_follows(project_id);
CREATE INDEX IF NOT EXISTS idx_project_follows_created_at ON project_follows(created_at DESC);

-- RLS Policies for user_follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can view follows
CREATE POLICY "Anyone can view user follows"
  ON user_follows
  FOR SELECT
  TO public
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
  ON user_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON user_follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- RLS Policies for project_follows
ALTER TABLE project_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can view project follows
CREATE POLICY "Anyone can view project follows"
  ON project_follows
  FOR SELECT
  TO public
  USING (true);

-- Users can follow projects
CREATE POLICY "Users can follow projects"
  ON project_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow projects
CREATE POLICY "Users can unfollow projects"
  ON project_follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get user follow stats
CREATE OR REPLACE FUNCTION get_user_follow_stats(user_uuid UUID, current_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  followers_count INTEGER,
  following_count INTEGER,
  is_following BOOLEAN,
  is_followed_by BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM user_follows WHERE following_id = user_uuid) AS followers_count,
    (SELECT COUNT(*)::INTEGER FROM user_follows WHERE follower_id = user_uuid) AS following_count,
    (SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id = current_user_id AND following_id = user_uuid)) AS is_following,
    (SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id = user_uuid AND following_id = current_user_id)) AS is_followed_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get project follow stats
CREATE OR REPLACE FUNCTION get_project_follow_stats(proj_uuid UUID, current_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  followers_count INTEGER,
  is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM project_follows WHERE project_id = proj_uuid) AS followers_count,
    (SELECT EXISTS(SELECT 1 FROM project_follows WHERE user_id = current_user_id AND project_id = proj_uuid)) AS is_following;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's followers
CREATE OR REPLACE FUNCTION get_user_followers(user_uuid UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  follower_id UUID,
  following_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  username TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.id,
    uf.follower_id,
    uf.following_id,
    uf.created_at,
    p.username,
    p.avatar_url
  FROM user_follows uf
  JOIN profiles p ON uf.follower_id = p.id
  WHERE uf.following_id = user_uuid
  ORDER BY uf.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's following
CREATE OR REPLACE FUNCTION get_user_following(user_uuid UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  follower_id UUID,
  following_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  username TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.id,
    uf.follower_id,
    uf.following_id,
    uf.created_at,
    p.username,
    p.avatar_url
  FROM user_follows uf
  JOIN profiles p ON uf.following_id = p.id
  WHERE uf.follower_id = user_uuid
  ORDER BY uf.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following feed (posts from followed users)
CREATE OR REPLACE FUNCTION get_following_feed(user_uuid UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  image_url TEXT,
  product_link TEXT,
  views_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  moderation_status TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  author_username TEXT,
  author_avatar TEXT,
  author_points INTEGER,
  is_liked BOOLEAN,
  is_shared BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.category,
    p.image_url,
    p.product_link,
    p.views_count,
    p.created_at,
    p.updated_at,
    p.moderation_status,
    COALESCE((SELECT COUNT(*)::INTEGER FROM post_likes WHERE post_id = p.id), 0) as likes_count,
    COALESCE((SELECT COUNT(*)::INTEGER FROM post_comments WHERE post_id = p.id), 0) as comments_count,
    COALESCE((SELECT COUNT(*)::INTEGER FROM post_shares WHERE post_id = p.id), 0) as shares_count,
    pr.username as author_username,
    pr.avatar_url as author_avatar,
    0 as author_points,
    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = user_uuid) as is_liked,
    EXISTS(SELECT 1 FROM post_shares ps WHERE ps.post_id = p.id AND ps.user_id = user_uuid) as is_shared
  FROM posts p
  JOIN profiles pr ON p.user_id = pr.id
  WHERE p.user_id IN (
    SELECT following_id
    FROM user_follows
    WHERE follower_id = user_uuid
  )
  AND (p.moderation_status IS NULL OR p.moderation_status = 'approved')
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify on new follower
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_username TEXT;
  follower_avatar TEXT;
BEGIN
  -- Get follower info
  SELECT username, avatar_url INTO follower_username, follower_avatar
  FROM profiles WHERE id = NEW.follower_id;
  
  INSERT INTO notifications (user_id, type, title, message, link, actor_id, actor_username, actor_avatar)
  VALUES (
    NEW.following_id,
    'FOLLOW',
    'Người theo dõi mới',
    'đã bắt đầu theo dõi bạn',
    '/profile/' || NEW.follower_id,
    NEW.follower_id,
    follower_username,
    follower_avatar
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new follower notification
DROP TRIGGER IF EXISTS trigger_notify_new_follower ON user_follows;
CREATE TRIGGER trigger_notify_new_follower
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

-- Function to notify project followers on updates
CREATE OR REPLACE FUNCTION notify_project_followers_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if project status or funding changed significantly
  IF (NEW.status != OLD.status) OR 
     (NEW.current_funding - OLD.current_funding >= 1000000) THEN
    
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT
      pf.user_id,
      'PROJECT_INVESTMENT',
      'Dự án có cập nhật',
      'Dự án "' || NEW.title || '" vừa có cập nhật mới',
      '/investments/project/' || NEW.id
    FROM project_follows pf
    WHERE pf.project_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for project update notifications
DROP TRIGGER IF EXISTS trigger_notify_project_followers ON investment_projects;
CREATE TRIGGER trigger_notify_project_followers
  AFTER UPDATE ON investment_projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_followers_on_update();

-- Comments
COMMENT ON TABLE user_follows IS 'User following relationships';
COMMENT ON TABLE project_follows IS 'User following investment projects';
COMMENT ON FUNCTION get_user_follow_stats(UUID, UUID) IS 'Get follow statistics for a user';
COMMENT ON FUNCTION get_project_follow_stats(UUID, UUID) IS 'Get follow statistics for a project';
COMMENT ON FUNCTION get_following_feed(UUID, INTEGER, INTEGER) IS 'Get posts from followed users';
