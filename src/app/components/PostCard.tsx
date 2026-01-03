import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Eye, Award, ExternalLink } from 'lucide-react';
import type { PostWithStats } from '../../lib/community/types';
import { likePost, unlikePost, trackPostView } from '../../lib/community/posts.service';
import { CommentSection } from './CommentSection';
import { useAuth } from '../../contexts/AuthContext';

interface PostCardProps {
  post: PostWithStats;
  onProductClick?: (productId: string) => void;
  onUpdate?: () => void;
}

export function PostCard({ post, onProductClick, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [isLiking, setIsLiking] = useState(false);

  // Track view on mount
  useEffect(() => {
    trackPostView(post.id);
  }, [post.id]);

  const getCategoryBadge = () => {
    const badges = {
      experience: { text: 'Kinh nghiệm', color: 'bg-blue-100 text-blue-700' },
      'salinity-solution': { text: 'Giải pháp mặn', color: 'bg-green-100 text-green-700' },
      product: { text: 'Sản phẩm', color: 'bg-purple-100 text-purple-700' },
    };
    return badges[post.category];
  };

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);

    if (isLiked) {
      // Unlike
      const result = await unlikePost(post.id);
      if (result.success) {
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      }
    } else {
      // Like
      const result = await likePost(post.id);
      if (result.success) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    }

    setIsLiking(false);
  };

  const handleCommentAdded = () => {
    setCommentsCount(prev => prev + 1);
    onUpdate?.();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const badge = getCategoryBadge();

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-100">
        <img
          src={'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100'}
          alt={post.author_username}
          className="w-14 h-14 rounded-full object-cover border-2 border-blue-200"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900">{post.author_username}</h4>
            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-700">{post.author_points}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
        </div>
        <span className={`${badge.color} px-3 py-1 rounded-full text-sm font-medium`}>
          {badge.text}
        </span>
      </div>

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title}
          className="w-full h-64 object-cover"
        />
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-xl text-gray-900 mb-3">{post.title}</h3>
        <p className="text-gray-700 leading-relaxed line-clamp-3">{post.content}</p>

        {/* Product Link */}
        {post.product_link && (
          <button
            onClick={() => onProductClick?.(post.product_link!)}
            className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
          >
            <ExternalLink className="w-5 h-5" />
            Xem sản phẩm
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-around">
        <button
          onClick={handleLike}
          disabled={!user || isLiking}
          className={`flex items-center gap-2 transition-colors ${isLiked
            ? 'text-red-500'
            : 'text-gray-600 hover:text-red-500'
            } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          <span className="font-bold">{likesCount}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="font-bold">{commentsCount}</span>
        </button>
        <div className="flex items-center gap-2 text-gray-600">
          <Eye className="w-6 h-6" />
          <span className="font-bold">{post.views_count}</span>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-5 py-4 border-t border-gray-100">
          <CommentSection postId={post.id} onCommentAdded={handleCommentAdded} />
        </div>
      )}
    </div>
  );
}

