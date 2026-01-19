// ============================================
// Salinity Chart Component
// ============================================
// Line chart with confidence interval band for salinity forecast
// ============================================

import React, { useMemo } from "react";
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import type { ProphetPredict } from "@/types/prophet";

interface SalinityChartProps {
  data: ProphetPredict[];
}

export const SalinityChart: React.FC<SalinityChartProps> = ({ data }) => {
  // Transform and aggregate data for chart
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    // Group by year and calculate averages
    const yearGroups = data.reduce(
      (acc, item) => {
        if (!acc[item.nam]) {
          acc[item.nam] = {
            nam: item.nam,
            values: [],
            lowerCIs: [],
            upperCIs: [],
          };
        }
        acc[item.nam].values.push(item.du_bao_man);
        acc[item.nam].lowerCIs.push(item.lower_ci);
        acc[item.nam].upperCIs.push(item.upper_ci);
        return acc;
      },
      {} as Record<
        number,
        {
          nam: number;
          values: number[];
          lowerCIs: number[];
          upperCIs: number[];
        }
      >,
    );

    return Object.values(yearGroups)
      .map((group) => ({
        nam: group.nam,
        du_bao_man: Number(
          (
            group.values.reduce((a, b) => a + b, 0) / group.values.length
          ).toFixed(2),
        ),
        lower_ci: Number(
          (
            group.lowerCIs.reduce((a, b) => a + b, 0) / group.lowerCIs.length
          ).toFixed(2),
        ),
        upper_ci: Number(
          (
            group.upperCIs.reduce((a, b) => a + b, 0) / group.upperCIs.length
          ).toFixed(2),
        ),
      }))
      .sort((a, b) => a.nam - b.nam);
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Biểu đồ độ mặn theo năm
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Không có dữ liệu để hiển thị
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">
        Biểu đồ độ mặn theo năm
      </h3>
      <ResponsiveContainer width="100%" height={300} className="md:h-[400px]">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          className="md:!mt-5 md:!mr-[30px] md:!ml-5 md:!mb-5"
        >
          <defs>
            <linearGradient id="colorCI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="nam"
            label={{ value: "Năm", position: "insideBottom", offset: -10 }}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            className="text-xs md:text-sm"
          />

          <YAxis
            label={{
              value: "Độ mặn (g/l)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11 },
            }}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            width={40}
            className="text-xs md:text-sm"
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              fontSize: "12px",
              padding: "8px",
            }}
            formatter={(value: number | undefined) =>
              value ? [`${value.toFixed(2)} g/l`, ""] : ["", ""]
            }
            labelFormatter={(label) => `Năm ${label}`}
          />

          <Legend
            wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }}
            iconSize={10}
            formatter={(value) => {
              const labels: Record<string, string> = {
                du_bao_man: "Độ mặn dự báo",
                lower_ci: "Cận dưới (95% CI)",
                upper_ci: "Cận trên (95% CI)",
              };
              return labels[value] || value;
            }}
          />

          {/* Confidence Interval Band */}
          <Area
            type="monotone"
            dataKey="upper_ci"
            stroke="none"
            fill="url(#colorCI)"
            name="upper_ci"
          />
          <Area
            type="monotone"
            dataKey="lower_ci"
            stroke="none"
            fill="#fff"
            name="lower_ci"
          />

          {/* Main forecast line */}
          <Line
            type="monotone"
            dataKey="du_bao_man"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: "#2563eb", r: 4 }}
            activeDot={{ r: 6 }}
            name="du_bao_man"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary Statistics */}
      <div className="mt-4 md:mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="text-center p-2 md:p-3 bg-blue-50 rounded-lg">
          <div className="text-xs md:text-sm text-gray-600">Trung bình</div>
          <div className="text-sm md:text-lg font-semibold text-blue-700">
            {(
              chartData.reduce((sum, d) => sum + d.du_bao_man, 0) /
              chartData.length
            ).toFixed(2)}{" "}
            g/l
          </div>
        </div>
        <div className="text-center p-2 md:p-3 bg-green-50 rounded-lg">
          <div className="text-xs md:text-sm text-gray-600">Thấp nhất</div>
          <div className="text-sm md:text-lg font-semibold text-green-700">
            {Math.min(...chartData.map((d) => d.du_bao_man)).toFixed(2)} g/l
          </div>
        </div>
        <div className="text-center p-2 md:p-3 bg-red-50 rounded-lg">
          <div className="text-xs md:text-sm text-gray-600">Cao nhất</div>
          <div className="text-sm md:text-lg font-semibold text-red-700">
            {Math.max(...chartData.map((d) => d.du_bao_man)).toFixed(2)} g/l
          </div>
        </div>
        <div className="text-center p-2 md:p-3 bg-purple-50 rounded-lg">
          <div className="text-xs md:text-sm text-gray-600">
            Số điểm dữ liệu
          </div>
          <div className="text-sm md:text-lg font-semibold text-purple-700">
            {data.length}
          </div>
        </div>
      </div>
    </div>
  );
};
