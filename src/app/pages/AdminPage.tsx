import { useState, useEffect } from "react";
import {
  Users,
  FileText,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Shield,
  Activity,
  DollarSign,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { getAdminStats, isAdmin } from "../../lib/admin/admin.service";
import type { AdminStats } from "../../lib/admin/types";
import { UserManagement } from "../components/admin/UserManagement";
import { PostModeration } from "../components/admin/PostModeration";
import { ProductModeration } from "../components/admin/ProductModeration";
import { ProjectModeration } from "../components/admin/ProjectModeration";
import { ReportsManagement } from "../components/admin/ReportsManagement";
import { AdminLogs } from "../components/admin/AdminLogs";

interface AdminPageProps {
  onNavigate?: (page: string) => void;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "users"
    | "posts"
    | "products"
    | "projects"
    | "reports"
    | "logs"
  >("dashboard");
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setLoading(true);
    const adminStatus = await isAdmin();
    setIsAdminUser(adminStatus);

    if (!adminStatus) {
      setLoading(false);
      return;
    }

    await loadStats();
    setLoading(false);
  };

  const loadStats = async () => {
    const result = await getAdminStats();
    if (result.stats) {
      setStats(result.stats);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Truy cập bị từ chối
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Bạn không có quyền truy cập vào trang quản trị. Vui lòng liên hệ
            admin nếu bạn cần hỗ trợ.
          </p>
          <button
            onClick={() => onNavigate?.("dashboard")}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Tổng quan", icon: BarChart3 },
    { id: "users", label: "Quản lý Users", icon: Users },
    { id: "posts", label: "Kiểm duyệt Posts", icon: FileText },
    { id: "products", label: "Kiểm duyệt Products", icon: ShoppingBag },
    { id: "projects", label: "Kiểm duyệt Projects", icon: TrendingUp },
    { id: "reports", label: "Báo cáo vi phạm", icon: AlertCircle },
    { id: "logs", label: "Lịch sử", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-8 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-blue-100">
            Quản lý hệ thống, kiểm duyệt nội dung và theo dõi hoạt động
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-x-auto">
          <div className="flex border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {activeTab === "dashboard" && stats && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Tổng Users"
                value={stats.total_users.toLocaleString()}
                subtitle={`${stats.active_users} hoạt động (30 ngày)`}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Bài viết"
                value={stats.total_posts.toLocaleString()}
                subtitle={`${stats.pending_posts} chờ duyệt`}
                icon={FileText}
                color="purple"
                alert={stats.pending_posts > 0}
              />
              <StatCard
                title="Sản phẩm"
                value={stats.total_products.toLocaleString()}
                subtitle={`${stats.pending_products} chờ duyệt`}
                icon={ShoppingBag}
                color="green"
                alert={stats.pending_products > 0}
              />
              <StatCard
                title="Dự án"
                value={stats.total_projects.toLocaleString()}
                subtitle={`${stats.pending_projects} chờ duyệt`}
                icon={TrendingUp}
                color="orange"
                alert={stats.pending_projects > 0}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Báo cáo vi phạm"
                value={stats.total_reports.toLocaleString()}
                subtitle={`${stats.pending_reports} chưa xử lý`}
                icon={AlertCircle}
                color="red"
                alert={stats.pending_reports > 0}
              />
              <StatCard
                title="Users bị cấm"
                value={stats.banned_users.toLocaleString()}
                subtitle="Tổng số tài khoản bị khóa"
                icon={Shield}
                color="gray"
              />
              <StatCard
                title="Tổng đầu tư"
                value={`${(stats.total_investments / 1000000).toFixed(1)}M`}
                subtitle="VNĐ"
                icon={DollarSign}
                color="yellow"
              />
              <StatCard
                title="Bình luận"
                value={stats.total_comments.toLocaleString()}
                subtitle="Tổng số bình luận"
                icon={MessageSquare}
                color="indigo"
              />
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Hành động nhanh
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("posts")}
                  className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left"
                >
                  <FileText className="w-6 h-6 text-purple-600 mb-2" />
                  <p className="font-medium text-gray-900">
                    Kiểm duyệt bài viết
                  </p>
                  <p className="text-sm text-gray-600">
                    {stats.pending_posts} bài chờ duyệt
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className="p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition-colors text-left"
                >
                  <TrendingUp className="w-6 h-6 text-orange-600 mb-2" />
                  <p className="font-medium text-gray-900">Phê duyệt dự án</p>
                  <p className="text-sm text-gray-600">
                    {stats.pending_projects} dự án chờ
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className="p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
                  <p className="font-medium text-gray-900">Xử lý báo cáo</p>
                  <p className="text-sm text-gray-600">
                    {stats.pending_reports} báo cáo mới
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && <UserManagement />}
        {activeTab === "posts" && <PostModeration />}
        {activeTab === "products" && <ProductModeration />}
        {activeTab === "projects" && <ProjectModeration />}
        {activeTab === "reports" && <ReportsManagement />}
        {activeTab === "logs" && <AdminLogs />}
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color:
    | "blue"
    | "purple"
    | "green"
    | "orange"
    | "red"
    | "yellow"
    | "indigo"
    | "gray";
  alert?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  alert,
}: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
    indigo: "bg-indigo-100 text-indigo-600",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-6 ${alert ? "ring-2 ring-red-500 ring-opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {alert && (
          <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
            <AlertCircle className="w-4 h-4" />
            Cần xử lý
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
