import { useState, useEffect } from 'react';
import { PlusCircle, Filter, Award, Loader2 } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { CreatePostModal } from '../components/CreatePostModal';
import { getPosts } from '../../lib/community/posts.service';
import { getTopContributors } from '../../lib/community/leaderboard.service';
import type { PostWithStats, TopContributor } from '../../lib/community/types';

interface PostsPageProps {
  onNavigateToProduct: (productId: string) => void;
}

export function PostsPage({ onNavigateToProduct }: PostsPageProps) {
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories = [
    { id: 'all', label: 'Tất cả', emoji: '📚' },
    { id: 'experience', label: 'Kinh nghiệm', emoji: '💡' },
    { id: 'salinity-solution', label: 'Giải pháp mặn', emoji: '💧' },
    { id: 'product', label: 'Sản phẩm', emoji: '🛒' },
  ];

  useEffect(() => {
    loadPosts();
    loadLeaderboard();
  }, [selectedCategory]);

  const loadPosts = async () => {
    setLoading(true);
    const result = await getPosts({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
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

  const getMedalEmoji = (index: number) => {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index] || '';
  };

  const getMedalColor = (index: number) => {
    const colors = [
      'from-yellow-100 to-yellow-200 border-yellow-300',
      'from-gray-100 to-gray-200 border-gray-300',
      'from-orange-100 to-orange-200 border-orange-300',
    ];
    return colors[index] || 'from-gray-100 to-gray-200 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">👥</span>
            Cộng đồng nông dân
          </h1>
          <p className="text-lg opacity-90">Chia sẻ kinh nghiệm - Học hỏi lẫn nhau - Cùng phát triển</p>
        </div>

        {/* Top Contributors */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-yellow-200">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Thành viên xuất sắc tháng này
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topContributors.length > 0 ? (
              topContributors.map((contributor, index) => (
                <div
                  key={contributor.user_id}
                  className={`bg-gradient-to-r ${getMedalColor(index)} rounded-xl p-4 border-2`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getMedalEmoji(index)}</span>
                    <div>
                      <p className="font-bold text-gray-900">{contributor.username}</p>
                      <p className="text-sm text-gray-700">{contributor.total_points.toLocaleString()} điểm</p>
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

        {/* Create Post Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg mb-6"
        >
          <PlusCircle className="w-6 h-6" />
          Đăng bài mới - Nhận điểm
        </button>

        {/* Category Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-6 h-6 text-gray-700" />
            <h3 className="font-bold text-lg text-gray-900">Lọc theo chủ đề</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${selectedCategory === category.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <span className="text-xl">{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            Cách tích điểm uy tín
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-blue-100">
              <p className="font-bold text-blue-600 mb-2">+10 điểm</p>
              <p className="text-gray-700">Đăng bài mới</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-green-100">
              <p className="font-bold text-green-600 mb-2">+2 điểm</p>
              <p className="text-gray-700">Mỗi 100 lượt xem</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-purple-100">
              <p className="font-bold text-purple-600 mb-2">+5 điểm</p>
              <p className="text-gray-700">Mỗi 10 like</p>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onProductClick={onNavigateToProduct}
                onUpdate={handlePostCreated}
              />
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-100">
            <p className="text-2xl text-gray-400 mb-4">📭</p>
            <p className="text-xl text-gray-600 font-bold">Chưa có bài viết nào</p>
            <p className="text-gray-500 mt-2">Hãy là người đầu tiên chia sẻ!</p>
          </div>
        )}

        {/* Community Guidelines */}
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Quy tắc cộng đồng
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <span>Chia sẻ kinh nghiệm thật, có hình ảnh minh họa</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <span>Tôn trọng, lễ phép với mọi thành viên</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <span>Giúp đỡ nhau giải quyết khó khăn</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 text-xl">✗</span>
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
    </div>
  );
}
