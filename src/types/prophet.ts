// ============================================
// Prophet Predict Types
// ============================================
// Type definitions for salinity forecast data
// ============================================

export interface ProphetPredict {
  id: number;
  nam: number;
  tinh: string;
  ten_tram: string;
  lon: number;
  lat: number;
  du_bao_man: number;
  lower_ci: number;
  upper_ci: number;
  he_so_vi_tri: number;
  created_at: string;
}

export interface FilterState {
  nam: number | null;
  tinh: string | null;
  ten_tram: string | null;
}
