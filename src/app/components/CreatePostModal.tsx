import { useState, useEffect, type FormEvent } from "react";
import { X, Image, Loader2, Video } from "lucide-react";
import { createPost } from "../../lib/community/posts.service";
import { getProducts } from "../../lib/community/products.service";
import { validateImageFile } from "../../lib/community/image-upload";
import { uploadMultipleImages } from "../../lib/media/media-upload.service";
import { validateVideoFile, uploadVideo, uploadVideoThumbnail, generateVideoThumbnail, getVideoMetadata } from "../../lib/media/video-upload.service";
import { supabase } from "../../lib/supabase/supabase";
import type {
  CreatePostData,
  ProductWithStats,
} from "../../lib/community/types";

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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Load products when category is "product"
  useEffect(() => {
    const loadProductsList = async () => {
      setLoadingProducts(true);
      const result = await getProducts({ limit: 100 });
      if (!result.error) {
        setProducts(result.products);
      }
      setLoadingProducts(false);
    };

    if (formData.category === "product" && isOpen) {
      loadProductsList();
    }
  }, [formData.category, isOpen]);

  const categories = [
    { value: "experience", label: "Kinh nghiệm" },
    { value: "salinity-solution", label: "Giải pháp mặn" },
    { value: "product", label: "Sản phẩm" },
  ];

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    if (imageFiles.length + files.length > 5) {
      setError("Tối đa 5 ảnh cho một bài viết");
      return;
    }

    // Validate each file
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
    }

    setImageFiles((prev) => [...prev, ...files]);
    setError(null);

    // Generate previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setVideoFile(file);
    setError(null);

    // Generate video preview URL
    const previewURL = URL.createObjectURL(file);
    setVideoPreview(previewURL);

    // Get video metadata
    try {
      const metadata = await getVideoMetadata(file);
      setVideoDuration(metadata.duration);
      console.log('📹 [CreatePost] Video metadata:', metadata);
    } catch (err) {
      console.warn('Could not get video metadata:', err);
    }

    // Generate thumbnail
    try {
      const thumbnail = await generateVideoThumbnail(file);
      setVideoThumbnail(thumbnail);
    } catch (err) {
      console.warn('Could not generate video thumbnail:', err);
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    if (videoThumbnail) {
      URL.revokeObjectURL(videoThumbnail);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setVideoThumbnail(null);
    setVideoDuration(null);
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
      // Create post without image first
      const result = await createPost({
        title: formData.title!,
        content: formData.content!,
        category: formData.category as
          | "experience"
          | "salinity-solution"
          | "product",
        product_link: formData.product_link,
      });

      if (!result.success || !result.post) {
        setError(result.error || "Không thể tạo bài viết");
        return;
      }

      // Upload multiple images if any
      if (imageFiles.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError("Không tìm thấy thông tin người dùng");
          return;
        }

        const uploadResult = await uploadMultipleImages(
          imageFiles,
          "post-images",
          userData.user.id
        );

        if (uploadResult.error) {
          setError(uploadResult.error);
          return;
        }

        // Save images to post_images table
        const imageRecords = uploadResult.images.map((img, index) => ({
          post_id: result.post!.id,
          image_url: img.url,
          display_order: index,
        }));

        const { error: dbError } = await supabase
          .from("post_images")
          .insert(imageRecords as any);

        if (dbError) {
          console.error("Error saving images:", dbError);
          setError("Không thể lưu ảnh");
          return;
        }
      }

      // Upload video if any
      if (videoFile) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError("Không tìm thấy thông tin người dùng");
          return;
        }

        console.log('📹 [CreatePost] Uploading video...');
        const videoResult = await uploadVideo(
          videoFile,
          "post-videos",
          userData.user.id
        );

        if (videoResult.error) {
          setError(videoResult.error);
          return;
        }

        // Upload thumbnail to storage if available
        let thumbnailUrl: string | null = null;
        if (videoThumbnail) {
          console.log('🖼️ [CreatePost] Uploading video thumbnail...');
          const thumbnailResult = await uploadVideoThumbnail(
            videoThumbnail,
            "post-videos",
            userData.user.id
          );

          if (thumbnailResult.error) {
            console.warn('⚠️ [CreatePost] Thumbnail upload failed, continuing without thumbnail:', thumbnailResult.error);
          } else {
            thumbnailUrl = thumbnailResult.url;
            console.log('✅ [CreatePost] Thumbnail uploaded:', thumbnailUrl);
          }
        }

        // Save video to post_videos table
        const { error: videoDbError } = await supabase
          .from("post_videos")
          .insert({
            post_id: result.post!.id,
            video_url: videoResult.url,
            thumbnail_url: thumbnailUrl,
            duration: videoDuration,
            file_size: videoResult.fileSize,
          } as any);

        if (videoDbError) {
          console.error("Error saving video:", videoDbError);
          setError("Không thể lưu video");
          return;
        }

        console.log('✅ [CreatePost] Video uploaded and saved');
      }

      // Success - reset all state
      setFormData({ title: "", content: "", category: "experience" });
      setImageFiles([]);
      setImagePreviews([]);
      handleRemoveVideo();
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating post:", err);
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

                {/* Product Selection (only for product category) */}
                {formData.category === "product" && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Sản phẩm liên quan (tùy chọn)
                    </label>
                    {loadingProducts ? (
                      <div className="flex items-center justify-center py-3 border border-gray-300 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                        <span className="text-sm text-gray-600">
                          Đang tải danh sách sản phẩm...
                        </span>
                      </div>
                    ) : (
                      <select
                        value={formData.product_link || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            product_link: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                        disabled={loading}
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} -{" "}
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(product.price)}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-gray-500">
                      Sản phẩm sẽ được hiển thị kèm theo bài viết
                    </p>
                  </div>
                )}

                {/* Multiple Images Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Hình ảnh minh họa (tùy chọn, tối đa 5 ảnh)
                  </label>

                  {/* Image Previews Grid */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFiles((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                              setImagePreviews((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            disabled={loading}
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {/* Image number badge */}
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs font-medium">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  {imagePreviews.length < 5 && (
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
                              {imagePreviews.length === 0
                                ? "Tải ảnh lên"
                                : `Thêm ảnh (${imagePreviews.length}/5)`}
                            </p>
                            <p className="text-xs text-gray-500">
                              JPG, PNG, GIF, WebP (tối đa 5MB mỗi ảnh)
                            </p>
                          </div>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={loading || imagePreviews.length >= 5}
                      />
                    </label>
                  )}
                </div>

                {/* Video Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Video minh họa (tùy chọn, tối đa 50MB)
                  </label>

                  {/* Video Preview */}
                  {videoPreview && (
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-300">
                      <video
                        src={videoPreview}
                        className="w-full h-full object-cover"
                        controls
                      />
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        disabled={loading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {/* Duration badge */}
                      {videoDuration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                          {Math.floor(videoDuration / 60)}:{String(videoDuration % 60).padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Button */}
                  {!videoPreview && (
                    <label
                      className={`block cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                            <Video className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-gray-700 text-sm mb-1">
                              Tải video lên
                            </p>
                            <p className="text-xs text-gray-500">
                              MP4, WebM, MOV (tối đa 50MB)
                            </p>
                          </div>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                        onChange={handleVideoChange}
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
                        <span className="text-white text-sm font-medium">
                          +10
                        </span>
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
