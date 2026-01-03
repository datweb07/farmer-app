import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ComparisonChartProps {
  data: Array<{ date: string; namNay: number; namTruoc: number }>;
}

export function ComparisonChart({ data }: ComparisonChartProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
      <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
        <span className="text-2xl"></span>
        So sánh độ mặn: Năm nay vs Năm trước
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: "14px", fontWeight: "600" }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "14px", fontWeight: "600" }}
            label={{
              value: "Độ mặn (‰)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: "14px", fontWeight: "700" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "600",
            }}
            formatter={(value: number | undefined) => `${value ?? 0}‰`}
          />
          <Legend
            wrapperStyle={{
              fontSize: "14px",
              fontWeight: "600",
              paddingTop: "10px",
            }}
          />
          <Bar
            dataKey="namTruoc"
            fill="#10b981"
            name="Năm trước"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="namNay"
            fill="#f59e0b"
            name="Năm nay"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
        <p className="text-center text-orange-800 font-bold">
          ⚠️ Năm nay độ mặn cao hơn năm trước trung bình 25%
        </p>
      </div>
    </div>
  );
}
