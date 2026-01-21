import { useState, useEffect } from "react";
import { Heart, Loader2, RefreshCw } from "lucide-react";
import { getFollowingFeed } from "../../lib/follow/follow.service";
import { PostCard } from "./PostCard";
import type { PostWithStats } from "../../lib/community/types";

interface FollowingFeedProps {
  onNavigateToProduct?: (productId: string) => void;
}

export function FollowingFeed({ onNavigateToProduct }: FollowingFeedProps) {
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getFollowingFeed(20, 0);
      if (!result.error) {
        setPosts(result.posts as any);
      }
    } catch (error) {
      console.error("Load feed error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadFeed(true);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-500">Đang tải feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Heart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Feed từ người bạn theo dõi
              </h2>
              <p className="text-sm text-gray-600">
                Cập nhật mới nhất từ những người bạn quan tâm
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Feed của bạn đang trống
            </h3>
            <p className="text-gray-500 max-w-md">
              Hãy theo dõi thêm người dùng để xem bài viết của họ xuất hiện ở
              đây
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onProductClick={onNavigateToProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}
