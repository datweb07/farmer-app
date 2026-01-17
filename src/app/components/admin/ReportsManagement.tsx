import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  ShoppingBag,
  TrendingUp,
  User,
  MessageSquare,
} from "lucide-react";
import { getReports, resolveReport } from "../../../lib/admin/admin.service";
import type { ContentReport } from "../../../lib/admin/types";

export function ReportsManagement() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "reviewing" | "resolved" | "dismissed"
  >("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    const result = await getReports(statusFilter, 50);
    if (!result.error) {
      setReports(result.reports);
    }
    setLoading(false);
  };

  const handleResolve = async (
    reportId: string,
    status: "resolved" | "dismissed",
  ) => {
    const note = prompt(
      status === "resolved"
        ? "Ghi chú xử lý (đã xử lý vi phạm):"
        : "Lý do bỏ qua (không phải vi phạm):",
    );

    setActionLoading(reportId);
    const result = await resolveReport({
      report_id: reportId,
      new_status: status,
      resolution_note: note || undefined,
    });

    if (result.success) {
      await loadReports();
      alert(status === "resolved" ? "Đã xử lý báo cáo" : "Đã bỏ qua báo cáo");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="w-5 h-5" />;
      case "product":
        return <ShoppingBag className="w-5 h-5" />;
      case "project":
        return <TrendingUp className="w-5 h-5" />;
      case "comment":
        return <MessageSquare className="w-5 h-5" />;
      case "user":
        return <User className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors = {
      spam: "bg-orange-100 text-orange-800",
      inappropriate: "bg-red-100 text-red-800",
      harassment: "bg-purple-100 text-purple-800",
      misleading: "bg-yellow-100 text-yellow-800",
      other: "bg-gray-100 text-gray-800",
    };
    const labels = {
      spam: "Spam",
      inappropriate: "Không phù hợp",
      harassment: "Quấy rối",
      misleading: "Gây hiểu lầm",
      other: "Khác",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${colors[reason as keyof typeof colors]}`}
      >
        {labels[reason as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Filter */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Trạng thái:
          </label>
          <div className="flex gap-2">
            {(["pending", "reviewing", "resolved", "dismissed"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status === "pending" && "Chờ xử lý"}
                  {status === "reviewing" && "Đang xem xét"}
                  {status === "resolved" && "Đã xử lý"}
                  {status === "dismissed" && "Đã bỏ qua"}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Không có báo cáo nào
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  {getContentTypeIcon(report.content_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          Báo cáo {report.content_type === "post" && "bài viết"}
                          {report.content_type === "product" && "sản phẩm"}
                          {report.content_type === "project" && "dự án"}
                          {report.content_type === "comment" && "bình luận"}
                          {report.content_type === "user" && "người dùng"}
                        </h3>
                        {getReasonBadge(report.reason)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Người báo cáo: <strong>{report.reporter_name}</strong>
                      </p>
                      {report.description && (
                        <p className="text-sm text-gray-700 mb-2">
                          {report.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(report.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  {/* Resolution info */}
                  {report.resolved_at && (
                    <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {report.status === "resolved" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-600" />
                        )}
                        <span className="font-medium">
                          {report.status === "resolved"
                            ? "Đã xử lý"
                            : "Đã bỏ qua"}
                        </span>
                        <span className="text-gray-500">
                          bởi {report.resolver_name}
                        </span>
                      </div>
                      {report.resolution_note && (
                        <p className="text-gray-700 mt-1">
                          {report.resolution_note}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {statusFilter === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolve(report.id, "resolved")}
                        disabled={actionLoading === report.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === report.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Đã xử lý vi phạm
                      </button>
                      <button
                        onClick={() => handleResolve(report.id, "dismissed")}
                        disabled={actionLoading === report.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === report.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Bỏ qua
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
