import { useState } from 'react';
import { Search, Filter, ShoppingBag } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { products } from '../../data/mockData';

export function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tất cả', emoji: '🏪' },
    { id: 'Thiết bị đo', label: 'Thiết bị đo', emoji: '📊' },
    { id: 'Giống cây trồng', label: 'Giống cây', emoji: '🌾' },
    { id: 'Máy móc', label: 'Máy móc', emoji: '⚙️' },
    { id: 'Phân bón', label: 'Phân bón', emoji: '🧪' },
    { id: 'Vật tư', label: 'Vật tư', emoji: '🔧' },
    { id: 'Hệ thống tưới', label: 'Tưới tiêu', emoji: '💦' },
  ];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">🛒</span>
            Chợ nông sản & Thiết bị
          </h1>
          <p className="text-lg opacity-90">Mua bán trực tiếp - Giá rẻ - Uy tín</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-14 pr-6 py-4 border-2 border-gray-200 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-600 transition-colors">
              Tìm
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-6 h-6 text-gray-700" />
            <h3 className="font-bold text-lg text-gray-900">Danh mục sản phẩm</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Seller Benefits */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">💼</span>
            Lợi ích khi bán hàng trên nền tảng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-purple-100">
              <p className="text-2xl mb-2">🎯</p>
              <p className="font-bold text-purple-600 mb-1">Tiếp cận hơn 48,500+ Nông dân</p>
              <p className="text-sm text-gray-600">Khách hàng tiềm năng lớn</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-blue-100">
              <p className="text-2xl mb-2">⭐</p>
              <p className="font-bold text-blue-600 mb-1">Tăng uy tín qua hình thức tích điểm</p>
              <p className="text-sm text-gray-600">Hệ thống đánh giá minh bạch</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-green-100">
              <p className="text-2xl mb-2">💰</p>
              <p className="font-bold text-green-600 mb-1">Không tính phí trung gian</p>
              <p className="text-sm text-gray-600">Liên hệ trực tiếp, tiết kiệm</p>
            </div>
          </div>
        </div>

        {/* Add Product Button */}
        <button className="w-full md:w-auto bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg mb-8">
          <ShoppingBag className="w-6 h-6" />
          Đăng bán sản phẩm của bạn
        </button>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-100">
            <p className="text-2xl text-gray-400 mb-4">🛍️</p>
            <p className="text-xl text-gray-600 font-bold">Chưa có sản phẩm nào</p>
            <p className="text-gray-500 mt-2">Hãy thử lọc danh mục khác!</p>
          </div>
        )}

        {/* Buyer Protection */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-2xl p-6">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            Lưu ý khi mua hàng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 text-xl">✓</span>
                <span>Kiểm tra điểm uy tín của người bán</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 text-xl">✓</span>
                <span>Xem hình ảnh sản phẩm kỹ trước khi mua</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 text-xl">✓</span>
                <span>Hỏi rõ thông tin và chính sách bảo hành</span>
              </li>
            </ul>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 text-xl">✓</span>
                <span>Liên hệ trực tiếp qua số điện thoại</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 text-xl">✓</span>
                <span>Kiểm tra hàng kỹ trước khi thanh toán</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 text-xl">✓</span>
                <span>Báo cáo nếu phát hiện gian lận</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
