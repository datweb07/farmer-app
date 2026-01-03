import { useState, type FormEvent } from "react";
import { X, Image, Loader2 } from "lucide-react";
import { createPost } from "../../lib/community/posts.service";
import { validateImageFile } from "../../lib/community/image-upload";
import type { CreatePostData } from "../../lib/community/types";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const [formData, setFormData] = useState<Partial<CreatePostData>>({
    title: "",
    content: "",
    category: "experience",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { value: "experience", label: "Kinh nghiệm", emoji: "" },
    { value: "salinity-solution", label: "Giải pháp mặn", emoji: "" },
    { value: "product", label: "Sản phẩm", emoji: "" },
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
    if (!formData.title?.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }

    if (!formData.content?.trim()) {
      setError("Vui lòng nhập nội dung");
      return;
    }

    if (formData.category === "product" && !formData.product_link?.trim()) {
      setError("Vui lòng nhập link sản phẩm cho bài viết sản phẩm");
      return;
    }

    setLoading(true);

    try {
      const result = await createPost({
        title: formData.title!,
        content: formData.content!,
        category: formData.category as
          | "experience"
          | "salinity-solution"
          | "product",
        image: imageFile || undefined,
        product_link: formData.product_link,
      });

      if (result.success) {
        // Reset form
        setFormData({ title: "", content: "", category: "experience" });
        setImageFile(null);
        setImagePreview(null);
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Không thể tạo bài viết");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi không mong muốn");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đóng modal khi click ra ngoài
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
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

      {/* Modal Container với animation */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform transition-all duration-300 ease-out">
          {/* Modal Content */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Đăng bài mới
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Chia sẻ kinh nghiệm với cộng đồng
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
                {/* Category Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Chọn loại bài viết
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            category: cat.value as any,
                          })
                        }
                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                          formData.category === cat.value
                            ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50/50"
                        }`}
                        disabled={loading}
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className="font-medium text-sm">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tiêu đề bài viết
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ví dụ: Kinh nghiệm xử lý đất mặn cho lúa..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Content Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Nội dung chi tiết
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Mô tả chi tiết kinh nghiệm, giải pháp của bạn..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none resize-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Product Link (only for product category) */}
                {formData.category === "product" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      ID sản phẩm liên quan (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={formData.product_link || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          product_link: e.target.value,
                        })
                      }
                      placeholder="Nhập ID sản phẩm từ chợ nông sản..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-colors"
                      disabled={loading}
                    />
                    <p className="text-sm text-gray-500">
                      Sản phẩm sẽ được hiển thị kèm theo bài viết
                    </p>
                  </div>
                )}

                {/* Image Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Hình ảnh minh họa (tùy chọn)
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
                        Nhấn vào ảnh để thay đổi
                      </p>
                    </div>
                  ) : (
                    <label
                      className={`block cursor-pointer ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-all duration-200 group">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <Image className="w-8 h-8 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-gray-700 font-medium mb-1">
                              Tải ảnh lên
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

                {/* Points Info */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold">+10</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-blue-800 font-medium">
                        Nhận 10 điểm khi đăng bài thành công!
                      </p>
                      <p className="text-blue-600 text-sm mt-1">
                        Điểm giúp tăng uy tín trong cộng đồng
                      </p>
                    </div>
                  </div>
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
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng bài ngay</span>
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
