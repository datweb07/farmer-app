-- Make the settings that remain in the UI effective and secure their RPCs.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS push_procurement BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.get_user_settings(user_uuid UUID)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  settings_record public.user_settings;
BEGIN
  IF user_uuid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Không có quyền xem cài đặt này';
  END IF;

  INSERT INTO public.user_settings (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO settings_record
  FROM public.user_settings
  WHERE user_id = user_uuid;

  RETURN settings_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_settings(
  user_uuid UUID,
  settings_data JSONB
)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_settings public.user_settings;
BEGIN
  IF user_uuid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Không có quyền cập nhật cài đặt này';
  END IF;

  INSERT INTO public.user_settings (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_settings
  SET
    push_notifications = COALESCE((settings_data->>'push_notifications')::BOOLEAN, push_notifications),
    push_new_follower = COALESCE((settings_data->>'push_new_follower')::BOOLEAN, push_new_follower),
    push_post_like = COALESCE((settings_data->>'push_post_like')::BOOLEAN, push_post_like),
    push_post_comment = COALESCE((settings_data->>'push_post_comment')::BOOLEAN, push_post_comment),
    push_project_update = COALESCE((settings_data->>'push_project_update')::BOOLEAN, push_project_update),
    push_procurement = COALESCE((settings_data->>'push_procurement')::BOOLEAN, push_procurement),
    updated_at = NOW()
  WHERE user_id = user_uuid
  RETURNING * INTO updated_settings;

  RETURN updated_settings;
END;
$$;

CREATE OR REPLACE FUNCTION public.export_user_data(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_data JSONB;
BEGIN
  IF user_uuid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Không có quyền xuất dữ liệu này';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = user_uuid),
    'settings', (SELECT to_jsonb(s) FROM public.user_settings s WHERE s.user_id = user_uuid),
    'location', (SELECT to_jsonb(l) FROM public.user_locations l WHERE l.user_id = user_uuid),
    'posts', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.posts p WHERE p.user_id = user_uuid), '[]'::JSONB),
    'comments', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.post_comments c WHERE c.user_id = user_uuid), '[]'::JSONB),
    'post_likes', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM public.post_likes l WHERE l.user_id = user_uuid), '[]'::JSONB),
    'post_shares', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.post_shares s WHERE s.user_id = user_uuid), '[]'::JSONB),
    'products', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.products p WHERE p.user_id = user_uuid), '[]'::JSONB),
    'procurement_requests', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.procurement_requests r WHERE r.farmer_id = user_uuid OR r.business_id = user_uuid), '[]'::JSONB),
    'business_reviews', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.business_reviews r WHERE r.farmer_id = user_uuid OR r.business_id = user_uuid), '[]'::JSONB),
    'notifications', COALESCE((SELECT jsonb_agg(to_jsonb(n)) FROM public.notifications n WHERE n.user_id = user_uuid), '[]'::JSONB),
    'follows', COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.user_follows f WHERE f.follower_id = user_uuid OR f.following_id = user_uuid), '[]'::JSONB),
    'exported_at', NOW()
  ) INTO user_data;

  RETURN user_data;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_settings(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_settings(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_settings(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data(UUID) TO authenticated;

