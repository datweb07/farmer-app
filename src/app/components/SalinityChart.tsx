import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { SalinityData } from '../../data/mockData';

interface SalinityChartProps {
  data: SalinityData[];
}

export function SalinityChart({ data }: SalinityChartProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
      <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        Biểu đồ độ mặn 14 ngày (7 ngày qua + 7 ngày dự báo)
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '14px', fontWeight: '600' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '14px', fontWeight: '600' }}
            label={{ value: 'Độ mặn (‰)', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: '700' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
            }}
            formatter={(value: number) => [`${value}‰`, 'Độ mặn']}
          />
          <Legend
            wrapperStyle={{ fontSize: '14px', fontWeight: '600', paddingTop: '10px' }}
          />
          
          {/* Reference lines for safety levels */}
          <ReferenceLine y={4} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Mức an toàn', fill: '#10b981', fontSize: 12, fontWeight: 'bold' }} />
          <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Mức cảnh báo', fill: '#f59e0b', fontSize: 12, fontWeight: 'bold' }} />

          <Line
            type="monotone"
            dataKey="salinity"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5 }}
            activeDot={{ r: 8 }}
            name="Độ mặn"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm text-green-700 mb-1">An toàn</p>
          <p className="text-xl font-bold text-green-600">{'< 4‰'}</p>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-sm text-yellow-700 mb-1">Cảnh báo</p>
          <p className="text-xl font-bold text-yellow-600">4 - 6‰</p>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-700 mb-1">Nguy hiểm</p>
          <p className="text-xl font-bold text-red-600">{'> 6‰'}</p>
        </div>
      </div>
    </div>
  );
}
