// ============================================
// Filter Bar Component
// ============================================
// Provides filtering controls for salinity forecast data
// ============================================

import React from "react";
import type { ProphetPredict, FilterState } from "@/types/prophet";

interface FilterBarProps {
  data: ProphetPredict[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  data,
  filters,
  onFilterChange,
}) => {
  // Extract unique values for dropdowns
  const uniqueYears = Array.from(new Set(data.map((d) => d.nam))).sort();
  const uniqueMonths = Array.from(new Set(data.map((d) => d.thang))).sort();
  const uniqueProvinces = Array.from(new Set(data.map((d) => d.tinh))).sort();

  // Get stations based on selected province
  const availableStations = filters.tinh
    ? Array.from(
        new Set(
          data.filter((d) => d.tinh === filters.tinh).map((d) => d.ten_tram),
        ),
      ).sort()
    : Array.from(new Set(data.map((d) => d.ten_tram))).sort();

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      nam: e.target.value ? Number(e.target.value) : null,
    });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      thang: e.target.value ? Number(e.target.value) : null,
    });
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      tinh: e.target.value || null,
      ten_tram: null, // Reset station when province changes
    });
  };

  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      ten_tram: e.target.value || null,
    });
  };

  const handleReset = () => {
    onFilterChange({
      nam: null,
      thang: null,
      tinh: null,
      ten_tram: null,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Year Filter */}
        <div>
          <label
            htmlFor="year-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Năm
          </label>
          <select
            id="year-filter"
            value={filters.nam || ""}
            onChange={handleYearChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả năm</option>
            {uniqueYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <label
            htmlFor="month-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tháng
          </label>
          <select
            id="month-filter"
            value={filters.thang || ""}
            onChange={handleMonthChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả tháng</option>
            {uniqueMonths.map((month) => (
              <option key={month} value={month}>
                Tháng {month}
              </option>
            ))}
          </select>
        </div>

        {/* Province Filter */}
        <div>
          <label
            htmlFor="province-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tỉnh
          </label>
          <select
            id="province-filter"
            value={filters.tinh || ""}
            onChange={handleProvinceChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả tỉnh</option>
            {uniqueProvinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </div>

        {/* Station Filter */}
        <div>
          <label
            htmlFor="station-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Trạm đo
          </label>
          <select
            id="station-filter"
            value={filters.ten_tram || ""}
            onChange={handleStationChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={!filters.tinh && availableStations.length > 20}
          >
            <option value="">Tất cả trạm</option>
            {availableStations.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset Button */}
      <div className="mt-4">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
        >
          Đặt lại bộ lọc
        </button>
      </div>

      {/* Active Filters Display */}
      {(filters.nam || filters.thang || filters.tinh || filters.ten_tram) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.nam && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Năm: {filters.nam}
            </span>
          )}
          {filters.thang && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              Tháng: {filters.thang}
            </span>
          )}
          {filters.tinh && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Tỉnh: {filters.tinh}
            </span>
          )}
          {filters.ten_tram && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              Trạm: {filters.ten_tram}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
