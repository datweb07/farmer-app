import { useState, useEffect } from "react";
import {
  Users,
  FileText,
  ShoppingBag,
  Target,
  MessageCircle,
  Heart,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
} from "lucide-react";
import {
  getPlatformStatistics,
  getContentStatistics,
  exportToCSV,
  printReport,
} from "../../../lib/analytics/analytics.service";
import type {
  PlatformStatistics as PlatformStats,
  ContentStatistics,
} from "../../../lib/analytics/types";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export function PlatformStatistics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [contentStats, setContentStats] = useState<ContentStatistics | null>(
    null,
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [platformRes, contentRes] = await Promise.all([
      getPlatformStatistics(),
      getContentStatistics(),
    ]);

    if (platformRes.data) setStats(platformRes.data);
    if (contentRes.data) setContentStats(contentRes.data);

    setLoading(false);
  };

  const handleExportAllStats = () => {
    if (!stats) return;

    const exportData = [
      {
        metric: "Tổng người dùng",
        value: stats.total_users,
      },
      {
        metric: "Người dùng hoạt động hôm nay",
        value: stats.active_users_today,
      },
      {
        metric: "Người dùng hoạt động 7 ngày",
        value: stats.active_users_week,
      },
      {
        metric: "Người dùng hoạt động 30 ngày",
        value: stats.active_users_month,
      },
      {
        metric: "Tổng bài viết",
        value: stats.total_posts,
      },
      {
        metric: "Tổng sản phẩm",
        value: stats.total_products,
      },
      {
        metric: "Tổng dự án",
        value: stats.total_projects,
      },
      {
        metric: "Tổng bình luận",
        value: stats.total_comments,
      },
      {
        metric: "Tổng lượt thích",
        value: stats.total_likes,
      },
      {
        metric: "Tỷ lệ tương tác trung bình (%)",
        value: stats.avg_engagement_rate,
      },
      {
        metric: "Tăng trưởng người dùng tháng (%)",
        value: stats.user_growth_rate_month,
      },
      {
        metric: "Tăng trưởng nội dung tháng (%)",
        value: stats.content_growth_rate_month,
      },
    ];

    exportToCSV(exportData, "platform_statistics");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-gray-600">Không có dữ liệu</div>;
  }

  const activeUserData = [
    { name: "Hôm nay", value: stats.active_users_today },
    { name: "7 ngày", value: stats.active_users_week },
    { name: "30 ngày", value: stats.active_users_month },
  ];

  const contentData = [
    { name: "Bài viết", value: stats.total_posts },
    { name: "Sản phẩm", value: stats.total_products },
    { name: "Dự án", value: stats.total_projects },
  ];

  const engagementData = [
    { name: "Bình luận", value: stats.total_comments },
    { name: "Lượt thích", value: stats.total_likes },
  ];

  return (
    <div className="space-y-6">
      {/* Export Actions */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleExportAllStats}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Xuất báo cáo CSV
        </button>
        <button
          onClick={printReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          In báo cáo
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Tổng người dùng</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_users.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {stats.user_growth_rate_month >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span
              className={
                stats.user_growth_rate_month >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {Math.abs(stats.user_growth_rate_month).toFixed(1)}%
            </span>
            <span className="text-gray-500">so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Tổng bài viết</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_posts.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {stats.content_growth_rate_month >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span
              className={
                stats.content_growth_rate_month >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {Math.abs(stats.content_growth_rate_month).toFixed(1)}%
            </span>
            <span className="text-gray-500">so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Dự án đầu tư</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_projects.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">
              {stats.total_investments.toLocaleString()}
            </span>{" "}
            lượt đầu tư
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Tỷ lệ tương tác</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avg_engagement_rate.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">Trung bình 30 ngày</div>
        </div>
      </div>

      {/* Active Users Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Người dùng hoạt động
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={activeUserData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" name="Người dùng" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Content Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Phân bố nội dung
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {contentData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Mức độ tương tác
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" name="Số lượng" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content by Category */}
      {contentStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Posts by Category */}
          {contentStats.posts && contentStats.posts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Bài viết theo danh mục
              </h2>
              <div className="space-y-3">
                {contentStats.posts.map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-700">{cat.category}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {cat.avg_views.toFixed(0)} lượt xem TB
                      </span>
                      <span className="font-medium text-gray-900">
                        {cat.total} bài
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products by Category */}
          {contentStats.products && contentStats.products.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Sản phẩm theo danh mục
              </h2>
              <div className="space-y-3">
                {contentStats.products.map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-700">{cat.category}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(cat.avg_price)}{" "}
                        TB
                      </span>
                      <span className="font-medium text-gray-900">
                        {cat.total} SP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Statistics Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Thống kê chi tiết
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-gray-700">Tổng bình luận</span>
            </div>
            <span className="font-bold text-gray-900">
              {stats.total_comments.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-600" />
              <span className="text-gray-700">Tổng lượt thích</span>
            </div>
            <span className="font-bold text-gray-900">
              {stats.total_likes.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">Tổng sản phẩm</span>
            </div>
            <span className="font-bold text-gray-900">
              {stats.total_products.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-600" />
              <span className="text-gray-700">Hoạt động hôm nay</span>
            </div>
            <span className="font-bold text-gray-900">
              {stats.active_users_today.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">Hoạt động tuần này</span>
            </div>
            <span className="font-bold text-gray-900">
              {stats.active_users_week.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-gray-700">Hoạt động tháng này</span>
            </div>
            <span className="font-bold text-gray-900">
              {stats.active_users_month.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
