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
    { value: "experience", label: "Kinh nghiệm" },
    { value: "salinity-solution", label: "Giải pháp mặn" },
    { value: "product", label: "Sản phẩm" },
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

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
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
            {/* Modal Header */}
            <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Đăng bài mới
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Chia sẻ kinh nghiệm với cộng đồng
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

            {/* Modal Body */}
            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              {/* Error Message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Chọn loại bài viết
                  </label>
                  <div className="grid grid-cols-3 gap-2">
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
                        className={`p-3 rounded-lg border text-sm transition-colors ${formData.category === cat.value
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

                {/* Title Input */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Tiêu đề bài viết
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ví dụ: Kinh nghiệm xử lý đất mặn cho lúa..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Content Input */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nội dung chi tiết
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Mô tả chi tiết kinh nghiệm, giải pháp của bạn..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Product Link (only for product category) */}
                {formData.category === "product" && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">
                      Sản phẩm sẽ được hiển thị kèm theo bài viết
                    </p>
                  </div>
                )}

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Hình ảnh minh họa (tùy chọn)
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
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                          disabled={loading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      className={`block cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <Image className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-gray-700 text-sm mb-1">
                              Tải ảnh lên
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

                {/* Points Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">+10</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-blue-700 text-sm font-medium">
                        Nhận 10 điểm khi đăng bài thành công!
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
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
                      <span className="text-sm">Đang xử lý...</span>
                    </>
                  ) : (
                    <span className="text-sm">Đăng bài ngay</span>
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