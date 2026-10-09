-- Lets the local provisioning script recover Auth users whose profile trigger
-- failed, without exposing auth.users or requiring listUsers().
CREATE OR REPLACE FUNCTION public.find_season_admin_auth_user(p_username TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF lower(p_username) NOT IN ('anhtuan', 'minhchau', 'dinhquang', 'bachduong', 'duongnghi') THEN
    RAISE EXCEPTION 'Username is not in the season admin allowlist';
  END IF;

  SELECT u.id
  INTO v_user_id
  FROM auth.users AS u
  WHERE lower(u.email) = lower(p_username) || '@example.com'
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.find_season_admin_auth_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_season_admin_auth_user(TEXT) TO service_role;
