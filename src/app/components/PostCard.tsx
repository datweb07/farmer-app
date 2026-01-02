import { Heart, MessageCircle, Eye, Award, ExternalLink } from 'lucide-react';
import type { Post } from '../../data/mockData';

interface PostCardProps {
  post: Post;
  onProductClick?: (productId: string) => void;
}

export function PostCard({ post, onProductClick }: PostCardProps) {
  const getCategoryBadge = () => {
    const badges = {
      experience: { text: 'Kinh nghiệm', color: 'bg-blue-100 text-blue-700' },
      'salinity-solution': { text: 'Giải pháp mặn', color: 'bg-green-100 text-green-700' },
      product: { text: 'Sản phẩm', color: 'bg-purple-100 text-purple-700' },
    };
    return badges[post.category];
  };

  const badge = getCategoryBadge();

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-100">
        <img
          src={post.authorAvatar}
          alt={post.author}
          className="w-14 h-14 rounded-full object-cover border-2 border-blue-200"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900">{post.author}</h4>
            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-700">{post.authorPoints}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">{post.createdAt}</p>
        </div>
        <span className={`${badge.color} px-3 py-1 rounded-full text-sm font-medium`}>
          {badge.text}
        </span>
      </div>

      {/* Image */}
      {post.image && (
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-64 object-cover"
        />
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-xl text-gray-900 mb-3">{post.title}</h3>
        <p className="text-gray-700 leading-relaxed line-clamp-3">{post.content}</p>

        {/* Product Link */}
        {post.productLink && (
          <button
            onClick={() => onProductClick?.(post.productLink!)}
            className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
          >
            <ExternalLink className="w-5 h-5" />
            Xem sản phẩm
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-around">
        <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
          <Heart className="w-6 h-6" />
          <span className="font-bold">{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
          <MessageCircle className="w-6 h-6" />
          <span className="font-bold">{post.comments}</span>
        </button>
        <div className="flex items-center gap-2 text-gray-600">
          <Eye className="w-6 h-6" />
          <span className="font-bold">{post.views}</span>
        </div>
      </div>
    </div>
  );
}
