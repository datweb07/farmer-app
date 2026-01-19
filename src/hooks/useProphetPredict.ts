// ============================================
// Prophet Predict Hook
// ============================================
// Custom hook for fetching and managing salinity forecast data
// ============================================

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabase";
import type { ProphetPredict } from "@/types/prophet";

interface UseProphetPredictResult {
  data: ProphetPredict[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProphetPredict(): UseProphetPredictResult {
  const [data, setData] = useState<ProphetPredict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: predictions, error: fetchError } = await supabase
        .from("prophet_predict")
        .select("*")
        .order("nam", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setData(predictions || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch data";
      setError(errorMessage);
      console.error("Error fetching prophet predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
