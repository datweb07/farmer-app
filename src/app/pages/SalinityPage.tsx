import { SalinityChart } from "../components/SalinityChart";
import { ComparisonChart } from "../components/ComparisonChart";
import { AffectedAreasMap } from "../components/AffectedAreasMap";
import { RecommendationCard } from "../components/RecommendationCard";
import {
  salinityData,
  salinityComparison,
  affectedAreas,
  getSalinityRecommendations,
} from "../../data/mockData";

export function SalinityPage() {
  const latestData = salinityData[salinityData.length - 1];
  const recommendations = getSalinityRecommendations(latestData.salinity);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            Hệ thống dự đoán xâm nhập mặn
          </h1>
          <p className="text-gray-600">
            Theo dõi và dự báo chính xác - Giúp nông dân chủ động
          </p>
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
            color={recommendations.color as "green" | "yellow" | "red"}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-xl text-gray-900 mb-4">
              Cách theo dõi độ mặn
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-gray-700">
                  Kiểm tra biểu đồ mỗi ngày để biết xu hướng
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-gray-700">
                  Chú ý màu sắc: Xanh (an toàn), Vàng (cảnh báo), Đỏ (nguy hiểm)
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-gray-700">
                  Đọc phần khuyến nghị và làm theo hướng dẫn
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  4
                </span>
                <p className="text-gray-700">
                  Chia sẻ thông tin với hàng xóm
                </p>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-xl text-gray-900 mb-4">
              Giải pháp dài hạn
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">Xây dựng ao/bể trữ nước ngọt</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">
                  Chuyển đổi sang giống cây chịu mặn
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">
                  Tham gia mô hình canh tác luân canh
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">Hợp tác với trạm bơm nước ngọt</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <p className="text-gray-700">Học tập và chia sẻ kinh nghiệm</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-xl text-gray-900 mb-4">
            Liên hệ hỗ trợ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Trạm thủy văn</p>
              <p className="text-lg font-semibold text-blue-600">1800-1234</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Khuyến nông</p>
              <p className="text-lg font-semibold text-blue-600">1800-5678</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Hỗ trợ nông dân</p>
              <p className="text-lg font-semibold text-blue-600">1800-9999</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}