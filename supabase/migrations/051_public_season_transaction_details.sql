-- Authenticated users can open the completed transaction cards on Home.
-- Return only finalized deal information; never expose messages, drafts or GPS.
CREATE OR REPLACE FUNCTION public.get_public_season_transaction_summary()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'total_matches', (SELECT count(*) FROM public.season_matches),
    'transactions', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'transaction_code', t.transaction_code,
          'confirmed_at', t.confirmed_at,
          'quantity_tons', t.quantity_tons,
          'farmer_username', farmer.username,
          'business_username', business.username,
          'crop_name', proposal.crop_name,
          'variety', supply.variety,
          'supply_location', concat_ws(', ', supply.commune, supply.province),
          'demand_location', concat_ws(', ', demand.commune, demand.province),
          'price_mode', proposal.price_mode,
          'price_per_kg', proposal.price_per_kg,
          'quality_standard', proposal.quality_standard,
          'delivery_date', proposal.delivery_date,
          'delivery_location', proposal.delivery_location,
          'payment_terms', proposal.payment_terms,
          'other_terms', proposal.other_terms
        ) ORDER BY t.confirmed_at DESC
      )
      FROM public.season_transactions AS t
      JOIN public.profiles AS farmer ON farmer.id = t.farmer_id
      JOIN public.profiles AS business ON business.id = t.business_id
      JOIN public.season_supplies AS supply ON supply.id = t.supply_id
      JOIN public.season_demands AS demand ON demand.id = t.demand_id
      JOIN public.season_proposals AS proposal ON proposal.id = t.proposal_id
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_season_transaction_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_season_transaction_summary() TO authenticated;
