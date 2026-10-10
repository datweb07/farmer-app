-- Private media, live updates, and per-message emoji reactions for season chats.
ALTER TABLE public.season_messages
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

ALTER TABLE public.season_messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.season_messages DROP CONSTRAINT IF EXISTS season_messages_body_check;
ALTER TABLE public.season_messages
  ADD CONSTRAINT season_messages_body_or_attachment_check CHECK (
    (body IS NOT NULL AND length(trim(body)) BETWEEN 1 AND 4000)
    OR attachment_path IS NOT NULL
  );
ALTER TABLE public.season_messages
  ADD CONSTRAINT season_messages_attachment_metadata_check CHECK (
    (attachment_path IS NULL AND attachment_mime_type IS NULL AND attachment_name IS NULL AND attachment_size IS NULL)
    OR (attachment_path IS NOT NULL AND attachment_mime_type IS NOT NULL AND attachment_name IS NOT NULL AND attachment_size IS NOT NULL
        AND attachment_mime_type IN ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime')
        AND attachment_size BETWEEN 1 AND 20971520)
  );

CREATE TABLE IF NOT EXISTS public.season_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.season_matches(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.season_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍','❤️','😂','🙏','🎉')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS season_message_reactions_match_idx ON public.season_message_reactions(match_id, message_id);
ALTER TABLE public.season_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS season_message_reactions_select ON public.season_message_reactions;
CREATE POLICY season_message_reactions_select ON public.season_message_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (
    (m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
    OR public.has_season_connection_admin_access()
  ))
);
DROP POLICY IF EXISTS season_message_reactions_insert ON public.season_message_reactions;
CREATE POLICY season_message_reactions_insert ON public.season_message_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
  AND EXISTS (SELECT 1 FROM public.season_messages sm WHERE sm.id = message_id AND sm.match_id = match_id)
);
DROP POLICY IF EXISTS season_message_reactions_delete ON public.season_message_reactions;
CREATE POLICY season_message_reactions_delete ON public.season_message_reactions FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
);
GRANT SELECT, INSERT, DELETE ON public.season_message_reactions TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('season-chat-media', 'season-chat-media', FALSE, 20971520,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 20971520,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS season_chat_media_upload ON storage.objects;
CREATE POLICY season_chat_media_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'season-chat-media'
  AND split_part(name, '/', 2) = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE split_part(name, '/', 1) = m.id::text
    AND m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
);
DROP POLICY IF EXISTS season_chat_media_read ON storage.objects;
CREATE POLICY season_chat_media_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'season-chat-media'
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE split_part(name, '/', 1) = m.id::text AND (
    (m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
    OR public.has_season_connection_admin_access()
  ))
);
DROP POLICY IF EXISTS season_chat_media_delete ON storage.objects;
CREATE POLICY season_chat_media_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'season-chat-media' AND split_part(name, '/', 2) = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.season_matches m WHERE split_part(name, '/', 1) = m.id::text
    AND m.status = 'connected' AND auth.uid() IN (m.farmer_id, m.business_id))
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
DECLARE v_message UUID; v_match public.season_matches%ROWTYPE; v_recipient UUID; v_body TEXT;
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
  IF v_match.id IS NULL OR auth.uid() NOT IN (v_match.farmer_id, v_match.business_id) THEN RAISE EXCEPTION 'Trao đổi chỉ mở cho hai bên sau khi cùng đồng ý'; END IF;
  IF p_attachment_path IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'season-chat-media'
      AND o.name = p_attachment_path AND o.owner_id = auth.uid()::text
  ) THEN RAISE EXCEPTION 'Không tìm thấy tệp đính kèm đã tải lên'; END IF;
  INSERT INTO public.season_messages(match_id, sender_id, body, attachment_path, attachment_mime_type, attachment_name, attachment_size)
  VALUES (p_match_id, auth.uid(), v_body, p_attachment_path, p_attachment_mime_type, p_attachment_name, p_attachment_size)
  RETURNING id INTO v_message;
  v_recipient := CASE WHEN auth.uid() = v_match.farmer_id THEN v_match.business_id ELSE v_match.farmer_id END;
  INSERT INTO public.notifications(user_id, type, title, message, link, actor_id, metadata)
  VALUES (v_recipient, 'SEASON_CONNECTION', 'Tin nhắn mới trong hồ sơ mùa vụ',
    left(coalesce(v_body, CASE WHEN p_attachment_mime_type LIKE 'video/%' THEN 'Đã gửi video.' ELSE 'Đã gửi ảnh.' END), 180),
    '/connections', auth.uid(), jsonb_build_object('match_id', p_match_id));
  RETURN v_message;
END; $$;
REVOKE ALL ON FUNCTION public.send_season_chat_message(UUID,TEXT,TEXT,TEXT,TEXT,BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_season_chat_message(UUID,TEXT,TEXT,TEXT,TEXT,BIGINT) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'season_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.season_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'season_message_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.season_message_reactions;
  END IF;
END $$;
