import { useEffect, useState } from "react";
import { getCurrentUserLocation } from "../lib/location/location.service";
import type { UserLocation } from "../lib/location/types";

export function useSavedProfileLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUserLocation()
      .then((result) => {
        if (!active) return;
        setLocation(result.location);
        setError(Boolean(result.error));
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return { location, loading, error };
}

export function formatSavedProfileLocation(location: UserLocation | null) {
  if (!location) return "Chưa cập nhật khu vực";
  return [location.ward_name, location.district_name, location.province_name]
    .filter(Boolean)
    .join(", ");
}
