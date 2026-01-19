// ============================================
// Trend Charts Component
// ============================================
// Multiple small charts showing trends for each station
// ============================================

import { useMemo } from "react";
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import type { ProphetPredict } from "@/types/prophet";

interface TrendChartsProps {
  data: ProphetPredict[];
}

export function TrendCharts({ data }: TrendChartsProps) {
  // Group data by station
  const stationData = useMemo(() => {
    const grouped = data.reduce(
      (acc, item) => {
        const key = `${item.ten_tram} (${item.tinh})`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, ProphetPredict[]>,
    );

    // Sort each station's data by year and calculate trends
    return Object.entries(grouped).map(([station, items]) => {
      const sortedItems = items.sort((a, b) => a.nam - b.nam);
      const firstValue = sortedItems[0].du_bao_man;
      const lastValue = sortedItems[sortedItems.length - 1].du_bao_man;
      const change = lastValue - firstValue;
      const changePercent =
        firstValue > 0 ? ((change / firstValue) * 100).toFixed(1) : "N/A";
      const trend = change > 0.1 ? "up" : change < -0.1 ? "down" : "stable";

      return {
        station,
        items: sortedItems,
        firstValue,
        lastValue,
        change: change.toFixed(2),
        changePercent,
        trend,
      };
    });
  }, [data]);

  if (stationData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">
          Xu hướng độ mặn theo trạm
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          Không có dữ liệu để hiển thị
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-2">
          Xu hướng độ mặn theo trạm
        </h3>
        <p className="text-xs md:text-sm text-gray-600">
          Dự báo xu hướng biến động độ mặn từ năm đầu đến năm cuối cho từng trạm
          quan trắc
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stationData.map(({ station, items, change, changePercent, trend }) => {
          // Prepare chart data
          const chartData = items.map((item) => ({
            nam: item.nam,
            value: item.du_bao_man,
            lower: item.lower_ci,
            upper: item.upper_ci,
          }));

          return (
            <div
              key={station}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-shadow"
            >
              {/* Station Header */}
              <div className="mb-2">
                <h4 className="text-xs md:text-sm font-semibold text-gray-900 truncate">
                  {station}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {/* Trend Indicator */}
                  {trend === "up" && (
                    <span className="flex items-center text-xs text-red-600 font-medium">
                      ↑ +{change} g/l
                      {changePercent !== "N/A" && ` (+${changePercent}%)`}
                    </span>
                  )}
                  {trend === "down" && (
                    <span className="flex items-center text-xs text-green-600 font-medium">
                      ↓ {change} g/l
                      {changePercent !== "N/A" && ` (${changePercent}%)`}
                    </span>
                  )}
                  {trend === "stable" && (
                    <span className="flex items-center text-xs text-gray-600 font-medium">
                      → Ổn định ({change} g/l)
                    </span>
                  )}
                </div>
              </div>

              {/* Mini Chart */}
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id={`ci-${station}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="#93c5fd"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="nam"
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />

                  <YAxis
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    width={35}
                  />

                  <Tooltip
                    contentStyle={{
                      fontSize: "11px",
                      padding: "6px",
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number | undefined) =>
                      value ? [`${value.toFixed(2)} g/l`] : [""]
                    }
                    labelFormatter={(label) => `Năm ${label}`}
                  />

                  {/* Confidence Interval */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill={`url(#ci-${station})`}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="#fff"
                    isAnimationActive={false}
                  />

                  {/* Main Line */}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1e40af"
                    strokeWidth={2}
                    dot={{ fill: "#1e40af", r: 3 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Statistics */}
              <div className="flex justify-between text-[10px] md:text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                <span>
                  Min:{" "}
                  <strong>
                    {Math.min(...items.map((i) => i.du_bao_man)).toFixed(2)}
                  </strong>
                </span>
                <span>
                  Max:{" "}
                  <strong>
                    {Math.max(...items.map((i) => i.du_bao_man)).toFixed(2)}
                  </strong>
                </span>
                <span>
                  TB:{" "}
                  <strong>
                    {(
                      items.reduce((sum, i) => sum + i.du_bao_man, 0) /
                      items.length
                    ).toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Tổng quan xu hướng
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-bold">↑</span>
            <span className="text-gray-700">
              <strong>
                {stationData.filter((s) => s.trend === "up").length}
              </strong>{" "}
              trạm có xu hướng tăng
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">↓</span>
            <span className="text-gray-700">
              <strong>
                {stationData.filter((s) => s.trend === "down").length}
              </strong>{" "}
              trạm có xu hướng giảm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-bold">→</span>
            <span className="text-gray-700">
              <strong>
                {stationData.filter((s) => s.trend === "stable").length}
              </strong>{" "}
              trạm ổn định
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
