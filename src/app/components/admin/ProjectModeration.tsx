import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Eye,
  DollarSign,
  Users,
  Calendar,
} from "lucide-react";
import {
  getContentForModeration,
  moderateContent,
  deleteContent,
} from "../../../lib/admin/admin.service";
import type { ModerationContent } from "../../../lib/admin/types";
import { sendApprovalNotification } from "../../../lib/notifications/approval-notifications";

export function ProjectModeration() {
  const [projects, setProjects] = useState<ModerationContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] =
    useState<ModerationContent | null>(null);

  useEffect(() => {
    loadProjects();
  }, [statusFilter]);

  const loadProjects = async () => {
    setLoading(true);
    const result = await getContentForModeration("projects", statusFilter, 50);
    if (!result.error) {
      setProjects(result.content);
    }
    setLoading(false);
  };

  const handleApprove = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    if (
      !confirm(
        "Phê duyệt dự án này? Dự án sẽ được hiển thị công khai và có thể nhận đầu tư.",
      )
    )
      return;

    setActionLoading(projectId);
    const result = await moderateContent({
      content_type: "project",
      content_id: projectId,
      new_status: "approved",
    });

    if (result.success) {
      // Send notification to project creator
      await sendApprovalNotification({
        userId: project.user_id,
        contentType: "project",
        contentId: projectId,
        contentTitle: project.title || "Dự án",
      });

      await loadProjects();
      alert("Đã phê duyệt dự án và gửi thông báo cho người tạo");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const handleReject = async (projectId: string) => {
    const note = prompt("Lý do từ chối (sẽ được gửi cho người tạo dự án):");
    if (!note) return;

    setActionLoading(projectId);
    const result = await moderateContent({
      content_type: "project",
      content_id: projectId,
      new_status: "rejected",
      note,
    });

    if (result.success) {
      await loadProjects();
      alert("Đã từ chối dự án");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const handleDelete = async (projectId: string) => {
    const reason = prompt("Lý do xóa dự án (bắt buộc):");
    if (!reason) return;

    if (
      !confirm(
        "Bạn có chắc chắn muốn XÓA VĨNH VIỄN dự án này? Hành động này không thể hoàn tác!",
      )
    )
      return;

    setActionLoading(projectId);
    const result = await deleteContent({
      content_type: "project",
      content_id: projectId,
      reason,
    });

    if (result.success) {
      await loadProjects();
      alert("Đã xóa dự án");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min(100, Math.round((current / goal) * 100));
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
            {(["pending", "approved", "rejected"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {status === "pending" && "Chờ duyệt"}
                {status === "approved" && "Đã duyệt"}
                {status === "rejected" && "Đã từ chối"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Không có dự án nào
          </div>
        ) : (
          projects.map((project) => {
            const progress = calculateProgress(
              project.current_funding || 0,
              project.funding_goal || 1,
            );
            return (
              <div key={project.id} className="p-6 hover:bg-gray-50">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  {project.image_url && (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {project.title}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusFilter === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : statusFilter === "approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                      >
                        {statusFilter === "pending" && "Chờ duyệt"}
                        {statusFilter === "approved" && "Đã duyệt"}
                        {statusFilter === "rejected" && "Đã từ chối"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {project.description}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Mục tiêu</p>
                          <p className="font-semibold text-gray-900">
                            {((project.funding_goal || 0) / 1000000).toFixed(0)}
                            M VNĐ
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-gray-500">Đã huy động</p>
                          <p className="font-semibold text-gray-900">
                            {((project.current_funding || 0) / 1000000).toFixed(
                              1,
                            )}
                            M VNĐ
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-gray-500">Tiến độ</p>
                          <p className="font-semibold text-gray-900">
                            {progress}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <p className="text-sm text-gray-500 mb-3">
                      Người tạo: <strong>{project.creator_name}</strong>
                    </p>

                    {/* Moderation note */}
                    {project.moderation_note && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <strong>Ghi chú kiểm duyệt:</strong>{" "}
                        {project.moderation_note}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedProject(project)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </button>
                      {statusFilter === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(project.id)}
                            disabled={actionLoading === project.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === project.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Phê duyệt
                          </button>
                          <button
                            onClick={() => handleReject(project.id)}
                            disabled={actionLoading === project.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === project.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Từ chối
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={actionLoading === project.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProject.title}
                </h2>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {selectedProject.image_url && (
                <img
                  src={selectedProject.image_url}
                  alt={selectedProject.title}
                  className="w-full rounded-lg mb-4"
                />
              )}
              <div className="space-y-4 mb-4">
                <div>
                  <h3 className="font-semibold mb-2">Mô tả dự án:</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedProject.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold">Mục tiêu gọi vốn:</span>
                    <p className="text-green-600 font-bold text-lg">
                      {((selectedProject.funding_goal || 0) / 1000000).toFixed(
                        0,
                      )}{" "}
                      triệu VNĐ
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">Đã huy động:</span>
                    <p className="text-blue-600 font-bold text-lg">
                      {(
                        (selectedProject.current_funding || 0) / 1000000
                      ).toFixed(1)}{" "}
                      triệu VNĐ
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 border-t pt-4">
                <p>
                  Người tạo: <strong>{selectedProject.creator_name}</strong>
                </p>
                <p>
                  Ngày tạo:{" "}
                  {new Date(selectedProject.created_at).toLocaleString("vi-VN")}
                </p>
                {selectedProject.moderated_at && (
                  <p>
                    Ngày kiểm duyệt:{" "}
                    {new Date(selectedProject.moderated_at).toLocaleString(
                      "vi-VN",
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
