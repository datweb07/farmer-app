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
 * @returns Average salinity and data count
 */
export async function getSalinityAverage(
    province: string,
    year: number
): Promise<SalinityAverageResult> {
    try {
        const { data, error } = await supabase
            .from("prophet_predict")
            .select("du_bao_man")
            .ilike("tinh", province) // Case-insensitive match
            .eq("nam", year);

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
        const total = data.reduce((sum: number, item: { du_bao_man: number }) => sum + item.du_bao_man, 0);
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
 * Get user's province from profile
 * Falls back to "An Giang" if not set
 */
export function getUserProvince(profileProvince?: string | null): string {
    return profileProvince || "An Giang";
}
