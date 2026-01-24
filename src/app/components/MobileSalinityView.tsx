// @ts-nocheck
import { useState, useEffect } from "react";
import { MapPin, Clock } from "lucide-react";
import { FilterBar } from "@/components/FilterBar";
import { SalinityChart } from "@/components/SalinityChart";
import { SalinityMap } from "@/components/SalinityMap";
import { ComparisonCharts } from "@/components/ComparisonCharts";
import { TrendCharts } from "@/components/TrendCharts";
import { SalinityTable } from "@/components/SalinityTable";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "../components/UserAvatar";
import { NotificationDropdown } from "../components/NotificationDropdown";
import type { FilterState } from "@/types/prophet";

interface MobileSalinityViewProps {
  data: any[];
  filteredData: any[];
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  onNavigate?: (page: string) => void;
}

export function MobileSalinityView({
  data,
  filteredData,
  filters,
  setFilters,
  loading,
  error,
  refetch,
  onNavigate,
}: MobileSalinityViewProps) {
  const { profile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const getGreeting = (currentHour: number) => {
    if (currentHour >= 5 && currentHour < 10) {
      return {
        greeting: "Chào buổi sáng",
        message: "Kiểm tra độ mặn trước khi tưới nhé!",
      };
    } else if (currentHour >= 10 && currentHour < 13) {
      return {
        greeting: "Chào buổi trưa",
        message: "Nghỉ ngơi và cập nhật tình hình nước.",
      };
    } else if (currentHour >= 13 && currentHour < 17) {
      return {
        greeting: "Chào buổi chiều",
        message: "Theo dõi diễn biến thủy triều.",
      };
    } else if (currentHour >= 17 && currentHour < 21) {
      return {
        greeting: "Chào buổi tối",
        message: "Lên kế hoạch cho ngày mai.",
      };
    } else {
      return {
        greeting: "Chào buổi đêm",
        message: "Chúc bà con ngủ ngon!",
      };
    }
  };

  const greeting = getGreeting(currentTime.getHours());
  const formattedTime = currentTime.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const formattedDate = currentTime.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const province = filters.tinh || "TOÀN VÙNG";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Mobile Header - giống MobileProductsView */}
      <div
        className="relative bg-cover bg-center text-white px-4 pt-6 pb-4"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80")',
        }}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.("profile")}
              className="group relative rounded-full p-0.5 border-2 border-white/50 hover:border-white transition-all active:scale-95"
              aria-label="Hồ sơ"
            >
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                username={profile?.username || "User"}
                size="lg"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-wide">
                {greeting.greeting} Anh/Chị, {profile?.username || "Bà con"}!
              </h1>
              <p className="text-xs text-gray-200">{greeting.message}</p>
            </div>
          </div>
          <NotificationDropdown />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Khu vực:{" "}
            <span className="font-bold uppercase truncate max-w-[120px]">
              {province}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>
              {formattedTime} | {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - copy từ SalinityPage */}
      <div className="px-4 py-4">
        {/* Header */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Độ Mặn Dự Báo (Dựa trên mô hình Prophet)
          </h1>
          <p className="text-xs text-gray-500 italic">
            Lưu ý: Mọi kết quả từ mô hình dự báo chỉ mang tính tham khảo. Đội
            ngũ phát triển sẽ không chịu trách nhiệm dưới mọi hình thức.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mb-4">
          <FilterBar
            data={data}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-600 mb-1">Tổng bản ghi</p>
            <p className="text-xl font-bold text-gray-600">
              {filteredData.length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-600 mb-1">Năm dự báo</p>
            <p className="text-xl font-bold text-gray-600">
              {new Set(filteredData.map((d) => d.nam)).size}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-600 mb-1">Tỉnh/Thành phố</p>
            <p className="text-xl font-bold text-gray-600">
              {new Set(filteredData.map((d) => d.tinh)).size}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-600 mb-1">Độ mặn TB</p>
            <p className="text-xl font-bold text-gray-600">
              {(
                filteredData.reduce((sum, d) => sum + d.du_bao_man, 0) /
                (filteredData.length || 1)
              ).toFixed(2)}{" "}
              <span className="text-sm">g/l</span>
            </p>
          </div>
        </div>

        {/* Visualizations Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-1 overflow-hidden shadow-sm">
            <SalinityMap data={filteredData} />
          </div>

          {/* <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-bold mb-3 text-sm">Biểu đồ dự báo</h3>
                        <SalinityChart data={filteredData} />
                    </div> */}

          {/* <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-bold mb-3 text-sm">Biểu đồ xu hướng</h3>
                        <TrendCharts data={filteredData} />
                    </div> */}

          {/* <div className="bg-white rounded-lg p-4 shadow-sm">
                        <ComparisonCharts data={filteredData} />
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <SalinityTable data={filteredData} />
                    </div> */}
        </div>

        {/* Footer info/Support */}
        {/* <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-1 text-xs">
                            Hỗ trợ kỹ thuật
                        </h3>
                        <p className="text-xs">
                            Mọi thắc mắc về dữ liệu dự báo, vui lòng liên hệ hotline:
                            1800-1234
                        </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <h3 className="font-bold text-green-800 mb-1 text-xs">
                            Mô hình Prophet
                        </h3>
                        <p className="text-xs">
                            Mô hình được tối ưu hóa cho dữ liệu mùa vụ vùng ĐBSCL.
                        </p>
                    </div>
                </div> */}
      </div>
    </div>
  );
}
