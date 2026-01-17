import { useState, useEffect } from "react";
import {
  Activity,
  Loader2,
  Ban,
  Trash2,
  CheckCircle,
  XCircle,
  Edit,
} from "lucide-react";
import { getAdminLogs } from "../../../lib/admin/admin.service";
import type { AdminAction } from "../../../lib/admin/types";

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const result = await getAdminLogs(100);
    if (!result.error) {
      setLogs(result.logs);
    }
    setLoading(false);
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("ban")) return <Ban className="w-5 h-5" />;
    if (actionType.includes("delete")) return <Trash2 className="w-5 h-5" />;
    if (actionType.includes("approve"))
      return <CheckCircle className="w-5 h-5" />;
    if (actionType.includes("reject")) return <XCircle className="w-5 h-5" />;
    if (actionType.includes("change")) return <Edit className="w-5 h-5" />;
    return <Activity className="w-5 h-5" />;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("ban")) return "bg-red-100 text-red-600";
    if (actionType.includes("unban")) return "bg-green-100 text-green-600";
    if (actionType.includes("delete")) return "bg-red-100 text-red-600";
    if (actionType.includes("approve")) return "bg-green-100 text-green-600";
    if (actionType.includes("reject")) return "bg-yellow-100 text-yellow-600";
    return "bg-blue-100 text-blue-600";
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      ban_user: "Khóa tài khoản",
      unban_user: "Mở khóa tài khoản",
      delete_post: "Xóa bài viết",
      delete_product: "Xóa sản phẩm",
      delete_project: "Xóa dự án",
      delete_comment: "Xóa bình luận",
      approve_project: "Phê duyệt dự án",
      reject_project: "Từ chối dự án",
      change_role: "Thay đổi vai trò",
      resolve_report: "Xử lý báo cáo",
    };
    return labels[actionType] || actionType;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Lịch sử hoạt động Admin
            </h3>
            <p className="text-sm text-gray-600">100 hành động gần nhất</p>
          </div>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Làm mới"}
        </button>
      </div>

      {/* Logs Timeline */}
      <div className="p-6">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Chưa có hoạt động nào
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={log.id} className="flex gap-4 relative">
                {/* Timeline line */}
                {index < logs.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getActionColor(log.action_type)}`}
                >
                  {getActionIcon(log.action_type)}
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        {getActionLabel(log.action_type)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Target: {log.target_type} (ID:{" "}
                        {log.target_id.substring(0, 8)}...)
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  {log.reason && (
                    <div className="mt-2 p-2 bg-white rounded text-sm text-gray-700">
                      <strong>Lý do:</strong> {log.reason}
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded text-xs text-gray-600">
                      <strong>Chi tiết:</strong>{" "}
                      {JSON.stringify(log.metadata, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
