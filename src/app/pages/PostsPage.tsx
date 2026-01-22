import { useState, useEffect } from "react";
import { PlusCircle, Filter, Award, Loader2, Users } from "lucide-react";
import { PostCard } from "../components/PostCard";
import { CreatePostModal } from "../components/CreatePostModal";
import { PostDetailModal } from "../components/PostDetailModal";
import { UserProfileModal } from "../components/UserProfileModal";
import { FollowingFeed } from "../components/FollowingFeed";
import { getPosts, getPostById, deletePost } from "../../lib/community/posts.service";
import { getTopContributors } from "../../lib/community/leaderboard.service";
import type { PostWithStats, TopContributor } from "../../lib/community/types";
import { useAuth } from "../../contexts/AuthContext";

interface PostsPageProps {
  onNavigateToProduct: (productId: string) => void;
  selectedPostId?: string | null;
  onPostViewed?: () => void;
}

export function PostsPage({
  onNavigateToProduct,
  selectedPostId,
  onPostViewed,
}: PostsPageProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [feedView, setFeedView] = useState<"all" | "following">("all");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState<string>("");

  // Detail Modal States
  const [selectedPost, setSelectedPost] = useState<PostWithStats | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const categories = [
    { id: "all", label: "Tất cả" },
    { id: "experience", label: "Kinh nghiệm" },
    { id: "salinity-solution", label: "Giải pháp mặn" },
    { id: "product", label: "Sản phẩm" },
  ];

  useEffect(() => {
    loadPosts();
    loadLeaderboard();
  }, [selectedCategory]);

  // Handle navigation from dashboard with post ID
  useEffect(() => {
    if (selectedPostId) {
      loadAndShowPost(selectedPostId);
    }
  }, [selectedPostId]);

  const loadAndShowPost = async (postId: string) => {
    const post = await getPostById(postId);
    if (post) {
      setSelectedPost(post);
      setShowDetailModal(true);
      onPostViewed?.(); // Clear the selectedPostId in parent
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    const result = await getPosts({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      limit: 20,
    });
    if (!result.error) {
      setPosts(result.posts);
    }
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    const result = await getTopContributors(3);
    if (!result.error) {
      setTopContributors(result.contributors);
    }
  };

  const handlePostCreated = () => {
    loadPosts();
    loadLeaderboard();
  };

  const handlePostClick = (post: PostWithStats) => {
    setSelectedPost(post);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedPost(null);
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa bài viết này?");
    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deletePost(selectedPost.id);
    if (result.success) {
      setShowDetailModal(false);
      setSelectedPost(null);
      await loadPosts(); // Refresh list
    } else {
      alert(result.error || "Không thể xóa bài viết");
    }
    setIsDeleting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            Cộng đồng nông dân
          </h1>
          <p className="text-gray-600">
            Chia sẻ kinh nghiệm - Học hỏi lẫn nhau - Cùng phát triển
          </p>
        </div>

        {/* Top Contributors */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Thành viên xuất sắc tháng này
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topContributors.length > 0 ? (
              topContributors.map((contributor) => (
                <div
                  key={contributor.user_id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-400">
                      #{contributor.rank}
                    </span>
                    <div>
                      <button
                        onClick={() => {
                          setSelectedUsername(contributor.username);
                          setShowProfileModal(true);
                        }}
                        className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left cursor-pointer"
                      >
                        {contributor.username}
                      </button>
                      <p className="text-sm text-gray-600">
                        {contributor.total_points.toLocaleString()} điểm
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-3 text-center text-gray-500 py-4">
                Đang tải bảng xếp hạng...
              </p>
            )}
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">
            Cách tích điểm uy tín
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-blue-600 mb-1">+10 điểm</p>
              <p className="text-gray-700 text-sm">Đăng bài mới</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-blue-600 mb-1">+2 điểm</p>
              <p className="text-gray-700 text-sm">Mỗi 100 lượt xem</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-blue-600 mb-1">+5 điểm</p>
              <p className="text-gray-700 text-sm">Mỗi 10 like</p>
            </div>
          </div>
        </div>

        {/* Create Post Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors mb-6"
        >
          <PlusCircle className="w-5 h-5" />
          Đăng bài mới
        </button>

        {/* Feed View Toggle */}
        {user && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFeedView("all")}
                className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${feedView === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <Filter className="w-4 h-4" />
                Tất cả bài viết
              </button>
              <button
                onClick={() => setFeedView("following")}
                className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${feedView === "following"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <Users className="w-4 h-4" />
                Người theo dõi
              </button>
            </div>
          </div>
        )}

        {/* Category Filter - Only show for "all" view */}
        {feedView === "all" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Lọc theo chủ đề</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${selectedCategory === category.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feed Content */}
        {feedView === "following" ? (
          <FollowingFeed onNavigateToProduct={onNavigateToProduct} />
        ) : loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {posts.map((post) => (
              <div key={post.id} onClick={() => handlePostClick(post)} className="cursor-pointer">
                <PostCard
                  post={post}
                  onProductClick={onNavigateToProduct}
                  onUpdate={handlePostCreated}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && feedView === "all" && posts.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-lg text-gray-600 font-semibold mb-2">
              Chưa có bài viết nào
            </p>
            <p className="text-gray-500">Hãy là người đầu tiên chia sẻ!</p>
          </div>
        )}

        {/* Community Guidelines */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">
            Quy tắc cộng đồng
          </h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Chia sẻ kinh nghiệm thật, có hình ảnh minh họa</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Tôn trọng, lễ phép với mọi thành viên</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Giúp đỡ nhau giải quyết khó khăn</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">•</span>
              <span>Không spam, quảng cáo không phù hợp</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePostCreated}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
        isOwner={!!user && selectedPost?.user_id === user.id}
        onDelete={handleDeletePost}
        deleting={isDeleting}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        username={selectedUsername}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
