import { useState, useEffect } from "react";
import {
  FileText,
  ShoppingBag,
  MessageCircle,
  Heart,
  Award,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getUserStats,
  getRecentActivities,
  getTrendingPosts,
  getRecentProducts,
  getActiveProjects,
} from "../../lib/dashboard/dashboard.service";
import type { UserStats, ActivityItem } from "../../lib/dashboard/types";
import type { PostWithStats } from "../../lib/community/types";
import type { ProductWithStats } from "../../lib/community/types";
import type { InvestmentProjectWithStats } from "../../lib/investments/types";
import { UserStatsCard } from "../components/UserStatsCard";
import { ActivityFeed } from "../components/ActivityFeed";
import { TrendingPosts } from "../components/TrendingPosts";
import { RecentProducts } from "../components/RecentProducts";
import { ActiveProjects } from "../components/ActiveProjects";

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<PostWithStats[]>([]);
  const [recentProducts, setRecentProducts] = useState<ProductWithStats[]>([]);
  const [activeProjects, setActiveProjects] = useState<
    InvestmentProjectWithStats[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    // Load all data in parallel
    const [
      statsResult,
      activitiesResult,
      postsResult,
      productsResult,
      projectsResult,
    ] = await Promise.all([
      getUserStats(),
      getRecentActivities(10),
      getTrendingPosts(5),
      getRecentProducts(4),
      getActiveProjects(3),
    ]);

    if (statsResult.stats) setStats(statsResult.stats);
    if (!activitiesResult.error) setActivities(activitiesResult.activities);
    if (!postsResult.error) setTrendingPosts(postsResult.posts);
    if (!productsResult.error) setRecentProducts(productsResult.products);
    if (!projectsResult.error) setActiveProjects(projectsResult.projects);

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-8 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Xin chào, {profile?.username || "Nông dân"}! 👋
          </h1>
          <p className="text-blue-100">
            Chào mừng quay trở lại nền tảng này !!!
          </p>
        </div>

        {/* User Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <UserStatsCard
              icon={FileText}
              label="Bài viết"
              value={stats.total_posts}
              color="blue"
            />
            <UserStatsCard
              icon={ShoppingBag}
              label="Sản phẩm"
              value={stats.total_products}
              color="purple"
            />
            <UserStatsCard
              icon={MessageCircle}
              label="Bình luận"
              value={stats.total_comments}
              color="green"
            />
            <UserStatsCard
              icon={Heart}
              label="Lượt thích"
              value={stats.total_likes_received}
              color="red"
            />
          </div>
        )}

        {/* Points & Rank Card */}
        {stats && stats.rank_position > 0 && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-6 mb-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Thứ hạng của bạn</h3>
                </div>
                <p className="text-2xl font-bold">
                  #{stats.rank_position}
                  <span className="text-base font-normal ml-2">
                    / {stats.total_users} thành viên
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90 mb-1">Tổng điểm</p>
                <p className="text-3xl font-bold">{stats.total_points}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            <ActivityFeed activities={activities} loading={loading} />
            <TrendingPosts
              posts={trendingPosts}
              loading={loading}
              onNavigate={onNavigate}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <RecentProducts
              products={recentProducts}
              loading={loading}
              onNavigate={onNavigate}
            />
            <ActiveProjects
              projects={activeProjects}
              loading={loading}
              onNavigate={onNavigate}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-xl text-gray-900 mb-6 flex items-center gap-2">
            Hành động nhanh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate?.("salinity")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Xem dự báo độ mặn
            </button>
            <button
              onClick={() => onNavigate?.("posts")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Tham gia cộng đồng
            </button>
            <button
              onClick={() => onNavigate?.("products")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Mua sắm thiết bị
            </button>
            <button
              onClick={() => onNavigate?.("invest")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Tìm nguồn đầu tư
            </button>
          </div>
        </div>

        {/* Help Guide */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-xl text-gray-900 mb-4">
            Hướng dẫn sử dụng
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">Theo dõi độ mặn</p>
                <p className="text-sm text-gray-600">
                  Xem dự báo và biểu đồ chi tiết để lập kế hoạch canh tác
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">Học hỏi cộng đồng</p>
                <p className="text-sm text-gray-600">
                  Chia sẻ kinh nghiệm và học hỏi từ nông dân khác
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">Mua sắm thiết bị</p>
                <p className="text-sm text-gray-600">
                  Tìm thiết bị, giống cây, vật tư hỗ trợ canh tác
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                4
              </span>
              <div>
                <p className="font-medium text-gray-900">Kêu gọi đầu tư</p>
                <p className="text-sm text-gray-600">
                  Tạo dự án và kết nối với nhà đầu tư, doanh nghiệp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
