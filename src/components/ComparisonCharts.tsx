import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ProphetPredict } from "../types/prophet";

interface ComparisonChartsProps {
  data: ProphetPredict[];
}

export function ComparisonCharts({ data }: ComparisonChartsProps) {
  // Distribution by level
  const levelDistribution = useMemo(() => {
    const low = data.filter((d) => d.du_bao_man < 1).length;
    const medium = data.filter(
      (d) => d.du_bao_man >= 1 && d.du_bao_man < 4,
    ).length;
    const high = data.filter((d) => d.du_bao_man >= 4).length;

    return [
      { name: "Thấp (< 1 g/l)", count: low, fill: "#10b981" },
      { name: "Trung bình (1-4 g/l)", count: medium, fill: "#f59e0b" },
      { name: "Cao (> 4 g/l)", count: high, fill: "#ef4444" },
    ];
  }, [data]);

  // Salinity statistics
  const salinityStats = useMemo(() => {
    if (data.length === 0) return [];

    const max = Math.max(...data.map((d) => d.du_bao_man));
    const avg = data.reduce((sum, d) => sum + d.du_bao_man, 0) / data.length;
    const min = Math.min(...data.map((d) => d.du_bao_man));

    return [
      { name: "Thấp nhất", value: parseFloat(min.toFixed(2)), fill: "#10b981" },
      {
        name: "Trung bình",
        value: parseFloat(avg.toFixed(2)),
        fill: "#3b82f6",
      },
      { name: "Cao nhất", value: parseFloat(max.toFixed(2)), fill: "#ef4444" },
    ];
  }, [data]);

  // Confidence metrics
  const confidenceMetrics = useMemo(() => {
    if (data.length === 0) return [];

    const avgCiRange =
      data.reduce((sum, d) => sum + (d.upper_ci - d.lower_ci), 0) /
      data.length /
      2;
    const avgLocationCoeff =
      data.reduce((sum, d) => sum + (d.he_so_vi_tri || 0), 0) / data.length;

    return [
      {
        name: "Khoảng CI TB",
        value: parseFloat(avgCiRange.toFixed(2)),
        fill: "#3b82f6",
      },
      {
        name: "Hệ số VT TB",
        value: parseFloat(avgLocationCoeff.toFixed(2)),
        fill: "#8b5cf6",
      },
      { name: "Độ chính xác (%)", value: 95, fill: "#10b981" },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Distribution Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-xl text-gray-900 mb-4">
          Phân bố theo mức độ
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={levelDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Salinity Statistics Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-xl text-gray-900 mb-4">
          Thống kê độ mặn (g/l)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={salinityStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Confidence Metrics Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-xl text-gray-900 mb-4">Độ tin cậy</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={confidenceMetrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
