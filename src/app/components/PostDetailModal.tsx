import { useEffect, useState } from "react";
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Award,
  Eye,
  FileText,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import type { PostWithStats } from "../../lib/community/types";
import { supabase } from "../../lib/supabase/supabase";
import { MediaCarousel } from "./MediaCarousel";
import type { MediaItem } from "./MediaCarousel";

interface PostDetailModalProps {
  post: PostWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function PostDetailModal({
  post,
  isOpen,
  onClose,
  isOwner = false,
  onEdit,
  onDelete,
  deleting,
}: PostDetailModalProps) {
  const [postMedia, setPostMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Fetch post images and videos
  useEffect(() => {
    if (!post || !isOpen) return;

    const loadPostMedia = async () => {
      setLoadingMedia(true);
      try {
        // Load images
        const { data: imagesData, error: imagesError } = await supabase
          .from("post_images")
          .select("image_url, display_order")
          .eq("post_id", post.id)
          .order("display_order");

        // Load videos
        const { data: videosData, error: videosError } = await supabase
          .from("post_videos")
          .select("video_url, thumbnail_url")
          .eq("post_id", post.id);

        if (imagesError) throw imagesError;
        if (videosError) throw videosError;

        const media: MediaItem[] = [];

        // Add images
        if (imagesData && imagesData.length > 0) {
          imagesData.forEach((img: any) => {
            media.push({
              type: 'image',
              url: img.image_url,
              display_order: img.display_order,
            });
          });
        } else if (post.image_url) {
          // Fallback to legacy single image
          media.push({
            type: 'image',
            url: post.image_url,
            display_order: 0,
          });
        }

        // Add videos
        if (videosData && videosData.length > 0) {
          videosData.forEach((video: any) => {
            media.push({
              type: 'video',
              url: video.video_url,
              thumbnail_url: video.thumbnail_url,
              display_order: 999, // Videos come after images by default
            });
          });
        }

        // Sort by display_order
        media.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        setPostMedia(media);
      } catch (error) {
        console.error("Error loading post media:", error);
        // Fallback to legacy single image
        if (post.image_url) {
          setPostMedia([{
            type: 'image',
            url: post.image_url,
            display_order: 0,
          }]);
        }
      } finally {
        setLoadingMedia(false);
      }
    };

    loadPostMedia();
  }, [post, isOpen]);

  if (!isOpen || !post) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getCategoryLabel = () => {
    const labels = {
      experience: "Kinh nghiệm",
      "salinity-solution": "Giải pháp mặn",
      product: "Sản phẩm",
    };
    return labels[post.category] || post.category;
  };

  const getCategoryColor = () => {
    const colors = {
      experience: "bg-blue-100 text-blue-700",
      "salinity-solution": "bg-green-100 text-green-700",
      product: "bg-purple-100 text-purple-700",
    };
    return colors[post.category] || "bg-gray-100 text-gray-700";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                    <FileText className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {post.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor()}`}
                    >
                      {getCategoryLabel()}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      <Eye className="w-3 h-3" />
                      {post.views_count} lượt xem
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      <Calendar className="w-3 h-3" />
                      {formatDate(post.created_at)}
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
              {/* Post Media - Gallery with Images and Videos */}
              {!loadingMedia && postMedia.length > 0 && (
                <div className="w-full bg-gray-900">
                  <MediaCarousel media={postMedia} className="h-96" objectFit="contain" />
                </div>
              )}

              {loadingMedia && (
                <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-500">Đang tải media...</p>
                  </div>
                </div>
              )}

              {/* Post Details */}
              <div className="px-6 py-6 space-y-6">
                {/* Stats Section */}
                {/* Stats - Simple Row */}
                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center justify-around">
                    <div className="flex flex-col items-center">
                      <Heart className="w-5 h-5 text-gray-500 mb-1" />
                      <span className="text-lg font-semibold text-gray-900">
                        {post.likes_count}
                      </span>
                      <span className="text-xs text-gray-500">Thích</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <MessageCircle className="w-5 h-5 text-gray-500 mb-1" />
                      <span className="text-lg font-semibold text-gray-900">
                        {post.comments_count}
                      </span>
                      <span className="text-xs text-gray-500">Bình luận</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Share2 className="w-5 h-5 text-gray-500 mb-1" />
                      <span className="text-lg font-semibold text-gray-900">
                        {post.shares_count || 0}
                      </span>
                      <span className="text-xs text-gray-500">Chia sẻ</span>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Nội dung bài viết
                  </h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </div>
                </div>

                {/* Product Link (if category is product) */}
                {post.category === "product" && post.product_link && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">
                      Sản phẩm liên quan
                    </h4>
                    <a
                      href={`/products?id=${post.product_link}`}
                      className="text-purple-700 hover:text-purple-800 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Xem chi tiết sản phẩm →
                    </a>
                  </div>
                )}

                {/* Author Information */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Thông tin tác giả
                  </h3>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Tác giả</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {post.author_username}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
                      <Award className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-blue-700">Điểm đóng góp</p>
                        <p className="text-lg font-bold text-blue-600">
                          {post.author_points}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engagement Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Gợi ý tương tác
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Thích bài viết nếu hữu ích</li>
                    <li>• Bình luận chia sẻ kinh nghiệm của bạn</li>
                    <li>• Chia sẻ với bạn bè nông dân</li>
                    <li>• Theo dõi tác giả để cập nhật thêm</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div
                className={`grid grid-cols-1 ${isOwner ? "md:grid-cols-3" : ""
                  } gap-3`}
              >
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Đóng
                </button>
                {isOwner && (
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
                          Xóa bài viết
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
