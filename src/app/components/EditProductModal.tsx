import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { X, Image, Loader2, Package } from "lucide-react";
import { updateProduct } from "../../lib/community/products.service";
import { validateImageFile } from "../../lib/community/image-upload";
import type {
  ProductWithStats,
  UpdateProductData,
} from "../../lib/community/types";

interface EditProductModalProps {
  isOpen: boolean;
  product: ProductWithStats | null;
  onClose: () => void;
  onSuccess: (updatedId?: string) => void;
}

export function EditProductModal({
  isOpen,
  product,
  onClose,
  onSuccess,
}: EditProductModalProps) {
  const [formData, setFormData] = useState<UpdateProductData>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "Thiết bị đo", label: "Thiết bị đo" },
    { value: "Giống cây trồng", label: "Giống cây" },
    { value: "Máy móc", label: "Máy móc" },
    { value: "Phân bón", label: "Phân bón" },
    { value: "Vật tư", label: "Vật tư" },
    { value: "Hệ thống tưới", label: "Tưới tiêu" },
  ];

  useEffect(() => {
    if (!isOpen || !product) return;
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      contact: product.contact,
    });
    setImagePreview(product.image_url || null);
    setImageFile(null);
    setRemoveImage(false);
    setError(null);
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setError(null);

    if (!formData.name?.trim()) {
      setError("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (!formData.description?.trim()) {
      setError("Vui lòng nhập mô tả sản phẩm");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setError("Vui lòng nhập giá hợp lệ");
      return;
    }
    if (!formData.contact?.trim()) {
      setError("Vui lòng nhập số điện thoại liên hệ");
      return;
    }

    const phoneRegex = /^[0-9]{10,11}$/;
    const cleanPhone = formData.contact.replace(/\D/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      setError("Số điện thoại không hợp lệ (10-11 số)");
      return;
    }

    setLoading(true);

    try {
      const payload: UpdateProductData = {
        ...formData,
        contact: cleanPhone,
        removeImage,
      };

      if (imageFile) {
        payload.image = imageFile;
      }

      const result = await updateProduct(product.id, payload);
      if (result.success) {
        onSuccess(product.id);
        onClose();
      } else {
        setError(result.error || "Không thể cập nhật sản phẩm");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi không mong muốn");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Chỉnh sửa sản phẩm
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Cập nhật thông tin và hình ảnh
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ví dụ: Máy đo độ mặn cầm tay"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Danh mục sản phẩm
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, category: cat.value })
                        }
                        className={`p-2 rounded-lg border text-xs transition-colors ${
                          formData.category === cat.value
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-300 bg-white text-gray-600 hover:border-blue-400"
                        }`}
                        disabled={loading}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Giá bán
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.price ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="Nhập giá sản phẩm"
                      min="0"
                      step="1000"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                      required
                      disabled={loading}
                    />
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ₫
                    </div>
                  </div>
                  {formData.price && formData.price > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(formData.price)}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Mô tả chi tiết sản phẩm..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Mô tả rõ ràng giúp tăng tỉ lệ mua hàng
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    value={formData.contact || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    placeholder="0912345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Khách hàng sẽ liên hệ qua số này
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Hình ảnh sản phẩm
                  </label>
                  {imagePreview ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            setRemoveImage(true);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                          disabled={loading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {product.image_url && !imageFile && !removeImage && (
                        <p className="text-xs text-gray-500">
                          Giữ nguyên ảnh hiện tại hoặc thay mới
                        </p>
                      )}
                    </div>
                  ) : (
                    <label
                      className={`block cursor-pointer ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <Image className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-gray-700 text-sm mb-1">
                              Tải ảnh sản phẩm lên
                            </p>
                            <p className="text-xs text-gray-500">
                              JPG, PNG, GIF, WebP (tối đa 5MB)
                            </p>
                          </div>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      <span className="text-sm">Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
