/**
 * Verification Management Component
 * For business users to review and approve/reject farmer verification documents
 */

import { useState, useEffect } from "react";
import {
  FileText,
  Check,
  X,
  Eye,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react";
import {
  getAllVerifications,
  updateVerificationStatus,
} from "../../lib/verification/verification.service";
import type { VerificationDocumentWithUser } from "../../types/verification";
import { useAuth } from "../../contexts/AuthContext";

export function VerificationManagement() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<VerificationDocumentWithUser[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [selectedDoc, setSelectedDoc] =
    useState<VerificationDocumentWithUser | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const result = await getAllVerifications(
        filter === "all" ? undefined : filter,
      );
      if (result.documents) {
        setDocuments(result.documents);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId: string) => {
    if (!profile?.id) return;

    // Validate document has image
    const doc = documents.find((d) => d.id === docId);
    if (!doc?.document_url || doc.document_url.trim() === "") {
      alert("Không thể duyệt: Giấy tờ không có ảnh hợp lệ");
      return;
    }

    setProcessing(docId);
    try {
      const result = await updateVerificationStatus(docId, {
        status: "approved",
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
      });

      if (result.success) {
        await loadDocuments();
        setSelectedDoc(null);
        alert("Đã duyệt giấy tờ thành công!");
      } else {
        alert("Lỗi: " + result.error);
      }
    } catch (error) {
      console.error("Error approving document:", error);
      alert("Không thể duyệt giấy tờ");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (docId: string) => {
    if (!profile?.id || !rejectionReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    setProcessing(docId);
    try {
      const result = await updateVerificationStatus(docId, {
        status: "rejected",
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      });

      if (result.success) {
        await loadDocuments();
        setSelectedDoc(null);
        setRejectionReason("");
      } else {
        alert("Lỗi: " + result.error);
      }
    } catch (error) {
      console.error("Error rejecting document:", error);
      alert("Không thể từ chối giấy tờ");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-green-100 text-green-800 border-green-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Đã từ chối",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${badges[status as keyof typeof badges]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Quản lý xác minh nông dân
          </h2>
          <p className="text-gray-600 mt-1">
            Xem xét và duyệt giấy xác nhận sản xuất nông nghiệp
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f === "all" && "Tất cả"}
            {f === "pending" && "Chờ duyệt"}
            {f === "approved" && "Đã duyệt"}
            {f === "rejected" && "Đã từ chối"}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Không có giấy tờ nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {doc.user_profile?.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    @{doc.user_profile?.username}
                  </p>
                </div>
              </div>

              {/* Document Preview */}
              <div className="relative mb-3">
                {doc.document_url ? (
                  <>
                    <img
                      src={doc.document_url}
                      alt="Document"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                      onClick={() => {
                        setSelectedDoc(doc);
                        setShowImageModal(true);
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f3f4f6' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif'%3EKhông tải được ảnh%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setShowImageModal(true);
                      }}
                      title="Xem ảnh lớn"
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                    >
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-red-600 font-medium">
                        Không có ảnh
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Date */}
              <div className="flex items-center justify-between mb-3">
                {getStatusBadge(doc.status)}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                </div>
              </div>

              {/* Actions */}
              {doc.status === "pending" && (
                <>
                  {!doc.document_url && (
                    <div className="text-xs text-red-600 flex items-start gap-2 p-2 bg-red-50 rounded mb-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Không thể duyệt: Giấy tờ không có ảnh hợp lệ</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(doc.id)}
                      disabled={processing === doc.id || !doc.document_url}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Duyệt
                    </button>
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      disabled={processing === doc.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Từ chối
                    </button>
                  </div>
                </>
              )}

              {doc.status === "rejected" && doc.rejection_reason && (
                <div className="text-xs text-red-600 flex items-start gap-2 p-2 bg-red-50 rounded">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{doc.rejection_reason}</span>
                </div>
              )}

              {doc.reference_link && (
                <a
                  href={doc.reference_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Xem mẫu giấy
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedDoc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Chi tiết giấy xác nhận</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  title="Đóng"
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <img
                src={selectedDoc.document_url}
                alt="Document"
                className="w-full rounded-lg mb-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif'%3EKhông tải được ảnh%3C/text%3E%3C/svg%3E";
                }}
              />

              {selectedDoc.status === "pending" &&
                !selectedDoc.status.includes("reject") && (
                  <div className="space-y-4">
                    {!selectedDoc.document_url && (
                      <div className="text-sm text-red-600 flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">
                          Không thể duyệt giấy tờ này vì không có ảnh hợp lệ
                        </span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lý do từ chối (nếu từ chối)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Nhập lý do từ chối..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedDoc.id)}
                        disabled={
                          processing === selectedDoc.id ||
                          !selectedDoc.document_url
                        }
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {processing === selectedDoc.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Check className="w-5 h-5" />
                        )}
                        Duyệt giấy tờ
                      </button>
                      <button
                        onClick={() => handleReject(selectedDoc.id)}
                        disabled={
                          processing === selectedDoc.id ||
                          !rejectionReason.trim()
                        }
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        {processing === selectedDoc.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                        Từ chối
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {selectedDoc && selectedDoc.status === "pending" && !showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Từ chối giấy tờ</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối <span className="text-red-600">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ví dụ: Giấy tờ không rõ ràng, thiếu thông tin..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleReject(selectedDoc.id)}
                disabled={
                  processing === selectedDoc.id || !rejectionReason.trim()
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing === selectedDoc.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
