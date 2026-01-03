import { useState, type FormEvent } from "react";
import { X, Image, Loader2, DollarSign, Phone, Package } from "lucide-react";
import { createProduct } from "../../lib/community/products.service";
import { validateImageFile } from "../../lib/community/image-upload";
import type { CreateProductData } from "../../lib/community/types";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProductModalProps) {
  const [formData, setFormData] = useState<Partial<CreateProductData>>({
    name: "",
    description: "",
    price: 0,
    category: "Thiết bị đo",
    contact: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    {
      value: "Thiết bị đo",
      emoji: "📏",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      value: "Giống cây trồng",
      emoji: "🌱",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      value: "Máy móc",
      emoji: "🚜",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      value: "Phân bón",
      emoji: "🧪",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      value: "Vật tư",
      emoji: "🔧",
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      value: "Hệ thống tưới",
      emoji: "💧",
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    const cleanPhone = formData.contact.replace(/\D/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      setError("Số điện thoại không hợp lệ (10-11 số)");
      return;
    }

    setLoading(true);

    try {
      const result = await createProduct({
        name: formData.name!,
        description: formData.description!,
        price: formData.price!,
        category: formData.category!,
        contact: cleanPhone,
        image: imageFile || undefined,
      });

      if (result.success) {
        // Reset form
        setFormData({
          name: "",
          description: "",
          price: 0,
          category: "Thiết bị đo",
          contact: "",
        });
        setImageFile(null);
        setImagePreview(null);
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Không thể tạo sản phẩm");
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
      {/* Backdrop với hiệu ứng mờ */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform transition-all duration-300 ease-out">
          {/* Modal Content */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header với gradient */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-green-50 to-blue-50 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    Đăng bán sản phẩm mới
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Tiếp cận hơn 48,500+ nông dân tiềm năng
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={loading}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-red-800 font-medium">{error}</p>
                      <p className="text-red-600 text-sm mt-1">
                        Vui lòng kiểm tra lại thông tin
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ví dụ: Máy đo độ mặn cầm tay XYZ-2024"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Category Selection with Icons */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Danh mục sản phẩm
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, category: cat.value })
                        }
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                          formData.category === cat.value
                            ? `border-green-500 ${cat.bgColor} ${cat.color} shadow-sm`
                            : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50"
                        }`}
                        disabled={loading}
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className="font-medium text-xs text-center">
                          {cat.value}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Giá bán
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: e.target.value
                            ? parseFloat(e.target.value)
                            : 0,
                        })
                      }
                      placeholder="Nhập giá sản phẩm"
                      min="0"
                      step="1000"
                      className="w-full px-12 py-3 border border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors"
                      required
                      disabled={loading}
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ₫
                    </div>
                  </div>
                  {formData.price && formData.price > 0 && (
                    <p className="text-sm font-medium text-green-600 mt-2">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(formData.price)}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Mô tả chi tiết sản phẩm, tính năng, chất lượng, thông số kỹ thuật..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none resize-none transition-colors"
                    required
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">
                    Mô tả càng chi tiết, sản phẩm càng thu hút khách hàng
                  </p>
                </div>

                {/* Contact Information */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    value={formData.contact}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    placeholder="0912345678 hoặc 0123456789"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Khách hàng sẽ liên hệ qua Zalo với số này</span>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Hình ảnh sản phẩm
                  </label>

                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-h-64 object-cover rounded-xl border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          disabled={loading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 text-center">
                        Nhấn vào biểu tượng X để xóa ảnh
                      </p>
                    </div>
                  ) : (
                    <label
                      className={`block cursor-pointer ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 hover:bg-green-50/30 transition-all duration-200 group">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <Image className="w-8 h-8 text-green-500" />
                          </div>
                          <div>
                            <p className="text-gray-700 font-medium mb-1">
                              Tải ảnh sản phẩm lên
                            </p>
                            <p className="text-sm text-gray-500">
                              Kéo thả hoặc nhấn để chọn ảnh
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
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

                {/* Benefits Info */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600">✓</span>
                    </span>
                    Lợi ích khi đăng bán trên nền tảng
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-green-700">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>
                        Tiếp cận <strong>48,500+ nông dân</strong> tiềm năng
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-green-700">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>
                        <strong>Không tính phí trung gian</strong> - Liên hệ
                        trực tiếp
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-green-700">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>
                        <strong>Tăng uy tín</strong> qua hệ thống đánh giá minh
                        bạch
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-green-700">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>
                        <strong>Quản lý đơn hàng</strong> dễ dàng trên một nền
                        tảng
                      </span>
                    </li>
                  </ul>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5" />
                      <span>Đăng bán sản phẩm</span>
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
