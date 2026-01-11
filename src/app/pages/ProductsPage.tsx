import { useState, useEffect } from "react";
import { Search, Filter, ShoppingBag, Loader2 } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { CreateProductModal } from "../components/CreateProductModal";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { getProducts, getProductById } from "../../lib/community/products.service";
import type { ProductWithStats } from "../../lib/community/types";

interface ProductsPageProps {
  selectedProductId?: string | null;
  onProductViewed?: () => void;
}

export function ProductsPage({ selectedProductId, onProductViewed }: ProductsPageProps) {
  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStats | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const categories = [
    { id: "all", label: "Tất cả" },
    { id: "Thiết bị đo", label: "Thiết bị đo" },
    { id: "Giống cây trồng", label: "Giống cây" },
    { id: "Máy móc", label: "Máy móc" },
    { id: "Phân bón", label: "Phân bón" },
    { id: "Vật tư", label: "Vật tư" },
    { id: "Hệ thống tưới", label: "Tưới tiêu" },
  ];

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  // Handle navigation from posts with product ID
  useEffect(() => {
    if (selectedProductId) {
      loadAndShowProduct(selectedProductId);
    }
  }, [selectedProductId]);

  const loadProducts = async () => {
    setLoading(true);
    const result = await getProducts({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      limit: 20,
    });
    if (!result.error) {
      setProducts(result.products);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    const result = await getProducts({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      search: searchQuery.trim() || undefined,
      limit: 20,
    });
    if (!result.error) {
      setProducts(result.products);
    }
    setLoading(false);
  };

  const handleProductCreated = () => {
    loadProducts();
  };

  const loadAndShowProduct = async (productId: string) => {
    const product = await getProductById(productId);
    if (product) {
      setSelectedProduct(product);
      setShowDetailModal(true);
      onProductViewed?.(); // Clear the selectedProductId in parent
    }
  };

  const handleViewDetail = (product: ProductWithStats) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            Chợ nông sản & Thiết bị
          </h1>
          <p className="text-gray-600">Mua bán trực tiếp - Giá rẻ - Uy tín</p>
        </div>

        {/* Seller Benefits */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">
            Lợi ích khi bán hàng trên nền tảng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-blue-600 mb-1">
                Tiếp cận hơn 48,500+ Nông dân
              </p>
              <p className="text-sm text-gray-600">Khách hàng tiềm năng lớn</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-blue-600 mb-1">
                Tăng uy tín qua hình thức tích điểm
              </p>
              <p className="text-sm text-gray-600">
                Hệ thống đánh giá minh bạch
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-blue-600 mb-1">
                Không tính phí trung gian
              </p>
              <p className="text-sm text-gray-600">
                Liên hệ trực tiếp, tiết kiệm
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:border-blue-600 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Tìm
            </button>
          </div>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors mb-8"
        >
          <ShoppingBag className="w-5 h-5" />
          Đăng bán sản phẩm của bạn
        </button>



        {/* Category Filter */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Danh mục sản phẩm</h3>
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





        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetail={() => handleViewDetail(product)}
              />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-lg text-gray-600 font-semibold mb-2">
              Chưa có sản phẩm nào
            </p>
            <p className="text-gray-500">Hãy thử lọc danh mục khác!</p>
          </div>
        )}

        {/* Buyer Protection */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">
            Lưu ý khi mua hàng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Kiểm tra điểm uy tín của người bán</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Xem hình ảnh sản phẩm kỹ trước khi mua</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Hỏi rõ thông tin và chính sách bảo hành</span>
              </li>
            </ul>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Liên hệ trực tiếp qua số điện thoại</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Kiểm tra hàng kỹ trước khi thanh toán</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Báo cáo nếu phát hiện gian lận</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProductCreated}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
      />
    </div>
  );
}