-- ============================================
-- Business procurement marketplace and reputation system
-- ============================================

-- Locations are intentionally visible to signed-in users when opening a profile.
DROP POLICY IF EXISTS "Users can view own location" ON public.user_locations;
DROP POLICY IF EXISTS "Authenticated users can view profile locations" ON public.user_locations;
CREATE POLICY "Authenticated users can view profile locations"
    ON public.user_locations FOR SELECT TO authenticated
    USING (true);

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'POST_LIKE', 'POST_COMMENT', 'COMMENT_REPLY', 'POST_SHARE',
    'PROJECT_INVESTMENT', 'PROJECT_RATING', 'PRODUCT_VIEW_MILESTONE',
    'FOLLOW', 'MENTION', 'POST_APPROVED', 'PRODUCT_APPROVED',
    'PROJECT_APPROVED', 'PROFILE_LOCATION_UPDATED',
    'PROCUREMENT_REQUEST', 'PROCUREMENT_COMPLETED', 'BUSINESS_REVIEW_RECEIVED'
));

CREATE TABLE IF NOT EXISTS public.procurement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    farmer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    desired_date DATE NOT NULL,
    product_name TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'completed', 'rejected', 'cancelled')
    ),
    actual_product_name TEXT,
    actual_weight_tons NUMERIC(12,3),
    payment_velocity TEXT CHECK (
        payment_velocity IS NULL OR payment_velocity IN (
            'on_site', 'within_48h', 'within_7d', 'over_7d'
        )
    ),
    farm_latitude NUMERIC(9,6),
    farm_longitude NUMERIC(9,6),
    buyer_latitude NUMERIC(9,6),
    buyer_longitude NUMERIC(9,6),
    gps_distance_km NUMERIC(10,3),
    gps_verified BOOLEAN NOT NULL DEFAULT FALSE,
    otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT procurement_request_per_post UNIQUE (post_id, farmer_id),
    CONSTRAINT procurement_phone_format CHECK (phone_number ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT procurement_weight_positive CHECK (
        actual_weight_tons IS NULL OR actual_weight_tons > 0
    ),
    CONSTRAINT procurement_coordinates_valid CHECK (
        (farm_latitude IS NULL OR farm_latitude BETWEEN -90 AND 90) AND
        (farm_longitude IS NULL OR farm_longitude BETWEEN -180 AND 180) AND
        (buyer_latitude IS NULL OR buyer_latitude BETWEEN -90 AND 90) AND
        (buyer_longitude IS NULL OR buyer_longitude BETWEEN -180 AND 180)
    )
);

CREATE INDEX IF NOT EXISTS idx_procurement_requests_farmer
    ON public.procurement_requests(farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_business
    ON public.procurement_requests(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_post
    ON public.procurement_requests(post_id);

ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view procurement requests"
    ON public.procurement_requests FOR SELECT TO authenticated
    USING (auth.uid() = farmer_id OR auth.uid() = business_id);

CREATE POLICY "Farmers can create procurement requests"
    ON public.procurement_requests FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = farmer_id AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'farmer'
        )
    );

CREATE POLICY "Businesses can update incoming procurement requests"
    ON public.procurement_requests FOR UPDATE TO authenticated
    USING (auth.uid() = business_id)
    WITH CHECK (auth.uid() = business_id);

GRANT SELECT, INSERT, UPDATE ON public.procurement_requests TO authenticated;

CREATE TABLE IF NOT EXISTS public.business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    price_integrity SMALLINT NOT NULL CHECK (price_integrity BETWEEN 1 AND 5),
    punctuality_care SMALLINT NOT NULL CHECK (punctuality_care BETWEEN 1 AND 5),
    transparency_attitude SMALLINT NOT NULL CHECK (transparency_attitude BETWEEN 1 AND 5),
    comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_reviews_business
    ON public.business_reviews(business_id, created_at DESC);

ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view business reviews"
    ON public.business_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Farmers can review completed purchases"
    ON public.business_reviews FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own reviews"
    ON public.business_reviews FOR UPDATE TO authenticated
    USING (auth.uid() = farmer_id)
    WITH CHECK (auth.uid() = farmer_id);

GRANT SELECT, INSERT, UPDATE ON public.business_reviews TO authenticated;

CREATE TABLE IF NOT EXISTS public.business_credentials (
    business_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    verified_id BOOLEAN NOT NULL DEFAULT FALSE,
    bank_guarantee BOOLEAN NOT NULL DEFAULT FALSE,
    export_standard BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.business_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view business credentials"
    ON public.business_credentials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage business credentials"
    ON public.business_credentials FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_admin = TRUE
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_admin = TRUE
    ));

GRANT SELECT ON public.business_credentials TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_credentials TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_procurement_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    post_owner UUID;
    post_owner_role TEXT;
BEGIN
    IF NEW.farmer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Bạn chỉ có thể tạo đăng ký cho chính mình';
    END IF;

    SELECT posts.user_id, profiles.role
    INTO post_owner, post_owner_role
    FROM public.posts
    JOIN public.profiles ON profiles.id = posts.user_id
    WHERE posts.id = NEW.post_id;

    IF post_owner IS NULL OR post_owner_role <> 'business' THEN
        RAISE EXCEPTION 'Chỉ có thể đăng ký với bài thu mua của doanh nghiệp';
    END IF;

    NEW.business_id := post_owner;
    NEW.status := 'pending';
    NEW.otp_verified := EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid() AND u.phone_confirmed_at IS NOT NULL
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prepare_procurement_request ON public.procurement_requests;
CREATE TRIGGER trigger_prepare_procurement_request
    BEFORE INSERT ON public.procurement_requests
    FOR EACH ROW EXECUTE FUNCTION public.prepare_procurement_request();

CREATE OR REPLACE FUNCTION public.prepare_procurement_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    a NUMERIC;
BEGIN
    NEW.updated_at := NOW();

    IF NEW.id <> OLD.id OR NEW.post_id <> OLD.post_id OR
       NEW.farmer_id <> OLD.farmer_id OR NEW.business_id <> OLD.business_id OR
       NEW.farmer_name <> OLD.farmer_name OR NEW.phone_number <> OLD.phone_number OR
       NEW.desired_date <> OLD.desired_date OR NEW.product_name <> OLD.product_name OR
       NEW.note IS DISTINCT FROM OLD.note OR
       NEW.farm_latitude IS DISTINCT FROM OLD.farm_latitude OR
       NEW.farm_longitude IS DISTINCT FROM OLD.farm_longitude OR
       NEW.otp_verified <> OLD.otp_verified THEN
        RAISE EXCEPTION 'Không thể thay đổi thông tin gốc của đăng ký thu mua';
    END IF;

    IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        RAISE EXCEPTION 'Giao dịch đã hoàn thành không thể mở lại';
    END IF;

    IF (OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'accepted', 'rejected', 'completed')) OR
       (OLD.status = 'accepted' AND NEW.status NOT IN ('accepted', 'rejected', 'completed')) OR
       (OLD.status IN ('rejected', 'cancelled') AND NEW.status <> OLD.status) THEN
        RAISE EXCEPTION 'Chuyển trạng thái đăng ký không hợp lệ';
    END IF;

    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        NEW.accepted_at := NOW();
    END IF;

    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        IF NEW.actual_product_name IS NULL OR NEW.actual_weight_tons IS NULL OR
           NEW.payment_velocity IS NULL THEN
            RAISE EXCEPTION 'Cần nhập nông sản, khối lượng và tốc độ thanh toán';
        END IF;
        NEW.completed_at := NOW();

        IF NEW.farm_latitude IS NOT NULL AND NEW.farm_longitude IS NOT NULL AND
           NEW.buyer_latitude IS NOT NULL AND NEW.buyer_longitude IS NOT NULL THEN
            a := power(sin(radians(NEW.buyer_latitude - NEW.farm_latitude) / 2), 2)
               + cos(radians(NEW.farm_latitude)) * cos(radians(NEW.buyer_latitude))
               * power(sin(radians(NEW.buyer_longitude - NEW.farm_longitude) / 2), 2);
            NEW.gps_distance_km := 6371 * 2 * asin(sqrt(LEAST(1, a)));
            NEW.gps_verified := NEW.gps_distance_km <= 2;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prepare_procurement_completion ON public.procurement_requests;
CREATE TRIGGER trigger_prepare_procurement_completion
    BEFORE UPDATE ON public.procurement_requests
    FOR EACH ROW EXECUTE FUNCTION public.prepare_procurement_completion();

CREATE OR REPLACE FUNCTION public.validate_business_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    purchase public.procurement_requests%ROWTYPE;
BEGIN
    SELECT * INTO purchase
    FROM public.procurement_requests
    WHERE id = NEW.request_id;

    IF purchase.id IS NULL OR purchase.status <> 'completed' THEN
        RAISE EXCEPTION 'Chỉ giao dịch hoàn thành mới được đánh giá';
    END IF;
    IF purchase.farmer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Chỉ nông dân của giao dịch được đánh giá';
    END IF;

    NEW.farmer_id := purchase.farmer_id;
    NEW.business_id := purchase.business_id;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_business_review ON public.business_reviews;
CREATE TRIGGER trigger_validate_business_review
    BEFORE INSERT OR UPDATE ON public.business_reviews
    FOR EACH ROW EXECUTE FUNCTION public.validate_business_review();

CREATE OR REPLACE FUNCTION public.notify_procurement_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, actor_id, metadata)
        VALUES (
            NEW.business_id,
            'PROCUREMENT_REQUEST',
            'Đăng ký thu mua mới',
            NEW.farmer_name || ' muốn bán ' || NEW.product_name || ' vào ngày ' ||
                to_char(NEW.desired_date, 'DD/MM/YYYY') || '.',
            '/profile',
            NEW.farmer_id,
            jsonb_build_object(
                'request_id', NEW.id,
                'farmer_name', NEW.farmer_name,
                'phone_number', NEW.phone_number,
                'product_name', NEW.product_name,
                'desired_date', NEW.desired_date,
                'note', NEW.note
            )
        );
    ELSIF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, actor_id, metadata)
        VALUES (
            NEW.farmer_id,
            'PROCUREMENT_COMPLETED',
            'Thu mua đã hoàn thành',
            'Doanh nghiệp đã xác nhận thu mua ' || NEW.actual_weight_tons ||
                ' tấn ' || NEW.actual_product_name || '. Bạn có thể đánh giá ngay.',
            '/profile',
            NEW.business_id,
            jsonb_build_object('request_id', NEW.id, 'business_id', NEW.business_id)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_procurement_events ON public.procurement_requests;
CREATE TRIGGER trigger_notify_procurement_events
    AFTER INSERT OR UPDATE ON public.procurement_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_procurement_events();

CREATE OR REPLACE FUNCTION public.notify_business_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, link, actor_id, metadata)
    VALUES (
        NEW.business_id,
        'BUSINESS_REVIEW_RECEIVED',
        'Đánh giá thu mua mới',
        'Bạn vừa nhận được đánh giá mới từ nông dân.',
        '/profile',
        NEW.farmer_id,
        jsonb_build_object('review_id', NEW.id, 'request_id', NEW.request_id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_business_review ON public.business_reviews;
CREATE TRIGGER trigger_notify_business_review
    AFTER INSERT ON public.business_reviews
    FOR EACH ROW EXECUTE FUNCTION public.notify_business_review();

-- Enforce business-only publishing at database level.
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Businesses can create posts"
    ON public.posts FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'business'
        )
    );

CREATE OR REPLACE VIEW public.business_reputation_scores AS
WITH request_stats AS (
    SELECT
        business_id,
        COUNT(*) FILTER (WHERE status IN ('accepted', 'completed')) AS committed_deals,
        COUNT(*) FILTER (WHERE status = 'completed') AS successful_lots,
        COALESCE(SUM(actual_weight_tons) FILTER (WHERE status = 'completed'), 0) AS total_tons,
        COALESCE(AVG(CASE payment_velocity
            WHEN 'on_site' THEN 15
            WHEN 'within_48h' THEN 10
            WHEN 'within_7d' THEN 5
            WHEN 'over_7d' THEN 0
        END) FILTER (WHERE status = 'completed'), 0) AS payment_score
    FROM public.procurement_requests
    GROUP BY business_id
), review_stats AS (
    SELECT
        business_id,
        COUNT(*) AS review_count,
        AVG(price_integrity) AS avg_price_integrity,
        AVG(punctuality_care) AS avg_punctuality_care,
        AVG(transparency_attitude) AS avg_transparency_attitude
    FROM public.business_reviews
    GROUP BY business_id
)
SELECT
    p.id AS business_id,
    p.username,
    p.avatar_url,
    COALESCE(rs.successful_lots, 0)::BIGINT AS successful_lots,
    COALESCE(rs.total_tons, 0)::NUMERIC AS total_tons,
    COALESCE(rv.review_count, 0)::BIGINT AS review_count,
    ROUND(COALESCE(rv.avg_price_integrity, 0), 2) AS avg_price_integrity,
    ROUND(COALESCE(rv.avg_punctuality_care, 0), 2) AS avg_punctuality_care,
    ROUND(COALESCE(rv.avg_transparency_attitude, 0), 2) AS avg_transparency_attitude,
    ROUND(LEAST(40, (
        CASE WHEN COALESCE(rs.committed_deals, 0) > 0
            THEN rs.successful_lots::NUMERIC / rs.committed_deals * 15 ELSE 0 END
        + COALESCE(rs.payment_score, 0)
        + CASE WHEN COALESCE(rs.total_tons, 0) > 100 THEN 10
               WHEN COALESCE(rs.total_tons, 0) >= 50 THEN 7
               WHEN COALESCE(rs.total_tons, 0) > 0 THEN 4 ELSE 0 END
    )), 2) AS transaction_score,
    ROUND(LEAST(40, (
        COALESCE(rv.avg_price_integrity, 0) / 5 * 15
        + COALESCE(rv.avg_punctuality_care, 0) / 5 * 15
        + COALESCE(rv.avg_transparency_attitude, 0) / 5 * 10
    )), 2) AS review_score,
    (
        CASE WHEN COALESCE(bc.verified_id, FALSE) THEN 5 ELSE 0 END
        + CASE WHEN COALESCE(bc.bank_guarantee, FALSE) THEN 10 ELSE 0 END
        + CASE WHEN COALESCE(bc.export_standard, FALSE) THEN 5 ELSE 0 END
    )::NUMERIC AS legal_score,
    ROUND(LEAST(100,
        LEAST(40, (
            CASE WHEN COALESCE(rs.committed_deals, 0) > 0
                THEN rs.successful_lots::NUMERIC / rs.committed_deals * 15 ELSE 0 END
            + COALESCE(rs.payment_score, 0)
            + CASE WHEN COALESCE(rs.total_tons, 0) > 100 THEN 10
                   WHEN COALESCE(rs.total_tons, 0) >= 50 THEN 7
                   WHEN COALESCE(rs.total_tons, 0) > 0 THEN 4 ELSE 0 END
        ))
        + LEAST(40, (
            COALESCE(rv.avg_price_integrity, 0) / 5 * 15
            + COALESCE(rv.avg_punctuality_care, 0) / 5 * 15
            + COALESCE(rv.avg_transparency_attitude, 0) / 5 * 10
        ))
        + CASE WHEN COALESCE(bc.verified_id, FALSE) THEN 5 ELSE 0 END
        + CASE WHEN COALESCE(bc.bank_guarantee, FALSE) THEN 10 ELSE 0 END
        + CASE WHEN COALESCE(bc.export_standard, FALSE) THEN 5 ELSE 0 END
    ), 2) AS total_score,
    ROUND(LEAST(5, (
        LEAST(40, (
            CASE WHEN COALESCE(rs.committed_deals, 0) > 0
                THEN rs.successful_lots::NUMERIC / rs.committed_deals * 15 ELSE 0 END
            + COALESCE(rs.payment_score, 0)
            + CASE WHEN COALESCE(rs.total_tons, 0) > 100 THEN 10
                   WHEN COALESCE(rs.total_tons, 0) >= 50 THEN 7
                   WHEN COALESCE(rs.total_tons, 0) > 0 THEN 4 ELSE 0 END
        ))
        + LEAST(40, (
            COALESCE(rv.avg_price_integrity, 0) / 5 * 15
            + COALESCE(rv.avg_punctuality_care, 0) / 5 * 15
            + COALESCE(rv.avg_transparency_attitude, 0) / 5 * 10
        ))
        + CASE WHEN COALESCE(bc.verified_id, FALSE) THEN 5 ELSE 0 END
        + CASE WHEN COALESCE(bc.bank_guarantee, FALSE) THEN 10 ELSE 0 END
        + CASE WHEN COALESCE(bc.export_standard, FALSE) THEN 5 ELSE 0 END
    ) / 20), 1) AS star_rating,
    CASE
        WHEN (
            LEAST(40, CASE WHEN COALESCE(rs.committed_deals, 0) > 0
                THEN rs.successful_lots::NUMERIC / rs.committed_deals * 15 ELSE 0 END
                + COALESCE(rs.payment_score, 0)
                + CASE WHEN COALESCE(rs.total_tons, 0) > 100 THEN 10
                       WHEN COALESCE(rs.total_tons, 0) >= 50 THEN 7
                       WHEN COALESCE(rs.total_tons, 0) > 0 THEN 4 ELSE 0 END)
            + LEAST(40, COALESCE(rv.avg_price_integrity, 0) / 5 * 15
                + COALESCE(rv.avg_punctuality_care, 0) / 5 * 15
                + COALESCE(rv.avg_transparency_attitude, 0) / 5 * 10)
            + CASE WHEN COALESCE(bc.verified_id, FALSE) THEN 5 ELSE 0 END
            + CASE WHEN COALESCE(bc.bank_guarantee, FALSE) THEN 10 ELSE 0 END
            + CASE WHEN COALESCE(bc.export_standard, FALSE) THEN 5 ELSE 0 END
        ) >= 85 THEN 'Top Partner'
        WHEN (
            LEAST(40, CASE WHEN COALESCE(rs.committed_deals, 0) > 0
                THEN rs.successful_lots::NUMERIC / rs.committed_deals * 15 ELSE 0 END
                + COALESCE(rs.payment_score, 0)
                + CASE WHEN COALESCE(rs.total_tons, 0) > 100 THEN 10
                       WHEN COALESCE(rs.total_tons, 0) >= 50 THEN 7
                       WHEN COALESCE(rs.total_tons, 0) > 0 THEN 4 ELSE 0 END)
            + LEAST(40, COALESCE(rv.avg_price_integrity, 0) / 5 * 15
                + COALESCE(rv.avg_punctuality_care, 0) / 5 * 15
                + COALESCE(rv.avg_transparency_attitude, 0) / 5 * 10)
            + CASE WHEN COALESCE(bc.verified_id, FALSE) THEN 5 ELSE 0 END
            + CASE WHEN COALESCE(bc.bank_guarantee, FALSE) THEN 10 ELSE 0 END
            + CASE WHEN COALESCE(bc.export_standard, FALSE) THEN 5 ELSE 0 END
        ) >= 65 THEN 'Verified Buyer'
        ELSE 'New Member'
    END AS tier,
    COALESCE(bc.verified_id, FALSE) AS verified_id,
    COALESCE(bc.bank_guarantee, FALSE) AS bank_guarantee,
    COALESCE(bc.export_standard, FALSE) AS export_standard
FROM public.profiles p
LEFT JOIN request_stats rs ON rs.business_id = p.id
LEFT JOIN review_stats rv ON rv.business_id = p.id
LEFT JOIN public.business_credentials bc ON bc.business_id = p.id
WHERE p.role = 'business' AND COALESCE(p.is_banned, FALSE) = FALSE;

GRANT SELECT ON public.business_reputation_scores TO authenticated;
