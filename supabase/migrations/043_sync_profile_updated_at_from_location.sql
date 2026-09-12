-- A saved administrative location is part of the user's profile. Keep the
-- profile activity timestamp in sync so every profile view shows the real
-- latest change, regardless of whether the user is a farmer or a business.
CREATE OR REPLACE FUNCTION public.touch_profile_from_user_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  UPDATE public.profiles
  SET updated_at = NOW()
  WHERE id = target_user_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS touch_profile_after_user_location_change
ON public.user_locations;

CREATE TRIGGER touch_profile_after_user_location_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_locations
FOR EACH ROW
EXECUTE FUNCTION public.touch_profile_from_user_location();

REVOKE ALL ON FUNCTION public.touch_profile_from_user_location() FROM PUBLIC;
