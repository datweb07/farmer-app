// ============================================
// Salinity Page (Prophet Forecast)
// ============================================
// Main page for displaying salinity forecast data with filters, map, chart, and table
// ============================================

import { useState, useMemo } from "react";
import { useProphetPredict } from "@/hooks/useProphetPredict";
import { FilterBar } from "@/components/FilterBar";
import { SalinityChart } from "@/components/SalinityChart";
import { SalinityMap } from "@/components/SalinityMap";
import { SalinityTable } from "@/components/SalinityTable";
import { ComparisonCharts } from "@/components/ComparisonCharts";
import { TrendCharts } from "@/components/TrendCharts";
import type { FilterState } from "@/types/prophet";

export function SalinityPage() {
  const { data, loading, error, refetch } = useProphetPredict();
  const [filters, setFilters] = useState<FilterState>({
    nam: null,
    tinh: null,
    ten_tram: null,
  });

  // Apply filters to data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.nam && item.nam !== filters.nam) return false;
      if (filters.tinh && item.tinh !== filters.tinh) return false;
      if (filters.ten_tram && item.ten_tram !== filters.ten_tram) return false;
      return true;
    });
  }, [data, filters]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Đang tải dữ liệu dự báo độ mặn...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="shrink-0">
                <svg
                  className="h-6 w-6 text-red-600"
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
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
              Độ Mặn Dự Báo (Prophet Model)
            </h1>
            <p className="text-gray-600">
              Dự báo độ mặn nước mặt dựa trên mô hình Prophet
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">
                  Chưa có dữ liệu
                </h3>
                <p className="mt-2 text-sm text-yellow-700">
                  Hiện tại chưa có dữ liệu dự báo độ mặn trong hệ thống. Vui
                  lòng kiểm tra lại sau.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            Độ Mặn Dự Báo (Dựa trên mô hình Prophet)
          </h1>
          <p className="text-gray-600">
            Lưu ý: Mọi kết quả từ việc chạy mô hình và dự báo chỉ mang tính tham
            khảo. Đội ngũ phát triển không chịu trách nhiệm về bất kỳ thiệt hại
            nào phát sinh từ việc sử dụng dữ liệu này cho các quyết định pháp lý
            hay kỹ thuật quan trọng.
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

        {/* Statistics Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tổng số bản ghi</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredData.length}
            </p>
            {data.length !== filteredData.length && (
              <p className="text-xs text-gray-500 mt-1">
                Từ {data.length} tổng
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Năm dự báo</p>
            <p className="text-2xl font-bold text-green-600">
              {new Set(filteredData.map((d) => d.nam)).size} năm
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {Math.min(...filteredData.map((d) => d.nam))} -{" "}
              {Math.max(...filteredData.map((d) => d.nam))}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tỉnh/Thành phố</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(filteredData.map((d) => d.tinh)).size}
            </p>
            <p className="text-xs text-gray-500 mt-1">Trong vùng ĐBSCL</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Độ mặn TB</p>
            <p className="text-2xl font-bold text-orange-600">
              {(
                filteredData.reduce((sum, d) => sum + d.du_bao_man, 0) /
                filteredData.length
              ).toFixed(2)}{" "}
              g/l
            </p>
            <p className="text-xs text-gray-500 mt-1">Giá trị trung bình</p>
          </div>
        </div>

        {/* Main Content */}
        {/* Map Section */}
        <div className="mb-8">
          <SalinityMap data={filteredData} />
        </div>

        {/* Chart Section */}
        <div className="mb-8">
          <SalinityChart data={filteredData} />
        </div>

        {/* Trend Charts Section */}
        <div className="mb-8">
          <TrendCharts data={filteredData} />
        </div>

        {/* Comparison Charts */}
        <ComparisonCharts data={filteredData} />

        {/* Table Section */}
        <div className="mb-8">
          <SalinityTable data={filteredData} />
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-xl text-gray-900 mb-4">
              Về mô hình Prophet
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-gray-700">
                  Mô hình học máy do Facebook phát triển, chuyên dự báo chuỗi
                  thời gian
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-gray-700">
                  Độ chính xác cao với dữ liệu có tính mùa vụ và xu hướng rõ
                  ràng
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-gray-700">
                  Cung cấp khoảng tin cậy 95% cho mọi dự báo
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                  4
                </span>
                <p className="text-gray-700">
                  Tự động xử lý các giá trị ngoại lai và dữ liệu thiếu
                </p>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-xl text-gray-900 mb-4">
              Cách sử dụng dự báo
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">
                  Lập kế hoạch canh tác dựa trên xu hướng
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">
                  Chuẩn bị nguồn nước ngọt trước mùa khô
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">
                  Chọn giống cây phù hợp với dự báo
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">
                  So sánh giữa các năm để đánh giá xu hướng
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">
                  Sử dụng khoảng tin cậy để đánh giá rủi ro
                </p>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-xl text-gray-900 mb-4">
            Liên hệ hỗ trợ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Nghiên cứu khoa học</p>
              <p className="text-lg font-semibold text-blue-600">1800-1234</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Hỗ trợ kỹ thuật</p>
              <p className="text-lg font-semibold text-blue-600">1800-5678</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tư vấn nông nghiệp</p>
              <p className="text-lg font-semibold text-blue-600">1800-9999</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
