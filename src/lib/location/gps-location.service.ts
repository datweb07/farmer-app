import { supabase } from "../supabase/supabase";
import type { GpsCoordinates, UserGpsLocation } from "./types";

export async function getCurrentUserGpsLocation(): Promise<{
  location: UserGpsLocation | null;
  error?: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { location: null, error: "Chưa đăng nhập" };

  const { data, error } = await supabase
    .from("user_gps_locations")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { location: null, error: error.message };
  return { location: data };
}

export async function saveCurrentUserGpsLocation(
  coordinates: GpsCoordinates,
): Promise<{ location: UserGpsLocation | null; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { location: null, error: "Chưa đăng nhập" };

  const { data, error } = await supabase
    .from("user_gps_locations")
    .upsert(
      {
        user_id: user.id,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy_m: coordinates.accuracy,
        captured_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) return { location: null, error: error.message };
  return { location: data };
}
