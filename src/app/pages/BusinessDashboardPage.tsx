import { useState, useEffect } from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Download,
  Filter,
  Trash2,
  Check,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase/supabase";
import {
  getUserTransactions,
  getPaymentDashboardStats,
} from "../../lib/payment/payment.service";
import type {
  PaymentTransactionWithDetails,
  PaymentDashboardStats,
} from "../../lib/payment/types";
import { CreditLimitManager } from "../components/CreditLimitManager";
import { CustomerLinksSection } from "../components/CustomerLinksSection";

export function BusinessDashboardPage() {
  const {} = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentDashboardStats | null>(null);
  const [transactions, setTransactions] = useState<
    PaymentTransactionWithDetails[]
  >([]);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month" | "year"
  >("month");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [chartType, setChartType] = useState<"revenue" | "orders">("revenue");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "credit" | "customers"
  >("dashboard");
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedVerificationDoc, setSelectedVerificationDoc] =
    useState<any>(null);
  const [loadingVerification, setLoadingVerification] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod, selectedStatus]);

  const loadDashboardData = async () => {
    setLoading(true);

    // Load stats
    const statsResult = await getPaymentDashboardStats();
    if (statsResult.stats) {
      setStats(statsResult.stats);
    }

    // Load transactions
    const filters: any = { role: "seller" };
    if (selectedStatus !== "all") {
      filters.status = selectedStatus;
    }

    const txnResult = await getUserTransactions(filters);
    if (!txnResult.error) {
      setTransactions(txnResult.transactions);
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: "Chờ xử lý",
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      processing: {
        label: "Đang xử lý",
        color: "bg-blue-100 text-blue-800",
        icon: AlertCircle,
      },
      completed: {
        label: "Hoàn thành",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      failed: {
        label: "Thất bại",
        color: "bg-red-100 text-red-800",
        icon: XCircle,
      },
      cancelled: {
        label: "Đã hủy",
        color: "bg-gray-100 text-gray-800",
        icon: XCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      bank_transfer: "Chuyển khoản",
      e_wallet: "Ví điện tử",
      credit_card: "Thẻ tín dụng",
      cash: "Tiền mặt",
      credit: "Công nợ",
    };
    return methods[method] || method;
  };

  // Prepare chart data
  const getChartData = () => {
    const dataMap = new Map<
      string,
      { date: string; revenue: number; orders: number }
    >();

    transactions.forEach((txn) => {
      if (txn.status !== "completed") return;

      const date = new Date(txn.created_at);
      const dateKey = date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { date: dateKey, revenue: 0, orders: 0 });
      }

      const current = dataMap.get(dateKey)!;
      current.revenue += Number(txn.final_amount);
      current.orders += 1;
    });

    return Array.from(dataMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.date.split("/").map(Number);
      const [dayB, monthB] = b.date.split("/").map(Number);
      return monthA !== monthB ? monthA - monthB : dayA - dayB;
    });
  };

  // Delete transaction
  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/payment_transactions?id=eq.${transactionToDelete}`,
        {
          method: "DELETE",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        // Refresh data
        await loadDashboardData();
        setDeleteModalOpen(false);
        setTransactionToDelete(null);
      } else {
        alert("Không thể xóa đơn hàng. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Có lỗi xảy ra khi xóa đơn hàng.");
    } finally {
      setDeleting(false);
    }
  };

  // Load verification document for transaction
  const handleViewVerification = async (transactionId: string) => {
    setLoadingVerification(true);
    setVerificationModalOpen(true);

    try {
      const { data, error } = await supabase
        .from("verification_documents")
        .select(
          `
          *,
          user_profile:profiles!user_id(username, avatar_url)
        `,
        )
        .eq("transaction_id", transactionId)
        .maybeSingle();

      if (error) {
        console.error("Error loading verification:", error);
        setSelectedVerificationDoc(null);
      } else {
        setSelectedVerificationDoc(data);
      }
    } catch (error) {
      console.error("Exception loading verification:", error);
      setSelectedVerificationDoc(null);
    } finally {
      setLoadingVerification(false);
    }
  };

  // Approve verification
  const handleApproveVerification = async () => {
    if (!selectedVerificationDoc) return;

    try {
      const { error } = await (supabase as any)
        .from("verification_documents")
        .update({
          status: "approved",
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedVerificationDoc.id);

      if (error) {
        alert("Lỗi: " + error.message);
      } else {
        alert("Đã duyệt giấy tờ thành công!");
        setVerificationModalOpen(false);
        setSelectedVerificationDoc(null);
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error approving verification:", error);
      alert("Không thể duyệt giấy tờ");
    }
  };

  // Reject verification
  const handleRejectVerification = async (reason: string) => {
    if (!selectedVerificationDoc || !reason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("verification_documents")
        .update({
          status: "rejected",
          rejection_reason: reason,
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedVerificationDoc.id);

      if (error) {
        alert("Lỗi: " + error.message);
      } else {
        alert("Đã từ chối giấy tờ");
        setVerificationModalOpen(false);
        setSelectedVerificationDoc(null);
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error rejecting verification:", error);
      alert("Không thể từ chối giấy tờ");
    }
  };

  // Confirm transaction (change status to completed)
  const handleConfirmTransaction = async (transactionId: string) => {
    try {
      const { error } = await (supabase.from("payment_transactions") as any)
        .update({ status: "completed" })
        .eq("id", transactionId)
        .select();

      if (error) {
        console.error("Error confirming transaction:", error);
        alert("Không thể xác nhận đơn hàng. Vui lòng thử lại.");
        return;
      }

      // Refresh data
      await loadDashboardData();
    } catch (error) {
      console.error("Confirm error:", error);
      alert("Có lỗi xảy ra khi xác nhận đơn hàng.");
    }
  };

  // Export report as CSV
  const handleExportReport = () => {
    const csvHeader =
      "Mã đơn,Khách hàng,Loại,Phương thức,Số tiền,Trạng thái,Thời gian\n";
    const csvRows = transactions
      .map((txn) => {
        return [
          txn.transaction_code,
          txn.buyer_username || "N/A",
          txn.type === "immediate"
            ? "Trả liền"
            : txn.type === "credit"
              ? "Công nợ"
              : txn.type,
          getPaymentMethodLabel(txn.payment_method || ""),
          Number(txn.final_amount),
          txn.status,
          formatDate(txn.created_at),
        ].join(",");
      })
      .join("\n");

    const csvContent = csvHeader + csvRows;
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bao-cao-don-hang-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate summary stats
  const totalRevenue = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + Number(t.final_amount), 0);

  const totalOrders = transactions.length;
  const completedOrders = transactions.filter(
    (t) => t.status === "completed",
  ).length;
  const pendingOrders = transactions.filter(
    (t) => t.status === "pending" || t.status === "processing",
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Quản Lý Bán Hàng
          </h1>
          <p className="text-gray-600">
            Theo dõi doanh thu, đơn hàng và hiệu suất kinh doanh
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Dashboard & Đơn hàng
              </div>
            </button>
            <button
              onClick={() => setActiveTab("credit")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "credit"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5" />
                Quản lý hạn mức tín dụng
              </div>
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "customers"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Quản lý khách hàng
              </div>
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "credit" ? (
          <CreditLimitManager />
        ) : activeTab === "customers" ? (
          <CustomerLinksSection />
        ) : (
          <>
            {/* Period Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Thời gian:
                  </span>
                  <div className="flex gap-2">
                    {[
                      { value: "today", label: "Hôm nay" },
                      { value: "week", label: "7 ngày" },
                      { value: "month", label: "30 ngày" },
                      { value: "year", label: "Năm nay" },
                    ].map((period) => (
                      <button
                        key={period.value}
                        onClick={() =>
                          setSelectedPeriod(
                            period.value as "today" | "week" | "month" | "year",
                          )
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedPeriod === period.value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleExportReport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Xuất báo cáo</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-blue-100 text-sm mb-1">Tổng doanh thu</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-blue-100 text-xs mt-2">
                  +12.5% so với tháng trước
                </p>
              </div>

              {/* Total Orders */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-green-100 text-sm mb-1">Tổng đơn hàng</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-green-100 text-xs mt-2">
                  {completedOrders} hoàn thành
                </p>
              </div>

              {/* Pending Orders */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                  <AlertCircle className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-orange-100 text-sm mb-1">Đơn chờ xử lý</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
                <p className="text-orange-100 text-xs mt-2">Cần xử lý ngay</p>
              </div>

              {/* Credit Sales */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <TrendingUp className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-purple-100 text-sm mb-1">Doanh số công nợ</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.total_credit_issued || 0)}
                </p>
                <p className="text-purple-100 text-xs mt-2">
                  {transactions.filter((t) => t.type === "credit").length} giao
                  dịch
                </p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Biểu đồ {chartType === "revenue" ? "doanh thu" : "đơn hàng"}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType("revenue")}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      chartType === "revenue"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Doanh thu
                  </button>
                  <button
                    onClick={() => setChartType("orders")}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      chartType === "orders"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Đơn hàng
                  </button>
                </div>
              </div>
              <div className="h-64 min-h-[256px]">
                {getChartData().length === 0 ? (
                  <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">
                        Chưa có dữ liệu
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Dữ liệu sẽ hiển thị khi có đơn hàng hoàn thành
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "revenue" ? (
                      <LineChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                          tickFormatter={(value) =>
                            `${(value / 1000000).toFixed(0)}M`
                          }
                        />
                        <Tooltip
                          formatter={(value: number | undefined) =>
                            value ? formatCurrency(value) : "0 ₫"
                          }
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Doanh thu"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: "#3b82f6", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    ) : (
                      <BarChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                        />
                        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="orders"
                          name="Số đơn hàng"
                          fill="#10b981"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Danh sách đơn hàng
                </h2>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="failed">Thất bại</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    Chưa có đơn hàng nào
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Đơn hàng sẽ xuất hiện ở đây khi có khách mua
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Mã đơn
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Khách hàng
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Loại
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Phương thức
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                          Số tiền
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                          Trạng thái
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Thời gian
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactions.map((txn) => (
                        <tr
                          key={txn.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <p className="text-sm font-mono font-medium text-blue-600">
                              {txn.transaction_code}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {txn.buyer_avatar_url ? (
                                <img
                                  src={txn.buyer_avatar_url}
                                  alt={txn.buyer_username || "User"}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {txn.buyer_username?.[0]?.toUpperCase() ||
                                    "?"}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {txn.buyer_username || "N/A"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-700 capitalize">
                              {txn.type === "immediate"
                                ? "Trả liền"
                                : txn.type === "credit"
                                  ? "Công nợ"
                                  : txn.type}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-700">
                              {getPaymentMethodLabel(txn.payment_method || "")}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(Number(txn.final_amount))}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {getStatusBadge(txn.status)}
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-600">
                              {formatDate(txn.created_at)}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {txn.type === "credit" &&
                                txn.payment_method === "credit" && (
                                  <button
                                    onClick={() =>
                                      handleViewVerification(txn.id)
                                    }
                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                                    title="Xem giấy xác nhận"
                                  >
                                    <FileText className="w-4 h-4" />
                                    Xem giấy tờ
                                  </button>
                                )}
                              {txn.status === "pending" && (
                                <button
                                  onClick={() =>
                                    handleConfirmTransaction(txn.id)
                                  }
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
                                  title="Xác nhận đơn hàng"
                                >
                                  <Check className="w-4 h-4" />
                                  Xác nhận
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(txn.id)}
                                className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa đơn hàng"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <button className="p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-600 transition-colors">
                    <Package className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Đăng sản phẩm mới
                    </p>
                    <p className="text-sm text-gray-600">
                      Thêm sản phẩm vào shop
                    </p>
                  </div>
                </div>
              </button>

              <button className="p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-600 transition-colors">
                    <Users className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Quản lý khách hàng
                    </p>
                    <p className="text-sm text-gray-600">
                      Xem danh sách khách hàng
                    </p>
                  </div>
                </div>
              </button>

              <button className="p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-600 transition-colors">
                    <CreditCard className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Quản lý công nợ
                    </p>
                    <p className="text-sm text-gray-600">
                      Theo dõi khoản phải thu
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Xác nhận xóa đơn hàng
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không
                    thể hoàn tác.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setTransactionToDelete(null);
                      }}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {deleting ? "Đang xóa..." : "Xóa đơn hàng"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Document Modal */}
            {verificationModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
                onClick={() => {
                  setVerificationModalOpen(false);
                  setSelectedVerificationDoc(null);
                }}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {loadingVerification ? (
                    <div className="p-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Đang tải giấy tờ...</p>
                    </div>
                  ) : !selectedVerificationDoc ? (
                    <div className="p-12 text-center">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Không tìm thấy giấy tờ
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Đơn hàng này chưa có giấy xác nhận được upload.
                      </p>
                      <button
                        onClick={() => {
                          setVerificationModalOpen(false);
                          setSelectedVerificationDoc(null);
                        }}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Đóng
                      </button>
                    </div>
                  ) : (
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            Giấy xác nhận sản xuất nông nghiệp
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Nông dân:{" "}
                            {selectedVerificationDoc.user_profile?.username}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setVerificationModalOpen(false);
                            setSelectedVerificationDoc(null);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <XCircle className="w-6 h-6 text-gray-600" />
                        </button>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                        {selectedVerificationDoc.status === "pending" && (
                          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full text-sm font-semibold">
                            Chờ duyệt
                          </span>
                        )}
                        {selectedVerificationDoc.status === "approved" && (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-sm font-semibold">
                            Đã duyệt
                          </span>
                        )}
                        {selectedVerificationDoc.status === "rejected" && (
                          <span className="inline-block px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full text-sm font-semibold">
                            Đã từ chối
                          </span>
                        )}
                      </div>

                      {/* Document Image */}
                      <div className="mb-6">
                        <img
                          src={selectedVerificationDoc.document_url}
                          alt="Verification Document"
                          className="w-full rounded-lg border border-gray-300 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif'%3EKhông tải được ảnh%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>

                      {/* Rejection Reason (if rejected) */}
                      {selectedVerificationDoc.status === "rejected" &&
                        selectedVerificationDoc.rejection_reason && (
                          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-800 mb-1">
                              Lý do từ chối:
                            </p>
                            <p className="text-sm text-red-700">
                              {selectedVerificationDoc.rejection_reason}
                            </p>
                          </div>
                        )}

                      {/* Actions (only for pending status) */}
                      {selectedVerificationDoc.status === "pending" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Lý do từ chối (nếu từ chối)
                            </label>
                            <textarea
                              id="rejection-reason"
                              placeholder="Nhập lý do từ chối..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={handleApproveVerification}
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Duyệt giấy tờ
                            </button>
                            <button
                              onClick={() => {
                                const textarea = document.getElementById(
                                  "rejection-reason",
                                ) as HTMLTextAreaElement;
                                const reason = textarea?.value || "";
                                handleRejectVerification(reason);
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                            >
                              <XCircle className="w-5 h-5" />
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
