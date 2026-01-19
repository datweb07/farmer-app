// ============================================
// Salinity Table Component
// ============================================
// Tabular display of salinity forecast data with sorting
// ============================================

import React, { useState, useMemo } from "react";
import type { ProphetPredict } from "@/types/prophet";

interface SalinityTableProps {
  data: ProphetPredict[];
}

type SortField = "nam" | "tinh" | "ten_tram" | "du_bao_man" | "he_so_vi_tri";
type SortOrder = "asc" | "desc";

export const SalinityTable: React.FC<SalinityTableProps> = ({ data }) => {
  const [sortField, setSortField] = useState<SortField>("nam");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting logic
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue, "vi")
          : bValue.localeCompare(aValue, "vi");
      }

      // Handle number comparison
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [data, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortOrder === "asc" ? <span>↑</span> : <span>↓</span>;
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Bảng dữ liệu chi tiết
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          Không có dữ liệu để hiển thị
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 md:mb-4 gap-2">
        <h3 className="text-base md:text-lg font-semibold text-gray-800">
          Bảng dữ liệu chi tiết
        </h3>
        <span className="text-xs md:text-sm text-gray-600">
          Tổng số: <span className="font-semibold">{data.length}</span> bản ghi
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-3 md:mx-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort("nam")}
                className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Năm {getSortIcon("nam")}
                </div>
              </th>
              <th
                onClick={() => handleSort("tinh")}
                className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Tỉnh {getSortIcon("tinh")}
                </div>
              </th>
              <th
                onClick={() => handleSort("ten_tram")}
                className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Trạm đo {getSortIcon("ten_tram")}
                </div>
              </th>
              <th
                onClick={() => handleSort("du_bao_man")}
                className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Độ mặn (g/l) {getSortIcon("du_bao_man")}
                </div>
              </th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="hidden md:inline">Cận dưới (g/l)</span>
                <span className="md:hidden">C.Dưới</span>
              </th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="hidden md:inline">Cận trên (g/l)</span>
                <span className="md:hidden">C.Trên</span>
              </th>
              <th
                onClick={() => handleSort("he_so_vi_tri")}
                className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Hệ số vị trí {getSortIcon("he_so_vi_tri")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                  {row.nam}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-700">
                  {row.tinh}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-700">
                  {row.ten_tram}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-xs md:text-sm font-semibold">
                  <span
                    className={`${
                      row.du_bao_man < 1
                        ? "text-green-600"
                        : row.du_bao_man < 4
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {row.du_bao_man.toFixed(2)}
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-600">
                  {row.lower_ci.toFixed(2)}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-600">
                  {row.upper_ci.toFixed(2)}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-700">
                  {row.he_so_vi_tri.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 md:mt-4 flex flex-col md:flex-row items-center justify-between border-t border-gray-200 pt-3 md:pt-4 gap-3">
          <div className="text-xs md:text-sm text-gray-700 text-center md:text-left whitespace-nowrap">
            Hiển thị{" "}
            <span className="font-medium">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            đến{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, sortedData.length)}
            </span>{" "}
            trong tổng số{" "}
            <span className="font-medium">{sortedData.length}</span> bản ghi
          </div>

          <div className="flex gap-1 md:gap-2 flex-wrap justify-center">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 md:px-3 py-1 text-xs md:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-2 md:px-3 py-1 text-xs md:text-sm border rounded-md min-w-8 md:min-w-9 ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 md:px-3 py-1 text-xs md:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
