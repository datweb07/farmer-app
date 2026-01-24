// ============================================
// Prophet Predict Types
// ============================================
// Type definitions for salinity forecast data
// ============================================

export interface ProphetPredict {
  id: number;
  ngay: string; // Ngày đại diện (YYYY-MM-01) - chỉ để vẽ biểu đồ
  nam: number; // Năm
  thang: number; // Tháng (1-12)
  tinh: string;
  ten_tram: string;
  lon: number;
  lat: number;
  du_bao_man: number; // Độ mặn trung bình THÁNG
  lower_ci: number;
  upper_ci: number;
  he_so_vi_tri: number | null; // Có thể null
  created_at: string;
}

export interface FilterState {
  nam: number | null;
  thang: number | null; // Filter theo tháng
  tinh: string | null;
  ten_tram: string | null;
}
