-- Keep Settings > Export data complete after adding private profile GPS data.
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
    'gps_location', (SELECT to_jsonb(g) FROM public.user_gps_locations g WHERE g.user_id = user_uuid),
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

REVOKE ALL ON FUNCTION public.export_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_user_data(UUID) TO authenticated;
