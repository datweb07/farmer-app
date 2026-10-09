-- A scoped admin capability for season matching; it does not grant legacy admin access.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_manage_season_connections BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.has_season_connection_admin_access()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_admin IS TRUE OR p.can_manage_season_connections IS TRUE)
  );
$$;
REVOKE ALL ON FUNCTION public.has_season_connection_admin_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_season_connection_admin_access() TO authenticated;

-- Assign the restricted permission to these accounts if they already exist.
-- Provisioning script applies the same settings after creating missing Auth users.
UPDATE public.profiles
SET role = 'farmer', is_admin = FALSE, can_manage_season_connections = TRUE
WHERE lower(username) IN ('anhtuan', 'minhchau', 'dinhquang', 'bachduong', 'duongnghi');

-- Prevent users from granting themselves either admin capability via profile updates.
CREATE OR REPLACE FUNCTION public.protect_profile_admin_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin IS TRUE) THEN
    RETURN NEW;
  END IF;
  NEW.is_admin := OLD.is_admin;
  NEW.can_manage_season_connections := OLD.can_manage_season_connections;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_flags ON public.profiles;
CREATE TRIGGER protect_profile_admin_flags
BEFORE UPDATE OF is_admin, can_manage_season_connections ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_flags();

DROP POLICY IF EXISTS season_supplies_select ON public.season_supplies;
CREATE POLICY season_supplies_select ON public.season_supplies FOR SELECT TO authenticated USING (
    farmer_id = auth.uid()
    OR public.has_season_connection_admin_access()
    OR EXISTS (SELECT 1 FROM public.season_matches m WHERE m.supply_id = season_supplies.id AND (m.farmer_id = auth.uid() OR m.business_id = auth.uid()))
);

DROP POLICY IF EXISTS season_demands_select ON public.season_demands;
CREATE POLICY season_demands_select ON public.season_demands FOR SELECT TO authenticated USING (
    business_id = auth.uid()
    OR public.has_season_connection_admin_access()
    OR EXISTS (SELECT 1 FROM public.season_matches m WHERE m.demand_id = season_demands.id AND (m.farmer_id = auth.uid() OR m.business_id = auth.uid()))
);

DROP POLICY IF EXISTS season_matches_select ON public.season_matches;
CREATE POLICY season_matches_select ON public.season_matches FOR SELECT TO authenticated USING (
    farmer_id = auth.uid() OR business_id = auth.uid() OR public.has_season_connection_admin_access()
);

DROP POLICY IF EXISTS season_messages_select ON public.season_messages;
CREATE POLICY season_messages_select ON public.season_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (
      (m.status = 'connected' AND (m.farmer_id = auth.uid() OR m.business_id = auth.uid()))
      OR public.has_season_connection_admin_access()
    ))
);

DROP POLICY IF EXISTS season_proposals_select ON public.season_proposals;
CREATE POLICY season_proposals_select ON public.season_proposals FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.season_matches m WHERE m.id = match_id AND (
      m.farmer_id = auth.uid() OR m.business_id = auth.uid() OR public.has_season_connection_admin_access()
    ))
);

DROP POLICY IF EXISTS season_transactions_select ON public.season_transactions;
CREATE POLICY season_transactions_select ON public.season_transactions FOR SELECT TO authenticated USING (
    farmer_id = auth.uid() OR business_id = auth.uid() OR public.has_season_connection_admin_access()
);

CREATE OR REPLACE FUNCTION public.admin_invite_season_match(p_supply_id UUID, p_demand_id UUID, p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_supply public.season_supplies%ROWTYPE; v_demand public.season_demands%ROWTYPE; v_match UUID;
BEGIN
    IF NOT public.has_season_connection_admin_access() THEN RAISE EXCEPTION 'Chỉ quản trị viên Kết nối mùa vụ mới được mời ghép cặp'; END IF;
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
END;
$$;
REVOKE ALL ON FUNCTION public.admin_invite_season_match(UUID,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_invite_season_match(UUID,UUID,TEXT) TO authenticated;
