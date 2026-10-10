-- Keep the legacy province/commune values and add explicit district + address details.
ALTER TABLE public.season_supplies
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS address_detail TEXT;

ALTER TABLE public.season_demands
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS area_detail TEXT,
  ADD COLUMN IF NOT EXISTS address_detail TEXT;
