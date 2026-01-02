import { SalinityChart } from '../components/SalinityChart';
import { ComparisonChart } from '../components/ComparisonChart';
import { AffectedAreasMap } from '../components/AffectedAreasMap';
import { RecommendationCard } from '../components/RecommendationCard';
import { salinityData, salinityComparison, affectedAreas, getSalinityRecommendations } from '../../data/mockData';

export function SalinityPage() {
  const latestData = salinityData[salinityData.length - 1];
  const recommendations = getSalinityRecommendations(latestData.salinity);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">💧</span>
            Hệ thống dự đoán xâm nhập mặn
          </h1>
          <p className="text-lg opacity-90">Theo dõi và dự báo chính xác - Giúp nông dân chủ động</p>
        </div>

        {/* Main Chart */}
        <div className="mb-8">
          <SalinityChart data={salinityData} />
        </div>

        {/* Recommendations */}
        <div className="mb-8">
          <RecommendationCard
            title={recommendations.title}
            recommendations={recommendations.recommendations}
            color={recommendations.color as 'green' | 'yellow' | 'red'}
          />
        </div>

        {/* Comparison Chart */}
        <div className="mb-8">
          <ComparisonChart data={salinityComparison} />
        </div>

        {/* Affected Areas Map */}
        <div className="mb-8">
          <AffectedAreasMap areas={affectedAreas} />
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Cách theo dõi độ mặn
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                <p className="text-gray-700 pt-1">Kiểm tra biểu đồ mỗi ngày để biết xu hướng</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                <p className="text-gray-700 pt-1">Chú ý màu sắc: Xanh (an toàn), Vàng (cảnh báo), Đỏ (nguy hiểm)</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                <p className="text-gray-700 pt-1">Đọc phần khuyến nghị và làm theo hướng dẫn</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</span>
                <p className="text-gray-700 pt-1">Chia sẻ thông tin với hàng xóm</p>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
            <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🌾</span>
              Giải pháp dài hạn
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <p className="text-gray-700">Xây dựng ao/bể trữ nước ngọt</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <p className="text-gray-700">Chuyển đổi sang giống cây chịu mặn</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <p className="text-gray-700">Tham gia mô hình canh tác luân canh</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <p className="text-gray-700">Hợp tác với trạm bơm nước ngọt</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <p className="text-gray-700">Học tập và chia sẻ kinh nghiệm</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="mt-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
          <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
            <span className="text-2xl">🆘</span>
            Liên hệ khẩn cấp
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm opacity-90 mb-1">Trạm thủy văn</p>
              <p className="text-xl font-bold">1800-1234</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm opacity-90 mb-1">Khuyến nông</p>
              <p className="text-xl font-bold">1800-5678</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm opacity-90 mb-1">Hỗ trợ nông dân</p>
              <p className="text-xl font-bold">1800-9999</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
