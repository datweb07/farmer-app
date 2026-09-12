-- Once a business accepts a procurement request, it becomes a committed deal.
-- It must remain in the completion-rate denominator and cannot be silently rejected.
CREATE OR REPLACE FUNCTION public.lock_accepted_procurement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status = 'accepted' AND NEW.status = 'rejected' THEN
        RAISE EXCEPTION 'Yêu cầu đã nhận phải được hoàn tất, không thể chuyển thành từ chối';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_lock_accepted_procurement ON public.procurement_requests;
CREATE TRIGGER trigger_lock_accepted_procurement
    BEFORE UPDATE ON public.procurement_requests
    FOR EACH ROW EXECUTE FUNCTION public.lock_accepted_procurement();

