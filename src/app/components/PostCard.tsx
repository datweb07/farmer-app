import { useState, useEffect, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Flag,
  Link as LinkIcon,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { PostWithStats } from "../../lib/community/types";
import {
  likePost,
  unlikePost,
  trackPostView,
  sharePost,
  unsharePost,
  deletePost,
} from "../../lib/community/posts.service";
import { CommentsModal } from "./CommentsModal";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { UserProfileModal } from "./UserProfileModal";
import { EditPostModal } from "./EditPostModal";

interface PostCardProps {
  post: PostWithStats;
  onProductClick?: (productId: string) => void;
  onUpdate?: () => void;
}

export function PostCard({ post, onProductClick, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [isShared, setIsShared] = useState(post.is_shared || false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackPostView(post.id);
  }, [post.id]);

  // Check if content is too long and needs "Read more"
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const lineHeight = 20; // Approximate line height in pixels (text-sm leading-relaxed)
      const maxLines = 6; // Show max 6 lines before "Read more"
      const maxHeight = lineHeight * maxLines;

      setShowReadMore(contentHeight > maxHeight);

      // Auto-expand if content is not too long
      if (contentHeight <= maxHeight) {
        setIsExpanded(true);
      }
    }
  }, [post.content]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const getCategoryBadge = () => {
    const badges = {
      experience: { text: "Kinh nghiệm", color: "text-blue-600" },
      "salinity-solution": { text: "Giải pháp mặn", color: "text-green-600" },
      product: { text: "Sản phẩm", color: "text-purple-600" },
    };
    return badges[post.category];
  };

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);

    if (isLiked) {
      const result = await unlikePost(post.id);
      if (result.success) {
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      const result = await likePost(post.id);
      if (result.success) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    }

    setIsLiking(false);
  };

  const handleCommentAdded = () => {
    setCommentsCount((prev) => prev + 1);
    onUpdate?.();
  };

  const handleShare = async () => {
    if (!user || isSharing) return;

    setIsSharing(true);

    if (isShared) {
      const result = await unsharePost(post.id);
      if (result.success) {
        setIsShared(false);
        setSharesCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      const result = await sharePost(post.id);
      if (result.success) {
        setIsShared(true);
        setSharesCount((prev) => prev + 1);
      }
    }

    setIsSharing(false);
  };

  const handleDelete = async () => {
    if (!user || isDeleting) return;

    setIsDeleting(true);
    const result = await deletePost(post.id);

    if (result.success) {
      setShowDeleteConfirm(false);
      onUpdate?.(); // Refresh parent component
    } else {
      alert(result.error || "Không thể xóa bài viết");
    }

    setIsDeleting(false);
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}?post=${post.id}`;
    navigator.clipboard.writeText(postUrl);
    setShowMenu(false);
    // Could add a toast notification here
  };

  const handleReport = () => {
    setShowMenu(false);
    alert("Tính năng báo cáo sẽ được cập nhật sớm");
  };

  const toggleContent = () => {
    setIsExpanded(!isExpanded);
  };

  const isOwner = user?.id === post.user_id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "short",
    });
  };

  const badge = getCategoryBadge();

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 min-h-0 flex flex-col">
        {/* Header - Giống Facebook */}
        <div className="p-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* THÊM onClick VÀO UserAvatar */}
            <div
              className="cursor-pointer"
              onClick={() => setShowUserProfileModal(true)}
            >
              <UserAvatar
                avatarUrl={post.author_avatar}
                username={post.author_username}
                size="lg"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4
                  className="font-semibold text-gray-900 text-sm hover:underline cursor-pointer"
                  onClick={() => setShowUserProfileModal(true)}
                >
                  {post.author_username}
                </h4>
                <span className={`text-xs ${badge.color}`}>• {badge.text}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">
                  {formatDate(post.created_at)}
                </span>
                {post.author_points > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                      {post.author_points} điểm
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowEditModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Chỉnh sửa bài viết
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa bài viết
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleReport}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                      >
                        <Flag className="w-4 h-4" />
                        Báo cáo bài viết
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                    </>
                  )}
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Sao chép liên kết
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content - Phần này sẽ co giãn */}
        <div className="px-3 pb-3 flex-grow min-h-0">
          {/* Title - ĐƯA LÊN TRÊN NỘI DUNG */}
          {post.title && (
            <h3 className="font-semibold text-gray-900 mb-3 text-base">
              {post.title}
            </h3>
          )}

          {/* Content with "Read more" feature */}
          <div className="relative">
            <div
              ref={contentRef}
              className={`text-gray-900 text-sm leading-relaxed whitespace-pre-line break-words transition-all duration-300 ${!isExpanded && showReadMore
                ? "max-h-32 overflow-hidden"
                : ""
                }`}
              style={{
                maskImage: !isExpanded && showReadMore
                  ? "linear-gradient(to bottom, black 60%, transparent 100%)"
                  : "none",
                WebkitMaskImage: !isExpanded && showReadMore
                  ? "linear-gradient(to bottom, black 60%, transparent 100%)"
                  : "none"
              }}
            >
              {post.content}
            </div>

            {/* "Read more" button */}
            {showReadMore && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={toggleContent}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <span>Thu gọn</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Xem thêm</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Image - Giống Facebook, chiều cao tự động */}
        {post.image_url && (
          <div className="border-y border-gray-200 flex-shrink-0">
            <img
              src={post.image_url}
              alt={post.title || "Bài viết hình ảnh"}
              className="w-full h-auto object-contain"
            />
          </div>
        )}

        {/* Stats - Giống Facebook */}
        {(likesCount > 0 ||
          commentsCount > 0 ||
          sharesCount > 0 ||
          post.views_count > 0) && (
            <div className="px-3 pt-2 pb-1 flex items-center text-sm text-gray-500 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-4">
                {likesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <Heart className="w-2.5 h-2.5 text-white fill-current" />
                    </div>
                    {likesCount}
                  </span>
                )}

                {commentsCount > 0 && (
                  <button
                    onClick={() => setShowCommentsModal(true)}
                    className="hover:underline"
                  >
                    {commentsCount} bình luận
                  </button>
                )}

                {sharesCount > 0 && <span>{sharesCount} lượt chia sẻ</span>}
              </div>

              {/* Views đẩy sang phải */}
              {post.views_count > 0 && (
                <span className="ml-auto text-xs text-gray-600 pr-1">
                  {post.views_count} lượt xem
                </span>
              )}
            </div>
          )}

        {/* Action Buttons - Giống Facebook */}
        <div className="px-3 py-1 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-3">
            <button
              onClick={handleLike}
              disabled={!user || isLiking}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${isLiked
                ? "text-red-600 font-semibold"
                : "text-gray-600 hover:bg-gray-100"
                } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
              <span className="text-sm">Thích</span>
            </button>

            <button
              onClick={() => setShowCommentsModal(true)}
              className="flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">Bình luận</span>
            </button>

            <button
              onClick={handleShare}
              disabled={!user || isSharing}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${isShared
                ? "text-blue-600 font-semibold"
                : "text-gray-600 hover:bg-gray-100"
                } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Chia sẻ</span>
            </button>
          </div>
        </div>

        {/* Product Link - Nếu có */}
        {post.product_link && (
          <div className="px-3 py-2 flex-shrink-0">
            <button
              onClick={() => onProductClick?.(post.product_link!)}
              className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Xem chi tiết sản phẩm
            </button>
          </div>
        )}
      </div>

      {/* Comments Modal */}
      <CommentsModal
        postId={post.id}
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        commentsCount={commentsCount}
        onCommentAdded={handleCommentAdded}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        username={post.author_username}
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
      />

      <EditPostModal
        isOpen={showEditModal}
        post={post}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          onUpdate?.();
        }}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Xóa bài viết?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể
                hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xóa...
                    </>
                  ) : (
                    "Xóa"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}