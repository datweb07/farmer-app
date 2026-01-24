// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { useProphetPredict } from "@/hooks/useProphetPredict";
import { FilterBar } from "@/components/FilterBar";
import { SalinityChart } from "@/components/SalinityChart";
import { SalinityMap } from "@/components/SalinityMap";
import { SalinityTable } from "@/components/SalinityTable";
import { ComparisonCharts } from "@/components/ComparisonCharts";
import { TrendCharts } from "@/components/TrendCharts";
import { MobileSalinityView } from "../components/MobileSalinityView";
import type { FilterState } from "@/types/prophet";

// Hook phát hiện thiết bị di động tương tự như trong ProductsPage
function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

export function SalinityPage() {
  const { data, loading, error, refetch } = useProphetPredict();
  const isMobile = useIsMobile();

  const [filters, setFilters] = useState<FilterState>({
    nam: null,
    thang: null,
    tinh: null,
    ten_tram: null,
  });

  // Áp dụng bộ lọc vào dữ liệu (memoized)
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.nam && item.nam !== filters.nam) return false;
      if (filters.thang && item.thang !== filters.thang) return false;
      if (filters.tinh && item.tinh !== filters.tinh) return false;
      if (filters.ten_tram && item.ten_tram !== filters.ten_tram) return false;

      return true;
    });
  }, [data, filters]);

  // Xử lý trạng thái Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu dự báo độ mặn...</p>
        </div>
      </div>
    );
  }

  // Xử lý trạng thái Lỗi
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg w-full">
          <div className="flex items-start">
            <div className="shrink-0 text-red-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-red-800">
                Lỗi tải dữ liệu
              </h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={refetch}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MOBILE LAYOUT ====================
  if (isMobile) {
    return (
      <MobileSalinityView
        data={data}
        filteredData={filteredData}
        filters={filters}
        setFilters={setFilters}
        loading={loading}
        error={error}
        refetch={refetch}
      />
    );
  }

  // ==================== DESKTOP LAYOUT ====================
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            Độ Mặn Dự Báo (Dựa trên mô hình Prophet)
          </h1>
          <p className="text-sm text-gray-500 italic">
            Lưu ý: Mọi kết quả từ mô hình dự báo chỉ mang tính tham khảo.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8">
          <FilterBar
            data={data}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tổng bản ghi</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredData.length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Năm dự báo</p>
            <p className="text-2xl font-bold text-green-600">
              {new Set(filteredData.map((d) => d.nam)).size}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tỉnh/Thành phố</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(filteredData.map((d) => d.tinh)).size}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Độ mặn TB</p>
            <p className="text-2xl font-bold text-orange-600">
              {(
                filteredData.reduce((sum, d) => sum + d.du_bao_man, 0) /
                (filteredData.length || 1)
              ).toFixed(2)}{" "}
              g/l
            </p>
          </div>
        </div>

        {/* Visualizations Section */}
        <div className="space-y-8">
          <div className="bg-white border border-gray-200 rounded-lg p-1 overflow-hidden">
            <SalinityMap data={filteredData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-bold mb-4">Biểu đồ dự báo</h3>
              <SalinityChart data={filteredData} />
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-bold mb-4">Biểu đồ xu hướng</h3>
              <TrendCharts data={filteredData} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <ComparisonCharts data={filteredData} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <SalinityTable data={filteredData} />
          </div>
        </div>

        {/* Footer info/Support */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2">Hỗ trợ kỹ thuật</h3>
            <p>
              Mọi thắc mắc về dữ liệu dự báo, vui lòng liên hệ hotline:
              1800-1234
            </p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg border border-green-100">
            <h3 className="font-bold text-green-800 mb-2">Mô hình Prophet</h3>
            <p>Mô hình được tối ưu hóa cho dữ liệu mùa vụ vùng ĐBSCL.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
