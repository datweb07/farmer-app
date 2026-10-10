-- Keep global admins able to audit every connection, while scoped season admins
-- can access only the matches assigned to their own profile.
DROP POLICY IF EXISTS season_matches_select ON public.season_matches;
CREATE POLICY season_matches_select ON public.season_matches FOR SELECT TO authenticated USING (
  farmer_id = auth.uid()
  OR business_id = auth.uid()
  OR (admin_id = auth.uid() AND public.has_season_connection_admin_access())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin IS TRUE)
);

DROP POLICY IF EXISTS season_messages_select ON public.season_messages;
CREATE POLICY season_messages_select ON public.season_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (
    (m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
    OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin IS TRUE)
  ))
);

DROP POLICY IF EXISTS season_proposals_select ON public.season_proposals;
CREATE POLICY season_proposals_select ON public.season_proposals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (
    auth.uid() IN (m.farmer_id, m.business_id)
    OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin IS TRUE)
  ))
);

DROP POLICY IF EXISTS season_transactions_select ON public.season_transactions;
CREATE POLICY season_transactions_select ON public.season_transactions FOR SELECT TO authenticated USING (
  farmer_id = auth.uid()
  OR business_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin IS TRUE)
);

DROP POLICY IF EXISTS season_message_reactions_select ON public.season_message_reactions;
CREATE POLICY season_message_reactions_select ON public.season_message_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (
    (m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
    OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin IS TRUE)
  ))
);
DROP POLICY IF EXISTS season_message_reactions_insert ON public.season_message_reactions;
CREATE POLICY season_message_reactions_insert ON public.season_message_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND m.status = 'connected' AND (
    auth.uid() IN (m.farmer_id, m.business_id)
    OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
  ))
  AND EXISTS (SELECT 1 FROM public.season_messages sm WHERE sm.id = message_id AND sm.match_id = match_id)
);
DROP POLICY IF EXISTS season_message_reactions_delete ON public.season_message_reactions;
CREATE POLICY season_message_reactions_delete ON public.season_message_reactions FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND m.status = 'connected' AND (
    auth.uid() IN (m.farmer_id, m.business_id)
    OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
  ))
);

DROP POLICY IF EXISTS season_chat_media_upload ON storage.objects;
CREATE POLICY season_chat_media_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'season-chat-media'
  AND split_part(name, '/', 2) = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE split_part(name, '/', 1) = m.id::text
    AND m.status = 'connected' AND (
      auth.uid() IN (m.farmer_id, m.business_id)
      OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
    ))
);
DROP POLICY IF EXISTS season_chat_media_read ON storage.objects;
CREATE POLICY season_chat_media_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'season-chat-media'
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE split_part(name, '/', 1) = m.id::text AND (
    (m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
    OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin IS TRUE)
  ))
);
DROP POLICY IF EXISTS season_chat_media_delete ON storage.objects;
CREATE POLICY season_chat_media_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'season-chat-media' AND split_part(name, '/', 2) = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE split_part(name, '/', 1) = m.id::text
    AND m.status = 'connected' AND (
      auth.uid() IN (m.farmer_id, m.business_id)
      OR (m.admin_id = auth.uid() AND public.has_season_connection_admin_access())
    ))
);

CREATE OR REPLACE FUNCTION public.send_season_chat_message(
  p_match_id UUID,
  p_body TEXT DEFAULT NULL,
  p_attachment_path TEXT DEFAULT NULL,
  p_attachment_mime_type TEXT DEFAULT NULL,
  p_attachment_name TEXT DEFAULT NULL,
  p_attachment_size BIGINT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_message UUID;
  v_match public.season_matches%ROWTYPE;
  v_body TEXT;
  v_preview TEXT;
BEGIN
  v_body := nullif(trim(coalesce(p_body, '')), '');
  IF v_body IS NOT NULL AND length(v_body) > 4000 THEN RAISE EXCEPTION 'Tin nhắn tối đa 4000 ký tự'; END IF;
  IF v_body IS NULL AND p_attachment_path IS NULL THEN RAISE EXCEPTION 'Tin nhắn cần có nội dung hoặc tệp đính kèm'; END IF;
  IF p_attachment_path IS NOT NULL AND (
    p_attachment_path NOT LIKE p_match_id::text || '/' || auth.uid()::text || '/%'
    OR p_attachment_mime_type IS NULL OR p_attachment_name IS NULL OR p_attachment_size IS NULL
    OR p_attachment_mime_type NOT IN ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime')
    OR p_attachment_size NOT BETWEEN 1 AND 20971520
  ) THEN RAISE EXCEPTION 'Tệp đính kèm không hợp lệ'; END IF;

  SELECT * INTO v_match FROM public.season_matches WHERE id = p_match_id AND status = 'connected';
  IF v_match.id IS NULL OR NOT (
    auth.uid() IN (v_match.farmer_id, v_match.business_id)
    OR (auth.uid() = v_match.admin_id AND public.has_season_connection_admin_access())
  ) THEN RAISE EXCEPTION 'Chỉ hai bên và admin phụ trách mới được trao đổi sau khi kết nối'; END IF;
  IF p_attachment_path IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'season-chat-media'
      AND o.name = p_attachment_path AND o.owner_id = auth.uid()::text
  ) THEN RAISE EXCEPTION 'Không tìm thấy tệp đính kèm đã tải lên'; END IF;

  INSERT INTO public.season_messages(match_id, sender_id, body, attachment_path, attachment_mime_type, attachment_name, attachment_size)
  VALUES (p_match_id, auth.uid(), v_body, p_attachment_path, p_attachment_mime_type, p_attachment_name, p_attachment_size)
  RETURNING id INTO v_message;

  v_preview := left(coalesce(v_body, CASE WHEN p_attachment_mime_type LIKE 'video/%' THEN 'Đã gửi video.' ELSE 'Đã gửi ảnh.' END), 180);
  INSERT INTO public.notifications(user_id, type, title, message, link, actor_id, metadata)
  SELECT recipient_id, 'SEASON_CONNECTION', 'Tin nhắn mới trong hồ sơ mùa vụ', v_preview,
    '/connections', auth.uid(), jsonb_build_object('match_id', p_match_id)
  FROM (VALUES (v_match.farmer_id), (v_match.business_id)) AS recipients(recipient_id)
  WHERE recipient_id <> auth.uid();
  RETURN v_message;
END;
$$;
REVOKE ALL ON FUNCTION public.send_season_chat_message(UUID,TEXT,TEXT,TEXT,TEXT,BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_season_chat_message(UUID,TEXT,TEXT,TEXT,TEXT,BIGINT) TO authenticated;
