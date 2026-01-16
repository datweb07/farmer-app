import { MessageCircle, Heart, Eye, ArrowRight } from "lucide-react";
import type { PostWithStats } from "../../lib/community/types";
import { formatDistanceToNow } from "../../lib/utils/date-utils";

interface TrendingPostsProps {
  posts: PostWithStats[];
  loading?: boolean;
  onNavigate?: (page: string) => void;
}

export function TrendingPosts({
  posts,
  loading,
  onNavigate,
}: TrendingPostsProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Bài viết thịnh hành
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Bài viết thịnh hành
        </h3>
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">Chưa có bài viết nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
          Bài viết thịnh hành
        </h3>
        <button
          onClick={() => onNavigate?.("posts")}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Xem tất cả
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex gap-3">
              {/* Rank */}
              <div className="flex-shrink-0 w-6 text-center">
                <span
                  className={`font-bold ${
                    index < 3 ? "text-orange-500" : "text-gray-400"
                  }`}
                >
                  #{index + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                  {post.title}
                </h4>

                {/* Stats */}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post.comments_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.views_count}
                  </span>
                  <span>•</span>
                  <span>{formatDistanceToNow(post.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
