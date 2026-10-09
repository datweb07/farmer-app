-- Expose only the global success count and public transaction codes to signed-in
-- users. Participant IDs and contract terms remain protected by table RLS.
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
          'confirmed_at', t.confirmed_at
        ) ORDER BY t.confirmed_at DESC
      )
      FROM public.season_transactions AS t
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_season_transaction_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_season_transaction_summary() TO authenticated;
