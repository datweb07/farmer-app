-- ============================================
-- Private user administrative locations
-- Source data: daohoangson/dvhcvn (effective 2025-03-01)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_locations (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    province_code TEXT NOT NULL,
    province_name TEXT NOT NULL,
    district_code TEXT NOT NULL,
    district_name TEXT NOT NULL,
    ward_code TEXT NOT NULL,
    ward_name TEXT NOT NULL,
    dataset_version DATE NOT NULL DEFAULT DATE '2025-03-01',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_locations_province_code_format CHECK (province_code ~ '^[0-9]{2}$'),
    CONSTRAINT user_locations_district_code_format CHECK (district_code ~ '^[0-9]{3}$'),
    CONSTRAINT user_locations_ward_code_format CHECK (ward_code ~ '^[0-9]{5}$'),
    CONSTRAINT user_locations_names_not_blank CHECK (
        btrim(province_name) <> '' AND
        btrim(district_name) <> '' AND
        btrim(ward_name) <> ''
    )
);

COMMENT ON TABLE public.user_locations IS
    'Private user-selected administrative location from daohoangson/dvhcvn.';

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own location" ON public.user_locations;
CREATE POLICY "Users can view own location"
    ON public.user_locations FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own location" ON public.user_locations;
CREATE POLICY "Users can insert own location"
    ON public.user_locations FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own location" ON public.user_locations;
CREATE POLICY "Users can update own location"
    ON public.user_locations FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own location" ON public.user_locations;
CREATE POLICY "Users can delete own location"
    ON public.user_locations FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locations TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_location_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_user_locations ON public.user_locations;
CREATE TRIGGER set_updated_at_user_locations
    BEFORE UPDATE ON public.user_locations
    FOR EACH ROW EXECUTE FUNCTION public.set_user_location_updated_at();

-- Extend the existing notification contract without removing older types.
ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (type IN (
        'POST_LIKE',
        'POST_COMMENT',
        'COMMENT_REPLY',
        'POST_SHARE',
        'PROJECT_INVESTMENT',
        'PROJECT_RATING',
        'PRODUCT_VIEW_MILESTONE',
        'FOLLOW',
        'MENTION',
        'POST_APPROVED',
        'PRODUCT_APPROVED',
        'PROJECT_APPROVED',
        'PROFILE_LOCATION_UPDATED'
    ));

CREATE OR REPLACE FUNCTION public.notify_user_location_saved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND
       ROW(OLD.province_code, OLD.district_code, OLD.ward_code) IS NOT DISTINCT FROM
       ROW(NEW.province_code, NEW.district_code, NEW.ward_code) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
        NEW.user_id,
        'PROFILE_LOCATION_UPDATED',
        'Cập nhật địa chỉ thành công',
        'Đã lưu ' || NEW.ward_name || ', ' || NEW.district_name || ', ' || NEW.province_name || '.',
        '/profile'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_user_location_saved ON public.user_locations;
CREATE TRIGGER trigger_notify_user_location_saved
    AFTER INSERT OR UPDATE ON public.user_locations
    FOR EACH ROW EXECUTE FUNCTION public.notify_user_location_saved();

