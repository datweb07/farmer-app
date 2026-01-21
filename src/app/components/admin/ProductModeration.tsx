import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Eye,
  DollarSign,
} from "lucide-react";
import {
  getContentForModeration,
  moderateContent,
  deleteContent,
} from "../../../lib/admin/admin.service";
import type { ModerationContent } from "../../../lib/admin/types";
import { sendApprovalNotification } from "../../../lib/notifications/approval-notifications";

export function ProductModeration() {
  const [products, setProducts] = useState<ModerationContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<ModerationContent | null>(null);

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const loadProducts = async () => {
    setLoading(true);
    const result = await getContentForModeration("products", statusFilter, 50);
    if (!result.error) {
      setProducts(result.content);
    }
    setLoading(false);
  };

  const handleApprove = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setActionLoading(productId);
    const result = await moderateContent({
      content_type: "product",
      content_id: productId,
      new_status: "approved",
    });

    if (result.success) {
      // Send notification to product seller
      await sendApprovalNotification({
        userId: product.user_id,
        contentType: "product",
        contentId: productId,
        contentTitle: product.name || "Sản phẩm",
      });

      await loadProducts();
      alert("Đã phê duyệt sản phẩm và gửi thông báo cho người bán");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const handleReject = async (productId: string) => {
    const note = prompt("Lý do từ chối (sẽ được gửi cho người dùng):");
    if (!note) return;

    setActionLoading(productId);
    const result = await moderateContent({
      content_type: "product",
      content_id: productId,
      new_status: "rejected",
      note,
    });

    if (result.success) {
      await loadProducts();
      alert("Đã từ chối sản phẩm");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const handleDelete = async (productId: string) => {
    const reason = prompt("Lý do xóa sản phẩm (bắt buộc):");
    if (!reason) return;

    if (!confirm("Bạn có chắc chắn muốn XÓA VĨNH VIỄN sản phẩm này?")) return;

    setActionLoading(productId);
    const result = await deleteContent({
      content_type: "product",
      content_id: productId,
      reason,
    });

    if (result.success) {
      await loadProducts();
      alert("Đã xóa sản phẩm");
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

      {/* Products Grid */}
      <div className="p-6">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Không có sản phẩm nào
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  {/* Price & Category */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 text-green-600 font-semibold">
                      <DollarSign className="w-4 h-4" />
                      {product.price?.toLocaleString("vi-VN")} VNĐ
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {product.category}
                    </span>
                  </div>

                  {/* Seller */}
                  <p className="text-sm text-gray-500 mb-3">
                    Người bán: <strong>{product.seller_name}</strong>
                  </p>

                  {/* Moderation note */}
                  {product.moderation_note && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>Ghi chú:</strong> {product.moderation_note}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border"
                    >
                      <Eye className="w-4 h-4" />
                      Xem chi tiết
                    </button>
                    {statusFilter === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApprove(product.id)}
                          disabled={actionLoading === product.id}
                          className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleReject(product.id)}
                          disabled={actionLoading === product.id}
                          className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Từ chối
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={actionLoading === product.id}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === product.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProduct.name}
                </h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {selectedProduct.image_url && (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full rounded-lg mb-4"
                />
              )}
              <div className="space-y-3 mb-4">
                <div>
                  <span className="font-semibold">Giá:</span>{" "}
                  <span className="text-green-600 font-bold">
                    {selectedProduct.price?.toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Danh mục:</span>{" "}
                  {selectedProduct.category}
                </div>
                <div>
                  <span className="font-semibold">Mô tả:</span>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                    {selectedProduct.description}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500 border-t pt-4">
                <p>
                  Người bán: <strong>{selectedProduct.seller_name}</strong>
                </p>
                <p>
                  Ngày tạo:{" "}
                  {new Date(selectedProduct.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
