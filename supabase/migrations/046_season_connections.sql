-- Kết nối mùa vụ: farmer supply, business demand, admin matching, chat,
-- versioned offers and a transaction only after both parties accept the same version.

CREATE TABLE IF NOT EXISTS public.season_supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL CHECK (length(trim(crop_name)) BETWEEN 2 AND 120),
    variety TEXT,
    province TEXT NOT NULL,
    commune TEXT,
    area_detail TEXT,
    harvest_start DATE NOT NULL,
    harvest_end DATE NOT NULL,
    estimated_tons NUMERIC(12,3) NOT NULL CHECK (estimated_tons > 0),
    sellable_tons NUMERIC(12,3) NOT NULL CHECK (sellable_tons > 0),
    quantity_is_estimated BOOLEAN NOT NULL DEFAULT TRUE,
    quality_standard TEXT,
    delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('at_farm', 'collection_point', 'transport_help')),
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (harvest_end >= harvest_start),
    CHECK (sellable_tons <= estimated_tons)
);

CREATE TABLE IF NOT EXISTS public.season_demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL CHECK (length(trim(crop_name)) BETWEEN 2 AND 120),
    variety TEXT,
    desired_tons NUMERIC(12,3) NOT NULL CHECK (desired_tons > 0),
    province TEXT NOT NULL,
    commune TEXT,
    needed_start DATE NOT NULL,
    needed_end DATE NOT NULL,
    quality_standard TEXT,
    price_mode TEXT NOT NULL DEFAULT 'negotiable' CHECK (price_mode IN ('fixed', 'negotiable')),
    price_per_kg NUMERIC(14,2) CHECK (price_per_kg IS NULL OR price_per_kg > 0),
    delivery_terms TEXT,
    payment_terms TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (needed_end >= needed_start),
    CHECK ((price_mode = 'fixed' AND price_per_kg IS NOT NULL) OR price_mode = 'negotiable')
);

CREATE TABLE IF NOT EXISTS public.season_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supply_id UUID NOT NULL REFERENCES public.season_supplies(id) ON DELETE CASCADE,
    demand_id UUID NOT NULL REFERENCES public.season_demands(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL CHECK (length(trim(reason)) >= 10),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'connected', 'declined')),
    farmer_response TEXT NOT NULL DEFAULT 'pending' CHECK (farmer_response IN ('pending', 'interested', 'declined')),
    business_response TEXT NOT NULL DEFAULT 'pending' CHECK (business_response IN ('pending', 'interested', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (supply_id, demand_id)
);

CREATE TABLE IF NOT EXISTS public.season_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.season_matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.season_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.season_matches(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    quantity_tons NUMERIC(12,3) NOT NULL CHECK (quantity_tons > 0),
    price_mode TEXT NOT NULL CHECK (price_mode IN ('fixed', 'negotiable')),
    price_per_kg NUMERIC(14,2) CHECK (price_per_kg IS NULL OR price_per_kg > 0),
    quality_standard TEXT,
    delivery_date DATE NOT NULL,
    delivery_location TEXT NOT NULL,
    payment_terms TEXT NOT NULL,
    other_terms TEXT,
    farmer_confirmed_at TIMESTAMPTZ,
    business_confirmed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'superseded', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (match_id, version)
);

CREATE TABLE IF NOT EXISTS public.season_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL UNIQUE REFERENCES public.season_matches(id) ON DELETE RESTRICT,
    proposal_id UUID NOT NULL UNIQUE REFERENCES public.season_proposals(id) ON DELETE RESTRICT,
    transaction_code TEXT NOT NULL UNIQUE,
    farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    supply_id UUID NOT NULL REFERENCES public.season_supplies(id) ON DELETE RESTRICT,
    demand_id UUID NOT NULL REFERENCES public.season_demands(id) ON DELETE RESTRICT,
    quantity_tons NUMERIC(12,3) NOT NULL CHECK (quantity_tons > 0),
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.season_transaction_code_seq START 1;

CREATE INDEX IF NOT EXISTS season_supplies_owner_idx ON public.season_supplies(farmer_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS season_demands_owner_idx ON public.season_demands(business_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS season_matches_farmer_idx ON public.season_matches(farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS season_matches_business_idx ON public.season_matches(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS season_messages_match_idx ON public.season_messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS season_proposals_match_idx ON public.season_proposals(match_id, version DESC);
CREATE INDEX IF NOT EXISTS season_transactions_supply_idx ON public.season_transactions(supply_id);
CREATE INDEX IF NOT EXISTS season_transactions_demand_idx ON public.season_transactions(demand_id);

CREATE OR REPLACE FUNCTION public.touch_season_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS season_supplies_touch_updated_at ON public.season_supplies;
CREATE TRIGGER season_supplies_touch_updated_at BEFORE UPDATE ON public.season_supplies
FOR EACH ROW EXECUTE FUNCTION public.touch_season_updated_at();
DROP TRIGGER IF EXISTS season_demands_touch_updated_at ON public.season_demands;
CREATE TRIGGER season_demands_touch_updated_at BEFORE UPDATE ON public.season_demands
FOR EACH ROW EXECUTE FUNCTION public.touch_season_updated_at();
DROP TRIGGER IF EXISTS season_matches_touch_updated_at ON public.season_matches;
CREATE TRIGGER season_matches_touch_updated_at BEFORE UPDATE ON public.season_matches
FOR EACH ROW EXECUTE FUNCTION public.touch_season_updated_at();

ALTER TABLE public.season_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS season_supplies_select ON public.season_supplies;
CREATE POLICY season_supplies_select ON public.season_supplies FOR SELECT TO authenticated USING (
    farmer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
    OR EXISTS (SELECT 1 FROM public.season_matches m WHERE m.supply_id = season_supplies.id AND (m.farmer_id = auth.uid() OR m.business_id = auth.uid()))
);
DROP POLICY IF EXISTS season_supplies_insert ON public.season_supplies;
CREATE POLICY season_supplies_insert ON public.season_supplies FOR INSERT TO authenticated WITH CHECK (
    farmer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'farmer')
);
DROP POLICY IF EXISTS season_supplies_update ON public.season_supplies;
CREATE POLICY season_supplies_update ON public.season_supplies FOR UPDATE TO authenticated USING (farmer_id = auth.uid()) WITH CHECK (farmer_id = auth.uid());
DROP POLICY IF EXISTS season_supplies_delete ON public.season_supplies;
CREATE POLICY season_supplies_delete ON public.season_supplies FOR DELETE TO authenticated USING (farmer_id = auth.uid());

DROP POLICY IF EXISTS season_demands_select ON public.season_demands;
CREATE POLICY season_demands_select ON public.season_demands FOR SELECT TO authenticated USING (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
    OR EXISTS (SELECT 1 FROM public.season_matches m WHERE m.demand_id = season_demands.id AND (m.farmer_id = auth.uid() OR m.business_id = auth.uid()))
);
DROP POLICY IF EXISTS season_demands_insert ON public.season_demands;
CREATE POLICY season_demands_insert ON public.season_demands FOR INSERT TO authenticated WITH CHECK (
    business_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'business')
);
DROP POLICY IF EXISTS season_demands_update ON public.season_demands;
CREATE POLICY season_demands_update ON public.season_demands FOR UPDATE TO authenticated USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());
DROP POLICY IF EXISTS season_demands_delete ON public.season_demands;
CREATE POLICY season_demands_delete ON public.season_demands FOR DELETE TO authenticated USING (business_id = auth.uid());

DROP POLICY IF EXISTS season_matches_select ON public.season_matches;
CREATE POLICY season_matches_select ON public.season_matches FOR SELECT TO authenticated USING (
    farmer_id = auth.uid() OR business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
);
DROP POLICY IF EXISTS season_messages_select ON public.season_messages;
CREATE POLICY season_messages_select ON public.season_messages FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (
            (m.status = 'connected' AND (m.farmer_id = auth.uid() OR m.business_id = auth.uid()))
            OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
        )
    )
);
DROP POLICY IF EXISTS season_proposals_select ON public.season_proposals;
CREATE POLICY season_proposals_select ON public.season_proposals FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (m.farmer_id = auth.uid() OR m.business_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)))
);
DROP POLICY IF EXISTS season_transactions_select ON public.season_transactions;
CREATE POLICY season_transactions_select ON public.season_transactions FOR SELECT TO authenticated USING (
    farmer_id = auth.uid() OR business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.season_supplies, public.season_demands TO authenticated;
GRANT SELECT ON public.season_matches, public.season_messages, public.season_proposals, public.season_transactions TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_invite_season_match(p_supply_id UUID, p_demand_id UUID, p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_supply public.season_supplies%ROWTYPE; v_demand public.season_demands%ROWTYPE; v_match UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin) THEN RAISE EXCEPTION 'Chỉ admin mới được mời kết nối'; END IF;
    SELECT * INTO v_supply FROM public.season_supplies WHERE id = p_supply_id AND status = 'open';
    SELECT * INTO v_demand FROM public.season_demands WHERE id = p_demand_id AND status = 'open';
    IF v_supply.id IS NULL OR v_demand.id IS NULL THEN RAISE EXCEPTION 'Nguồn cung hoặc nhu cầu không còn mở'; END IF;
    IF lower(trim(v_supply.crop_name)) <> lower(trim(v_demand.crop_name)) THEN RAISE EXCEPTION 'Mặt hàng chưa phù hợp'; END IF;
    INSERT INTO public.season_matches(supply_id,demand_id,farmer_id,business_id,admin_id,reason)
    VALUES (v_supply.id,v_demand.id,v_supply.farmer_id,v_demand.business_id,auth.uid(),trim(p_reason))
    RETURNING id INTO v_match;
    INSERT INTO public.notifications(user_id,type,title,message,link,actor_id,metadata)
    VALUES
      (v_supply.farmer_id,'SEASON_CONNECTION','Lời mời kết nối mùa vụ',trim(p_reason),'/connections',auth.uid(),jsonb_build_object('match_id',v_match)),
      (v_demand.business_id,'SEASON_CONNECTION','Lời mời kết nối mùa vụ',trim(p_reason),'/connections',auth.uid(),jsonb_build_object('match_id',v_match));
    RETURN v_match;
END; $$;

CREATE OR REPLACE FUNCTION public.respond_to_season_match(p_match_id UUID, p_response TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_match public.season_matches%ROWTYPE; v_role TEXT; v_status TEXT;
BEGIN
    IF p_response NOT IN ('interested','declined') THEN RAISE EXCEPTION 'Phản hồi không hợp lệ'; END IF;
    SELECT * INTO v_match FROM public.season_matches WHERE id = p_match_id FOR UPDATE;
    IF v_match.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy lời mời'; END IF;
    IF v_match.status <> 'invited' THEN RAISE EXCEPTION 'Lời mời này đã được xử lý'; END IF;
    IF auth.uid() = v_match.farmer_id THEN v_role := 'farmer';
    ELSIF auth.uid() = v_match.business_id THEN v_role := 'business';
    ELSE RAISE EXCEPTION 'Bạn không phải người tham gia lời mời này'; END IF;
    IF v_role = 'farmer' THEN UPDATE public.season_matches SET farmer_response = p_response WHERE id = p_match_id;
    ELSE UPDATE public.season_matches SET business_response = p_response WHERE id = p_match_id; END IF;
    SELECT * INTO v_match FROM public.season_matches WHERE id = p_match_id;
    v_status := CASE WHEN v_match.farmer_response = 'declined' OR v_match.business_response = 'declined' THEN 'declined'
                     WHEN v_match.farmer_response = 'interested' AND v_match.business_response = 'interested' THEN 'connected'
                     ELSE 'invited' END;
    UPDATE public.season_matches SET status = v_status WHERE id = p_match_id;
    INSERT INTO public.notifications(user_id,type,title,message,link,actor_id,metadata)
    VALUES (CASE WHEN v_role='farmer' THEN v_match.business_id ELSE v_match.farmer_id END,
      'SEASON_CONNECTION','Phản hồi lời mời kết nối',
      CASE WHEN p_response='interested' THEN 'Đối tác đã quan tâm kết nối mùa vụ.' ELSE 'Đối tác đã từ chối lời mời kết nối.' END,
      '/connections',auth.uid(),jsonb_build_object('match_id',p_match_id));
    RETURN v_status;
END; $$;

CREATE OR REPLACE FUNCTION public.send_season_message(p_match_id UUID, p_body TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_message UUID; v_match public.season_matches%ROWTYPE; v_recipient UUID;
BEGIN
    IF length(trim(p_body)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Tin nhắn cần từ 1 đến 4000 ký tự'; END IF;
    SELECT * INTO v_match FROM public.season_matches WHERE id=p_match_id AND status='connected';
    IF v_match.id IS NULL OR auth.uid() NOT IN (v_match.farmer_id,v_match.business_id) THEN RAISE EXCEPTION 'Trao đổi chỉ mở cho hai bên sau khi cùng đồng ý'; END IF;
    INSERT INTO public.season_messages(match_id,sender_id,body) VALUES (p_match_id,auth.uid(),trim(p_body)) RETURNING id INTO v_message;
    v_recipient := CASE WHEN auth.uid()=v_match.farmer_id THEN v_match.business_id ELSE v_match.farmer_id END;
    INSERT INTO public.notifications(user_id,type,title,message,link,actor_id,metadata)
    VALUES(v_recipient,'SEASON_CONNECTION','Tin nhắn mới trong hồ sơ mùa vụ',left(trim(p_body),180),'/connections',auth.uid(),jsonb_build_object('match_id',p_match_id));
    RETURN v_message;
END; $$;

CREATE OR REPLACE FUNCTION public.create_season_proposal(p_match_id UUID, p_terms JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_match public.season_matches%ROWTYPE; v_role TEXT; v_version INTEGER; v_id UUID; v_price NUMERIC;
BEGIN
    SELECT * INTO v_match FROM public.season_matches WHERE id=p_match_id FOR UPDATE;
    IF v_match.id IS NULL OR v_match.status <> 'connected' THEN RAISE EXCEPTION 'Hồ sơ chưa mở thương lượng'; END IF;
    IF auth.uid()=v_match.farmer_id THEN v_role:='farmer'; ELSIF auth.uid()=v_match.business_id THEN v_role:='business'; ELSE RAISE EXCEPTION 'Bạn không tham gia hồ sơ này'; END IF;
    IF EXISTS (SELECT 1 FROM public.season_transactions WHERE match_id=p_match_id) THEN RAISE EXCEPTION 'Giao dịch đã được chốt'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.season_supplies WHERE id=v_match.supply_id AND status='open') OR NOT EXISTS (SELECT 1 FROM public.season_demands WHERE id=v_match.demand_id AND status='open') THEN RAISE EXCEPTION 'Nguồn cung hoặc nhu cầu đã đóng'; END IF;
    IF coalesce(trim(p_terms->>'crop_name'),'')='' OR coalesce((p_terms->>'quantity_tons')::NUMERIC,0)<=0 OR coalesce(trim(p_terms->>'delivery_date'),'')='' OR coalesce(trim(p_terms->>'delivery_location'),'')='' OR coalesce(trim(p_terms->>'payment_terms'),'')='' THEN RAISE EXCEPTION 'Vui lòng điền đủ điều kiện mua bán'; END IF;
    v_price := nullif(p_terms->>'price_per_kg','')::NUMERIC;
    IF coalesce(p_terms->>'price_mode','') NOT IN ('fixed','negotiable') OR (p_terms->>'price_mode'='fixed' AND coalesce(v_price,0)<=0) THEN RAISE EXCEPTION 'Giá hoặc cách thỏa thuận giá chưa hợp lệ'; END IF;
    UPDATE public.season_proposals SET status='superseded' WHERE match_id=p_match_id AND status='pending';
    SELECT coalesce(max(version),0)+1 INTO v_version FROM public.season_proposals WHERE match_id=p_match_id;
    INSERT INTO public.season_proposals(match_id,version,created_by,crop_name,quantity_tons,price_mode,price_per_kg,quality_standard,delivery_date,delivery_location,payment_terms,other_terms,farmer_confirmed_at,business_confirmed_at)
    VALUES(p_match_id,v_version,auth.uid(),trim(p_terms->>'crop_name'),(p_terms->>'quantity_tons')::NUMERIC,p_terms->>'price_mode',v_price,nullif(trim(p_terms->>'quality_standard'),''),(p_terms->>'delivery_date')::DATE,trim(p_terms->>'delivery_location'),trim(p_terms->>'payment_terms'),nullif(trim(p_terms->>'other_terms'),''),CASE WHEN v_role='farmer' THEN now() END,CASE WHEN v_role='business' THEN now() END)
    RETURNING id INTO v_id;
    INSERT INTO public.notifications(user_id,type,title,message,link,actor_id,metadata)
    VALUES(CASE WHEN v_role='farmer' THEN v_match.business_id ELSE v_match.farmer_id END,'SEASON_CONNECTION','Phiếu thỏa thuận mới',format('Đối tác gửi Phiếu thỏa thuận v%s, vui lòng xem và phản hồi.',v_version),'/connections',auth.uid(),jsonb_build_object('match_id',p_match_id,'proposal_id',v_id));
    RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.confirm_season_proposal(p_proposal_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_proposal public.season_proposals%ROWTYPE; v_match public.season_matches%ROWTYPE; v_supply public.season_supplies%ROWTYPE; v_demand public.season_demands%ROWTYPE; v_tx UUID; v_code TEXT; v_supply_used NUMERIC; v_demand_used NUMERIC;
BEGIN
    SELECT * INTO v_proposal FROM public.season_proposals WHERE id=p_proposal_id;
    IF v_proposal.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy phiếu thỏa thuận'; END IF;
    SELECT * INTO v_match FROM public.season_matches WHERE id=v_proposal.match_id FOR UPDATE;
    SELECT * INTO v_proposal FROM public.season_proposals WHERE id=p_proposal_id FOR UPDATE;
    IF v_proposal.status <> 'pending' OR EXISTS(SELECT 1 FROM public.season_proposals WHERE match_id=v_match.id AND version>v_proposal.version AND status='pending') THEN RAISE EXCEPTION 'Phiếu này không còn là phiên bản hiện hành'; END IF;
    IF EXISTS (SELECT 1 FROM public.season_transactions WHERE match_id=v_match.id) THEN RAISE EXCEPTION 'Giao dịch đã được ghi nhận'; END IF;
    IF auth.uid()=v_match.farmer_id THEN UPDATE public.season_proposals SET farmer_confirmed_at=coalesce(farmer_confirmed_at,now()) WHERE id=p_proposal_id;
    ELSIF auth.uid()=v_match.business_id THEN UPDATE public.season_proposals SET business_confirmed_at=coalesce(business_confirmed_at,now()) WHERE id=p_proposal_id;
    ELSE RAISE EXCEPTION 'Bạn không tham gia hồ sơ này'; END IF;
    SELECT * INTO v_proposal FROM public.season_proposals WHERE id=p_proposal_id;
    IF v_proposal.farmer_confirmed_at IS NOT NULL AND v_proposal.business_confirmed_at IS NOT NULL THEN
        SELECT * INTO v_supply FROM public.season_supplies WHERE id=v_match.supply_id FOR UPDATE;
        SELECT * INTO v_demand FROM public.season_demands WHERE id=v_match.demand_id FOR UPDATE;
        IF v_supply.status <> 'open' OR v_demand.status <> 'open' THEN RAISE EXCEPTION 'Nguồn cung hoặc nhu cầu đã đóng, không thể xác nhận phiếu'; END IF;
        SELECT coalesce(sum(quantity_tons),0) INTO v_supply_used FROM public.season_transactions WHERE supply_id=v_supply.id;
        SELECT coalesce(sum(quantity_tons),0) INTO v_demand_used FROM public.season_transactions WHERE demand_id=v_demand.id;
        IF v_proposal.quantity_tons > v_supply.sellable_tons-v_supply_used THEN RAISE EXCEPTION 'Sản lượng còn lại của nguồn cung không đủ cho phiếu này'; END IF;
        IF v_proposal.quantity_tons > v_demand.desired_tons-v_demand_used THEN RAISE EXCEPTION 'Sản lượng của phiếu vượt nhu cầu còn lại'; END IF;
        UPDATE public.season_proposals SET status='accepted' WHERE id=p_proposal_id;
        v_code := format('GD-MV-%s-%s',to_char(current_date,'YYYY'),lpad(nextval('public.season_transaction_code_seq')::TEXT,3,'0'));
        INSERT INTO public.season_transactions(match_id,proposal_id,transaction_code,farmer_id,business_id,supply_id,demand_id,quantity_tons)
        VALUES(v_match.id,p_proposal_id,v_code,v_match.farmer_id,v_match.business_id,v_match.supply_id,v_match.demand_id,v_proposal.quantity_tons) RETURNING id INTO v_tx;
        IF v_supply_used+v_proposal.quantity_tons >= v_supply.sellable_tons THEN UPDATE public.season_supplies SET status='closed' WHERE id=v_supply.id; END IF;
        IF v_demand_used+v_proposal.quantity_tons >= v_demand.desired_tons THEN UPDATE public.season_demands SET status='closed' WHERE id=v_demand.id; END IF;
        INSERT INTO public.notifications(user_id,type,title,message,link,actor_id,metadata)
        VALUES(v_match.farmer_id,'SEASON_CONNECTION','Hai bên đã chốt giao dịch',format('Giao dịch %s đã được ghi nhận trên Phiếu v%s.',v_code,v_proposal.version),'/connections',auth.uid(),jsonb_build_object('match_id',v_match.id,'transaction_code',v_code)),
              (v_match.business_id,'SEASON_CONNECTION','Hai bên đã chốt giao dịch',format('Giao dịch %s đã được ghi nhận trên Phiếu v%s.',v_code,v_proposal.version),'/connections',auth.uid(),jsonb_build_object('match_id',v_match.id,'transaction_code',v_code));
        RETURN v_tx;
    END IF;
    INSERT INTO public.notifications(user_id,type,title,message,link,actor_id,metadata)
    VALUES(CASE WHEN auth.uid()=v_match.farmer_id THEN v_match.business_id ELSE v_match.farmer_id END,'SEASON_CONNECTION','Đối tác xác nhận phiếu',format('Đối tác đã xác nhận Phiếu thỏa thuận v%s.',v_proposal.version),'/connections',auth.uid(),jsonb_build_object('match_id',v_match.id,'proposal_id',p_proposal_id));
    RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_season_proposal(p_proposal_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_proposal public.season_proposals%ROWTYPE; v_match public.season_matches%ROWTYPE; v_recipient UUID;
BEGIN
    SELECT * INTO v_proposal FROM public.season_proposals WHERE id=p_proposal_id;
    IF v_proposal.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy phiếu thỏa thuận'; END IF;
    SELECT * INTO v_match FROM public.season_matches WHERE id=v_proposal.match_id FOR UPDATE;
    SELECT * INTO v_proposal FROM public.season_proposals WHERE id=p_proposal_id FOR UPDATE;
    IF v_proposal.status <> 'pending' THEN RAISE EXCEPTION 'Phiếu này không còn hiệu lực'; END IF;
    IF auth.uid() NOT IN (v_match.farmer_id,v_match.business_id) THEN RAISE EXCEPTION 'Bạn không tham gia hồ sơ này'; END IF;
    IF EXISTS (SELECT 1 FROM public.season_transactions WHERE match_id=v_match.id) THEN RAISE EXCEPTION 'Giao dịch đã được ghi nhận'; END IF;
    UPDATE public.season_proposals SET status='rejected' WHERE id=p_proposal_id;
    v_recipient := CASE WHEN auth.uid()=v_match.farmer_id THEN v_match.business_id ELSE v_match.farmer_id END;
    INSERT INTO public.notifications(user_id,type,title,message,link,actor_id,metadata)
    VALUES(v_recipient,'SEASON_CONNECTION','Phiếu thỏa thuận bị từ chối',format('Đối tác đã từ chối Phiếu thỏa thuận v%s. Hai bên có thể tiếp tục trao đổi hoặc tạo phiên bản mới.',v_proposal.version),'/connections',auth.uid(),jsonb_build_object('match_id',v_match.id,'proposal_id',p_proposal_id));
    RETURN 'rejected';
END; $$;

REVOKE ALL ON FUNCTION public.admin_invite_season_match(UUID,UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_season_match(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_season_message(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_season_proposal(UUID,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_season_proposal(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_season_proposal(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_invite_season_match(UUID,UUID,TEXT), public.respond_to_season_match(UUID,TEXT), public.send_season_message(UUID,TEXT), public.create_season_proposal(UUID,JSONB), public.confirm_season_proposal(UUID), public.reject_season_proposal(UUID) TO authenticated;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'POST_LIKE','POST_COMMENT','COMMENT_REPLY','POST_SHARE','PROJECT_INVESTMENT','PROJECT_RATING',
    'PRODUCT_VIEW_MILESTONE','FOLLOW','MENTION','POST_APPROVED','PRODUCT_APPROVED','PROJECT_APPROVED',
    'PROFILE_LOCATION_UPDATED','PROCUREMENT_REQUEST','PROCUREMENT_COMPLETED','BUSINESS_REVIEW_RECEIVED',
    'SEASON_CONNECTION'
));
