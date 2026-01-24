// ============================================
// Salinity Service
// ============================================
// Service for fetching salinity data from prophet_predict table
// ============================================

import { supabase } from "../supabase/supabase";

export interface SalinityAverageResult {
  averageSalinity: number | null;
  dataCount: number;
  error?: string;
}

/**
 * Fetch average salinity for a specific province and year
 * @param province Province name (e.g., "An Giang")
 * @param year Year to filter by (e.g., 2026)
 * @param month Optional month to filter by (1-12)
 * @returns Average salinity and data count
 */
export async function getSalinityAverage(
  province: string,
  year: number,
  month?: number,
): Promise<SalinityAverageResult> {
  try {
    let query = supabase
      .from("prophet_predict")
      .select("du_bao_man")
      .ilike("tinh", province) // Case-insensitive match
      .eq("nam", year);

    // Filter by month if provided
    if (month) {
      query = query.eq("thang", month);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching salinity data:", error);
      return {
        averageSalinity: null,
        dataCount: 0,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        averageSalinity: null,
        dataCount: 0,
      };
    }

    // Calculate average - explicitly type the reduce callback
    const total = data.reduce(
      (sum: number, item: { du_bao_man: number }) => sum + item.du_bao_man,
      0,
    );
    const average = total / data.length;

    return {
      averageSalinity: Number(average.toFixed(2)),
      dataCount: data.length,
    };
  } catch (error) {
    console.error("Exception fetching salinity data:", error);
    return {
      averageSalinity: null,
      dataCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch salinity data for a date range
 * @param province Province name
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Array of salinity predictions
 */
export async function getSalinityByDateRange(
  province: string,
  startDate: string,
  endDate: string,
) {
  try {
    const { data, error } = await supabase
      .from("prophet_predict")
      .select("*")
      .ilike("tinh", province)
      .gte("ngay", startDate)
      .lte("ngay", endDate)
      .order("ngay", { ascending: true });

    if (error) {
      console.error("Error fetching salinity by date range:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception fetching salinity by date range:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get current salinity (latest forecast) for a province
 * @param province Province name (e.g., "An Giang")
 * @returns Latest salinity forecast data
 */
export async function getCurrentSalinity(province: string) {
  try {
    const { data, error } = await supabase
      .from("prophet_predict")
      .select("*")
      .ilike("tinh", province)
      .order("ngay", { ascending: false })
      .limit(1)
      .single<{
        du_bao_man: number;
        ngay: string;
        ten_tram: string;
        lower_ci: number;
        upper_ci: number;
      }>();

    if (error) {
      console.error("Error fetching current salinity:", error);
      return {
        salinity: null,
        date: null,
        station: null,
        error: error.message,
      };
    }

    if (!data) {
      return {
        salinity: null,
        date: null,
        station: null,
      };
    }

    return {
      salinity: data.du_bao_man,
      date: data.ngay,
      station: data.ten_tram,
      lowerCi: data.lower_ci,
      upperCi: data.upper_ci,
      error: null,
    };
  } catch (error) {
    console.error("Exception fetching current salinity:", error);
    return {
      salinity: null,
      date: null,
      station: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get average salinity for current month
 * @param province Province name
 * @returns Average salinity for current month
 */
export async function getCurrentMonthSalinity(province: string) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const { data, error } = await supabase
      .from("prophet_predict")
      .select("du_bao_man, ngay, ten_tram")
      .ilike("tinh", province)
      .eq("nam", currentYear)
      .eq("thang", currentMonth)
      .order("ngay", { ascending: false })
      .returns<
        Array<{
          du_bao_man: number;
          ngay: string;
          ten_tram: string;
        }>
      >();

    if (error) {
      console.error("Error fetching current month salinity:", error);
      return {
        averageSalinity: null,
        latestSalinity: null,
        dataCount: 0,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        averageSalinity: null,
        latestSalinity: null,
        dataCount: 0,
      };
    }

    // Calculate average
    const total = data.reduce(
      (sum: number, item: { du_bao_man: number }) => sum + item.du_bao_man,
      0,
    );
    const average = total / data.length;

    return {
      averageSalinity: Number(average.toFixed(2)),
      latestSalinity: data[0].du_bao_man,
      latestDate: data[0].ngay,
      latestStation: data[0].ten_tram,
      dataCount: data.length,
    };
  } catch (error) {
    console.error("Exception fetching current month salinity:", error);
    return {
      averageSalinity: null,
      latestSalinity: null,
      dataCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user's province from profile
 * Falls back to "An Giang" if not set
 */
export function getUserProvince(profileProvince?: string | null): string {
  return profileProvince || "An Giang";
}
