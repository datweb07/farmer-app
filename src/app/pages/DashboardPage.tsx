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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Chào mừng đến với nền tảng hỗ trợ nông dân! 👋
          </h1>
          <p className="text-lg opacity-90">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            color="green"
            subtitle="Được bảo vệ"
          />
          <StatsCard
            title="Tỷ lệ dự đoán độ mặn"
            value={`${overallStats.successRate}%`}
            icon={CheckCircle}
            color="purple"
            subtitle="Phần trăm chính xác"
          />
          <StatsCard
            title="Thu nhập tăng"
            value={`+${overallStats.incomIncrease}%`}
            icon={TrendingUp}
            color="orange"
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
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
          <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Hành động nhanh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate?.("salinity")}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              Xem chi tiết dự báo mặn
            </button>
            <button
              onClick={() => onNavigate?.("posts")}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              Tham gia cộng đồng
            </button>
            <button
              onClick={() => onNavigate?.("products")}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              Mua bán thiết bị hỗ trợ
            </button>
            <button
              onClick={() => onNavigate?.("invest")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              Tìm nguồn vốn đầu tư
            </button>
          </div>
        </div>

        {/* Help Guide */}
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl"></span>
            <div>
              <h4 className="font-bold text-xl text-gray-900 mb-2">
                Hướng dẫn sử dụng cho người mới
              </h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">1.</span>
                  <span>
                    Bấm vào <strong>"Độ mặn"</strong> để xem dự báo chi tiết và
                    biểu đồ
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">2.</span>
                  <span>
                    Vào <strong>"Cộng đồng"</strong> để học kinh nghiệm từ nông
                    dân khác
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">3.</span>
                  <span>
                    Mua thiết bị hỗ trợ tại <strong>"Sản phẩm"</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">4.</span>
                  <span>
                    Tìm nguồn vốn và hợp tác tại <strong>"Đầu tư"</strong>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
