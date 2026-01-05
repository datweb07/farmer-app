import { Users, Droplet, TrendingUp, CheckCircle } from "lucide-react";
import { StatsCard } from "../components/StatsCard";
import { SalinityCard } from "../components/SalinityCard";
import { RecommendationCard } from "../components/RecommendationCard";
import { overallStats, getSalinityRecommendations } from "../../data/mockData";

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const currentSalinity = 4.2;
  const forecastSalinity = 6.3;
  const recommendations = getSalinityRecommendations(forecastSalinity);

  const getSalinityLevel = (
    salinity: number
  ): "safe" | "warning" | "danger" => {
    if (salinity < 4) return "safe";
    if (salinity < 6) return "warning";
    return "danger";
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            Chào mừng đến với nền tảng hỗ trợ nông dân
          </h1>
          <p className="text-gray-600">
            Đồng Bằng Sông Cửu Long - Cùng nhau vượt qua khó khăn
          </p>
        </div>

        {/* Current Salinity Status */}
        <div className="mb-8">
          <SalinityCard
            currentSalinity={currentSalinity}
            forecastSalinity={forecastSalinity}
            level={getSalinityLevel(forecastSalinity)}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Nông dân tham gia"
            value={overallStats.totalFarmers.toLocaleString("vi-VN")}
            icon={Users}
            color="blue"
            subtitle="Đang hoạt động"
          />
          <StatsCard
            title="Diện tích canh tác"
            value={`${overallStats.affectedArea.toLocaleString("vi-VN")} ha`}
            icon={Droplet}
            color="blue"
            subtitle="Được bảo vệ"
          />
          <StatsCard
            title="Tỷ lệ dự đoán độ mặn"
            value={`${overallStats.successRate}%`}
            icon={CheckCircle}
            color="blue"
            subtitle="Phần trăm chính xác"
          />
          <StatsCard
            title="Thu nhập tăng"
            value={`+${overallStats.incomIncrease}%`}
            icon={TrendingUp}
            color="blue"
            subtitle="Trung bình"
          />
        </div>

        {/* Recommendations */}
        <div className="mb-8">
          <RecommendationCard
            title={recommendations.title}
            recommendations={recommendations.recommendations}
            color={recommendations.color as "green" | "yellow" | "red"}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-xl text-gray-900 mb-6">
            Hành động nhanh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate?.("salinity")}
              className="bg-white text-blue-600 border border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-colors"
            >
              Xem chi tiết dự báo mặn
            </button>
            <button
              onClick={() => onNavigate?.("posts")}
              className="bg-white text-blue-600 border border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-colors"
            >
              Tham gia cộng đồng
            </button>
            <button
              onClick={() => onNavigate?.("products")}
              className="bg-white text-blue-600 border border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-colors"
            >
              Mua bán thiết bị hỗ trợ
            </button>
            <button
              onClick={() => onNavigate?.("invest")}
              className="bg-white text-blue-600 border border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-colors"
            >
              Tìm nguồn vốn đầu tư
            </button>
          </div>
        </div>

        {/* Help Guide */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-xl text-gray-900 mb-4">
            Hướng dẫn sử dụng cho người mới
          </h4>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-medium">1.</span>
              <span>
                Bấm vào <strong className="text-gray-900">"Độ mặn"</strong> để xem dự báo chi tiết và
                biểu đồ
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-medium">2.</span>
              <span>
                Vào <strong className="text-gray-900">"Cộng đồng"</strong> để học kinh nghiệm từ nông
                dân khác
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-medium">3.</span>
              <span>
                Mua thiết bị hỗ trợ tại <strong className="text-gray-900">"Sản phẩm"</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-medium">4.</span>
              <span>
                Tìm nguồn vốn và hợp tác tại <strong className="text-gray-900">"Đầu tư"</strong>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}