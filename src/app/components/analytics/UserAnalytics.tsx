import { useState, useEffect } from "react";
import { Users, MessageCircle, Heart, FileText, Download } from "lucide-react";
import {
  getUserEngagementMetrics,
  getTopContributors,
  getUserGrowthMetrics,
  exportToCSV,
  exportToExcel,
} from "../../../lib/analytics/analytics.service";
import type {
  UserEngagementMetrics,
  TopContributor,
  UserGrowthMetrics,
} from "../../../lib/analytics/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function UserAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [engagementData, setEngagementData] = useState<UserEngagementMetrics[]>(
    [],
  );
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [growthData, setGrowthData] = useState<UserGrowthMetrics[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);

    const [engagement, contributors, growth] = await Promise.all([
      getUserEngagementMetrics(period),
      getTopContributors(10, period),
      getUserGrowthMetrics(period),
    ]);

    if (engagement.data) setEngagementData(engagement.data);
    if (contributors.data) setTopContributors(contributors.data);
    if (growth.data) setGrowthData(growth.data);

    setLoading(false);
  };

  const handleExportEngagement = (format: "csv" | "excel") => {
    if (format === "csv") {
      exportToCSV(engagementData, "user_engagement_metrics");
    } else {
      exportToExcel(engagementData, "user_engagement_metrics", "Engagement");
    }
  };

  const handleExportContributors = (format: "csv" | "excel") => {
    if (format === "csv") {
      exportToCSV(topContributors, "top_contributors");
    } else {
      exportToExcel(topContributors, "top_contributors", "Contributors");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === 7
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            7 ngày
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === 30
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            30 ngày
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-4 py-2 rounded-lg font-medium ${
              period === 90
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            90 ngày
          </button>
        </div>
      </div>

      {/* Engagement Metrics Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Hoạt động người dùng
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportEngagement("csv")}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExportEngagement("excel")}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="active_users"
              stroke="#10b981"
              name="Người dùng hoạt động"
            />
            <Line
              type="monotone"
              dataKey="posts"
              stroke="#3b82f6"
              name="Bài viết"
            />
            <Line
              type="monotone"
              dataKey="comments"
              stroke="#f59e0b"
              name="Bình luận"
            />
            <Line
              type="monotone"
              dataKey="likes"
              stroke="#ef4444"
              name="Lượt thích"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* User Growth Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Tăng trưởng người dùng
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="new_users" fill="#10b981" name="Người dùng mới" />
            <Bar dataKey="total_users" fill="#3b82f6" name="Tổng người dùng" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Contributors */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Top người đóng góp ({period} ngày qua)
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportContributors("csv")}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExportContributors("excel")}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Bài viết
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Bình luận
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Lượt thích nhận
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Điểm
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topContributors.map((contributor, index) => (
                <tr key={contributor.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {contributor.avatar_url ? (
                        <img
                          src={contributor.avatar_url}
                          alt={contributor.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {contributor.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="w-4 h-4 text-blue-600" />
                      {contributor.total_posts}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <MessageCircle className="w-4 h-4 text-yellow-600" />
                      {contributor.total_comments}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <Heart className="w-4 h-4 text-red-600" />
                      {contributor.total_likes_received}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-green-600">
                    {contributor.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
