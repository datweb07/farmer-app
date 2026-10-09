-- Optional GPS coordinates recorded for the location of a season supply or demand.
ALTER TABLE public.season_supplies
  ADD COLUMN IF NOT EXISTS farm_latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS farm_longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS farm_accuracy_m NUMERIC(10,2),
  ADD CONSTRAINT season_supplies_farm_latitude_range CHECK (farm_latitude IS NULL OR farm_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT season_supplies_farm_longitude_range CHECK (farm_longitude IS NULL OR farm_longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT season_supplies_farm_accuracy_nonnegative CHECK (farm_accuracy_m IS NULL OR farm_accuracy_m >= 0);

ALTER TABLE public.season_demands
  ADD COLUMN IF NOT EXISTS farm_latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS farm_longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS farm_accuracy_m NUMERIC(10,2),
  ADD CONSTRAINT season_demands_farm_latitude_range CHECK (farm_latitude IS NULL OR farm_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT season_demands_farm_longitude_range CHECK (farm_longitude IS NULL OR farm_longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT season_demands_farm_accuracy_nonnegative CHECK (farm_accuracy_m IS NULL OR farm_accuracy_m >= 0);
