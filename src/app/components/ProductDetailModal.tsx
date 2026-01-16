import { useEffect, useState } from "react";
import {
  X,
  Phone,
  Award,
  Tag,
  Eye,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ProductWithStats } from "../../lib/community/types";
import { formatPrice, getZaloLink } from "../../lib/community/products.service";
import { supabase } from "../../lib/supabase/supabase";
import { ImageGallery } from "./ImageGallery";

interface ProductDetailModalProps {
  product: ProductWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  isOwner = false,
  onEdit,
  onDelete,
  deleting,
}: ProductDetailModalProps) {
  const [productImages, setProductImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  // Fetch product images
  useEffect(() => {
    if (!product || !isOpen) return;

    const loadProductImages = async () => {
      setLoadingImages(true);
      try {
        const { data, error } = await supabase
          .from("product_images")
          .select("image_url")
          .eq("product_id", product.id)
          .order("display_order");

        if (error) throw error;

        if (data && data.length > 0) {
          setProductImages(data.map((img: any) => img.image_url));
        } else if (product.image_url) {
          // Fallback to legacy single image
          setProductImages([product.image_url]);
        }
      } catch (error) {
        console.error("Error loading product images:", error);
        // Fallback to legacy single image
        if (product.image_url) {
          setProductImages([product.image_url]);
        }
      } finally {
        setLoadingImages(false);
      }
    };

    loadProductImages();
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZaloContact = () => {
    const zaloLink = getZaloLink(product.contact);
    window.open(zaloLink, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Modal Header */}
            <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {product.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      <Tag className="w-3 h-3" />
                      {product.category}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      <Eye className="w-3 h-3" />
                      {product.views_count} lượt xem
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] overflow-y-auto">
              {/* Product Images - Gallery */}
              {!loadingImages && productImages.length > 0 ? (
                <div className="w-full bg-gray-900">
                  <ImageGallery images={productImages} />
                </div>
              ) : loadingImages ? (
                <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-500">Đang tải ảnh...</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                  <Tag className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Product Details */}
              <div className="px-6 py-6 space-y-6">
                {/* Price Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 font-medium mb-1">
                    Giá bán
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatPrice(product.price)}
                  </p>
                </div>

                {/* Description Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Mô tả sản phẩm
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>

                {/* Seller Information */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Thông tin người bán
                  </h3>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Tên người bán
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {product.seller_username}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
                      <Award className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-blue-700">Điểm uy tín</p>
                        <p className="text-lg font-bold text-blue-600">
                          {product.seller_points}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Liên hệ mua hàng
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Số điện thoại</p>
                    <p className="text-lg font-medium text-gray-900">
                      {product.contact}
                    </p>
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    ⚠️ Lưu ý khi mua hàng
                  </h4>
                  <ul className="space-y-1 text-sm text-yellow-800">
                    <li>• Kiểm tra kỹ sản phẩm trước khi thanh toán</li>
                    <li>• Gặp mặt tại địa điểm công cộng nếu có thể</li>
                    <li>• Không chuyển tiền trước khi nhận hàng</li>
                    <li>• Báo cáo nếu phát hiện gian lận</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div
                className={`grid grid-cols-1 ${
                  isOwner ? "md:grid-cols-3" : "md:grid-cols-2"
                } gap-3`}
              >
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Đóng
                </button>
                {isOwner ? (
                  <>
                    <button
                      onClick={onEdit}
                      className="w-full px-6 py-3 border border-blue-200 text-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="w-5 h-5" />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={onDelete}
                      disabled={deleting}
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-60"
                    >
                      {deleting ? (
                        <span>Đang xóa...</span>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5" />
                          Xóa sản phẩm
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleZaloContact}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    Liên hệ Zalo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
