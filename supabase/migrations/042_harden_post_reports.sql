-- Validate reports at the database boundary and prevent report spam.
ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_description_length_check;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_description_length_check
  CHECK (description IS NULL OR char_length(description) <= 1000) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_content_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  post_owner UUID;
BEGIN
  IF NEW.reporter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Không thể báo cáo thay cho tài khoản khác';
  END IF;

  IF NEW.content_type = 'post' THEN
    SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.content_id;
    IF post_owner IS NULL THEN
      RAISE EXCEPTION 'Bài viết không tồn tại';
    END IF;
    IF post_owner = auth.uid() THEN
      RAISE EXCEPTION 'Không thể báo cáo bài viết của chính mình';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.content_reports report
    WHERE report.reporter_id = auth.uid()
      AND report.content_type = NEW.content_type
      AND report.content_id = NEW.content_id
      AND report.status IN ('pending', 'reviewing')
  ) THEN
    RAISE EXCEPTION 'Bạn đã báo cáo nội dung này và báo cáo đang được xử lý';
  END IF;

  NEW.status := 'pending';
  NEW.resolved_by := NULL;
  NEW.resolved_at := NULL;
  NEW.resolution_note := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_content_report ON public.content_reports;
CREATE TRIGGER trigger_validate_content_report
  BEFORE INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_content_report();

