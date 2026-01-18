import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Users as UsersIcon,
  Target,
  Download,
  MapPin,
} from "lucide-react";
import {
  getProjectAnalytics,
  getInvestmentTrends,
  getProjectCategoriesPerformance,
  exportToCSV,
  exportToExcel,
} from "../../../lib/analytics/analytics.service";
import type {
  ProjectAnalyticsData,
  InvestmentTrend,
  ProjectCategoryPerformance,
} from "../../../lib/analytics/types";
import {
  LineChart,
  Line,
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

export function ProjectAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [projects, setProjects] = useState<ProjectAnalyticsData[]>([]);
  const [investmentTrends, setInvestmentTrends] = useState<InvestmentTrend[]>(
    [],
  );
  const [categoryPerformance, setCategoryPerformance] = useState<
    ProjectCategoryPerformance[]
  >([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);

    const [projectsRes, trendsRes, categoriesRes] = await Promise.all([
      getProjectAnalytics(),
      getInvestmentTrends(period),
      getProjectCategoriesPerformance(),
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (trendsRes.data) setInvestmentTrends(trendsRes.data);
    if (categoriesRes.data) setCategoryPerformance(categoriesRes.data);

    setLoading(false);
  };

  const handleExportProjects = (format: "csv" | "excel") => {
    if (format === "csv") {
      exportToCSV(projects, "project_analytics");
    } else {
      exportToExcel(projects, "project_analytics", "Projects");
    }
  };

  const handleExportTrends = (format: "csv" | "excel") => {
    if (format === "csv") {
      exportToCSV(investmentTrends, "investment_trends");
    } else {
      exportToExcel(investmentTrends, "investment_trends", "Trends");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  const totalInvestment = projects.reduce(
    (sum, p) => sum + p.current_funding,
    0,
  );
  const avgFundingRate =
    projects.reduce((sum, p) => sum + p.funding_percentage, 0) /
    projects.length;
  const successfulProjects = projects.filter(
    (p) => p.funding_percentage >= 100,
  ).length;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng vốn huy động</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalInvestment)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tỷ lệ đạt mục tiêu TB</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgFundingRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Dự án thành công</p>
              <p className="text-2xl font-bold text-gray-900">
                {successfulProjects}/{projects.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng nhà đầu tư</p>
              <p className="text-2xl font-bold text-gray-900">
                {projects.reduce((sum, p) => sum + p.total_investors, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Xu hướng đầu tư ({period} ngày qua)
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportTrends("csv")}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExportTrends("excel")}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={investmentTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="investments"
              stroke="#10b981"
              name="Số lượng đầu tư"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              name="Số tiền (VNĐ)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Hiệu suất theo danh mục
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryPerformance.map(item => ({ ...item }))}
                dataKey="total_funding"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {categoryPerformance.map((_entry, index) => (
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
            Tỷ lệ thành công theo danh mục
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="avg_funding_percentage"
                fill="#10b981"
                name="Tỷ lệ đạt mục tiêu (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Details Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Chi tiết dự án ({projects.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportProjects("csv")}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExportProjects("excel")}
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
                  Dự án
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Người tạo
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Mục tiêu
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  Đã huy động
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Tiến độ
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Nhà đầu tư
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  ROI dự kiến
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Vị trí
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.project_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate">
                      {project.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {project.days_active} ngày hoạt động
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {project.creator_username}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {formatCurrency(project.funding_goal)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                    {formatCurrency(project.current_funding)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            project.funding_percentage >= 100
                              ? "bg-green-600"
                              : project.funding_percentage >= 75
                                ? "bg-blue-600"
                                : project.funding_percentage >= 50
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                          }`}
                          style={{
                            width: `${Math.min(project.funding_percentage, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {project.funding_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <UsersIcon className="w-4 h-4 text-gray-500" />
                      {project.total_investors}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-purple-600">
                    {project.roi_estimate}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {project.location}
                    </div>
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
