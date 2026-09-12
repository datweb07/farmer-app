import { supabase } from "../supabase/supabase";
import type { LocationSelection, UserLocation } from "./types";

export async function getCurrentUserLocation(): Promise<{
  location: UserLocation | null;
  error?: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { location: null, error: "Chưa đăng nhập" };

  return getUserLocation(user.id);
}

export async function getUserLocation(userId: string): Promise<{
  location: UserLocation | null;
  error?: string;
}> {
  const { data, error } = await supabase
    .from("user_locations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { location: null, error: error.message };
  return { location: data };
}

export async function saveCurrentUserLocation(
  selection: LocationSelection,
): Promise<{ location: UserLocation | null; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { location: null, error: "Chưa đăng nhập" };

  const { data, error } = await supabase
    .from("user_locations")
    .upsert(
      {
        user_id: user.id,
        ...selection,
        dataset_version: "2025-03-01",
      } as never,
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) return { location: null, error: error.message };
  return { location: data };
}
