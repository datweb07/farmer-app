import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Trash2, Loader2, Eye } from "lucide-react";
import {
  getContentForModeration,
  moderateContent,
  deleteContent,
} from "../../../lib/admin/admin.service";
import type { ModerationContent } from "../../../lib/admin/types";

export function PostModeration() {
  const [posts, setPosts] = useState<ModerationContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ModerationContent | null>(
    null,
  );

  useEffect(() => {
    loadPosts();
  }, [statusFilter]);

  const loadPosts = async () => {
    setLoading(true);
    const result = await getContentForModeration("posts", statusFilter, 50);
    if (!result.error) {
      setPosts(result.content);
    }
    setLoading(false);
  };

  const handleApprove = async (postId: string) => {
    setActionLoading(postId);
    const result = await moderateContent({
      content_type: "post",
      content_id: postId,
      new_status: "approved",
    });

    if (result.success) {
      await loadPosts();
      alert("Đã phê duyệt bài viết");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const handleReject = async (postId: string) => {
    const note = prompt("Lý do từ chối (sẽ được gửi cho người dùng):");
    if (!note) return;

    setActionLoading(postId);
    const result = await moderateContent({
      content_type: "post",
      content_id: postId,
      new_status: "rejected",
      note,
    });

    if (result.success) {
      await loadPosts();
      alert("Đã từ chối bài viết");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const handleDelete = async (postId: string) => {
    const reason = prompt("Lý do xóa bài viết (bắt buộc):");
    if (!reason) return;

    if (!confirm("Bạn có chắc chắn muốn XÓA VĨNH VIỄN bài viết này?")) return;

    setActionLoading(postId);
    const result = await deleteContent({
      content_type: "post",
      content_id: postId,
      reason,
    });

    if (result.success) {
      await loadPosts();
      alert("Đã xóa bài viết");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
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

      {/* Posts List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Không có bài viết nào
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="p-6 hover:bg-gray-50">
              <div className="flex gap-4">
                {/* Thumbnail */}
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {post.content}
                      </p>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span>
                      Tác giả: <strong>{post.author_name}</strong>
                    </span>
                    <span>•</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        post.category === "experience"
                          ? "bg-blue-100 text-blue-800"
                          : post.category === "salinity-solution"
                            ? "bg-green-100 text-green-800"
                            : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {post.category === "experience" && "Kinh nghiệm"}
                      {post.category === "salinity-solution" && "Giải pháp mặn"}
                      {post.category === "product" && "Sản phẩm"}
                    </span>
                    {post.likes_count !== undefined && (
                      <>
                        <span>•</span>
                        <span>{post.likes_count} likes</span>
                        <span>{post.comments_count} comments</span>
                      </>
                    )}
                  </div>

                  {/* Moderation note */}
                  {post.moderation_note && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      <strong>Ghi chú:</strong> {post.moderation_note}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Xem chi tiết
                    </button>
                    {statusFilter === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(post.id)}
                          disabled={actionLoading === post.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Phê duyệt
                        </button>
                        <button
                          onClick={() => handleReject(post.id)}
                          disabled={actionLoading === post.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Từ chối
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={actionLoading === post.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === post.id ? (
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
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPost.title}
                </h2>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {selectedPost.image_url && (
                <img
                  src={selectedPost.image_url}
                  alt={selectedPost.title}
                  className="w-full rounded-lg mb-4"
                />
              )}
              <div className="prose max-w-none mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedPost.content}
                </p>
              </div>
              <div className="text-sm text-gray-500 border-t pt-4">
                <p>
                  Tác giả: <strong>{selectedPost.author_name}</strong>
                </p>
                <p>
                  Ngày tạo:{" "}
                  {new Date(selectedPost.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
