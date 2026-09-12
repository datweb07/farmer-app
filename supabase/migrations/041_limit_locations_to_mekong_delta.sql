-- Keep legacy rows readable, but only allow new/updated locations in the 13
-- provinces and municipality supported by this Mekong Delta application.
ALTER TABLE public.user_locations
  DROP CONSTRAINT IF EXISTS user_locations_mekong_delta_province_check;

ALTER TABLE public.user_locations
  ADD CONSTRAINT user_locations_mekong_delta_province_check
  CHECK (province_code IN (
    '80', '82', '83', '84', '86', '87', '89',
    '91', '92', '93', '94', '95', '96'
  )) NOT VALID;

