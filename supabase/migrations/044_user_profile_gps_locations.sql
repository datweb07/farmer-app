-- Private GPS coordinates saved from the user's own profile.
-- Kept separate from user_locations because the administrative fields there
-- are required and a GPS position can be captured independently.
CREATE TABLE IF NOT EXISTS public.user_gps_locations (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    accuracy_m NUMERIC(10,2),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_gps_locations_latitude_range
        CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT user_gps_locations_longitude_range
        CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT user_gps_locations_accuracy_nonnegative
        CHECK (accuracy_m IS NULL OR accuracy_m >= 0)
);

COMMENT ON TABLE public.user_gps_locations IS
    'Private latest GPS position explicitly captured by a user from their profile.';

ALTER TABLE public.user_gps_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own GPS location"
ON public.user_gps_locations;
CREATE POLICY "Users can view own GPS location"
    ON public.user_gps_locations FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own GPS location"
ON public.user_gps_locations;
CREATE POLICY "Users can insert own GPS location"
    ON public.user_gps_locations FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own GPS location"
ON public.user_gps_locations;
CREATE POLICY "Users can update own GPS location"
    ON public.user_gps_locations FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own GPS location"
ON public.user_gps_locations;
CREATE POLICY "Users can delete own GPS location"
    ON public.user_gps_locations FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.user_gps_locations TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_gps_location_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_user_gps_locations
ON public.user_gps_locations;
CREATE TRIGGER set_updated_at_user_gps_locations
    BEFORE UPDATE ON public.user_gps_locations
    FOR EACH ROW EXECUTE FUNCTION public.set_user_gps_location_updated_at();

CREATE OR REPLACE FUNCTION public.touch_profile_from_user_gps_location()
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

DROP TRIGGER IF EXISTS touch_profile_after_user_gps_location_change
ON public.user_gps_locations;
CREATE TRIGGER touch_profile_after_user_gps_location_change
    AFTER INSERT OR UPDATE OR DELETE ON public.user_gps_locations
    FOR EACH ROW EXECUTE FUNCTION public.touch_profile_from_user_gps_location();

REVOKE ALL ON FUNCTION public.touch_profile_from_user_gps_location() FROM PUBLIC;
