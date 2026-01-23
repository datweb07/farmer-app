// @ts-nocheck
import { useState, useEffect } from "react";
import { Search, Filter, ShoppingBag, Loader2, MapPin, Clock, Bell } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { CreateProductModal } from "../components/CreateProductModal";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { EditProductModal } from "../components/EditProductModal";
import { PaymentModal } from "../components/PaymentModal";
import { BusinessLinkModal } from "../components/BusinessLinkModal";
import { checkBusinessLink } from "../../lib/business/link.service";
import {
    deleteProduct,
    getProducts,
    getProductById,
} from "../../lib/community/products.service";
import type { ProductWithStats } from "../../lib/community/types";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "../components/UserAvatar";
import { NotificationDropdown } from "../components/NotificationDropdown";

interface MobileProductsViewProps {
    selectedProductId?: string | null;
    onProductViewed?: () => void;
    onNavigate?: (page: string) => void;
}

export function MobileProductsView({
    selectedProductId,
    onProductViewed,
    onNavigate,
}: MobileProductsViewProps) {
    const { user, profile } = useAuth();
    const [products, setProducts] = useState<ProductWithStats[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProduct, setSelectedProduct] =
        useState<ProductWithStats | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [productToBuy, setProductToBuy] = useState<ProductWithStats | null>(
        null,
    );
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [pendingPurchase, setPendingPurchase] =
        useState<ProductWithStats | null>(null);

    // State để lưu thời gian hiện tại
    const [currentTime, setCurrentTime] = useState(new Date());

    const categories = [
        { id: "all", label: "Tất cả" },
        { id: "Thiết bị đo", label: "Thiết bị đo" },
        { id: "Giống cây trồng", label: "Giống cây" },
        { id: "Máy móc", label: "Máy móc" },
        { id: "Phân bón", label: "Phân bón" },
        { id: "Vật tư", label: "Vật tư" },
        { id: "Hệ thống tưới", label: "Tưới tiêu" },
    ];

    // Cập nhật thời gian mỗi giây
    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

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
            // Business chỉ thấy sản phẩm của doanh nghiệp
            const filteredProducts = profile?.role === "business"
                ? result.products.filter(p => p.seller_role === "business")
                : result.products;
            setProducts(filteredProducts);
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
            // Business chỉ thấy sản phẩm của doanh nghiệp
            const filteredProducts = profile?.role === "business"
                ? result.products.filter(p => p.seller_role === "business")
                : result.products;
            setProducts(filteredProducts);
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

    const handleEditSuccess = async (productId?: string) => {
        await loadProducts();
        if (productId) {
            const refreshed = await getProductById(productId);
            setSelectedProduct(refreshed);
            setShowDetailModal(!!refreshed);
        }
    };

    const handleDeleteProduct = async () => {
        if (!selectedProduct) return;
        const confirmed = window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?");
        if (!confirmed) return;

        setIsDeleting(true);
        const result = await deleteProduct(selectedProduct.id);
        if (result.success) {
            setShowDetailModal(false);
            setSelectedProduct(null);
            await loadProducts();
        } else {
            alert(result.error || "Không thể xóa sản phẩm");
        }
        setIsDeleting(false);
    };

    const handleCloseDetail = () => {
        setShowDetailModal(false);
        setSelectedProduct(null);
    };

    const handleBuyProduct = async (product: ProductWithStats) => {
        // Check if user is logged in
        if (!user) {
            alert("Vui lòng đăng nhập để mua hàng");
            return;
        }

        // Check if user is trying to buy their own product
        if (user.id === product.user_id) {
            alert("Bạn không thể mua sản phẩm của chính mình");
            return;
        }

        // Check if user is linked with this business
        const linkResult = await checkBusinessLink(product.user_id);

        if (!linkResult.linked) {
            // Show link modal first
            setPendingPurchase(product);
            setShowLinkModal(true);
        } else {
            // Already linked, proceed to payment
            setProductToBuy(product);
        }
    };

    const handleLinked = () => {
        setShowLinkModal(false);
        if (pendingPurchase) {
            setProductToBuy(pendingPurchase);
            setPendingPurchase(null);
        }
    };

    const handleSkipLink = () => {
        setShowLinkModal(false);
        if (pendingPurchase) {
            setProductToBuy(pendingPurchase);
            setPendingPurchase(null);
        }
    };

    const handlePaymentSuccess = async () => {
        setProductToBuy(null);

        // Refresh products list
        await loadProducts();

        // Show success message
        alert("Thanh toán thành công! Đơn hàng của bạn đã được tạo.");
    };

    const getGreeting = (currentHour: number) => {
        if (currentHour >= 5 && currentHour < 10) {
            return { greeting: "Chào buổi sáng", message: "Chúc một ngày tốt lành!" };
        } else if (currentHour >= 10 && currentHour < 13) {
            return { greeting: "Chào buổi trưa", message: "Giờ nghỉ trưa vui vẻ!" };
        } else if (currentHour >= 13 && currentHour < 17) {
            return { greeting: "Chào buổi chiều", message: "Buổi chiều làm việc hiệu quả!" };
        } else if (currentHour >= 17 && currentHour < 21) {
            return { greeting: "Chào buổi tối", message: "Buổi tối an lành bên gia đình!" };
        } else {
            return { greeting: "Chào buổi đêm", message: "Đêm khuya nhớ nghỉ ngơi sớm!" };
        }
    };

    const greeting = getGreeting(currentTime.getHours());
    const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const formattedDate = currentTime.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    const province = "AN GIANG";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Section - Đã đồng bộ hoàn toàn với MobilePostsView */}
            <div
                className="relative bg-cover bg-center text-white px-4 pt-6 pb-4"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80")',
                }}
            >
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {/* Profile Avatar */}
                        <button
                            onClick={() => onNavigate?.("profile")}
                            className="group relative rounded-full p-0.5 border-2 border-white/50 hover:border-white transition-all active:scale-95"
                            aria-label="Hồ sơ"
                        >
                            <UserAvatar
                                avatarUrl={profile?.avatar_url}
                                username={profile?.username || "User"}
                                size="lg"
                            />
                            {/* Online status dot */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold tracking-wide">
                                {greeting.greeting}, Anh/Chị {profile?.username || "Nông dân"}!
                            </h1>
                            <p className="text-xs text-gray-200">
                                {greeting.message}
                            </p>
                        </div>
                    </div>
                    <NotificationDropdown />
                </div>

                {/* Location and Time */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> Tỉnh <span className="font-bold">{province}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{formattedTime} | {formattedDate}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-4 space-y-4">
                {/* Market Banner */}
                <div
                    className="relative bg-cover bg-center rounded-2xl overflow-hidden shadow-md"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url("https://plus.unsplash.com/premium_photo-1663126676587-5228b3cade7d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
                        minHeight: '100px'
                    }}
                >
                    <div className="p-5 flex flex-col justify-center h-full">
                        <h2 className="text-xl font-bold text-white mb-1 drop-shadow-lg uppercase">
                            Chợ nông sản & Thiết bị
                        </h2>
                        <p className="text-xs text-white/90 drop-shadow">
                            Mua bán trực tiếp - Giá rẻ - Uy tín
                        </p>
                    </div>
                </div>

                {/* Seller Benefits */}
                {/* <div className="relative rounded-2xl overflow-hidden shadow-md">
                    <div
                        className="absolute inset-0 bg-cover bg-center z-0"
                        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80")' }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-green-900/70 to-green-900/90 z-0"></div>

                    <div className="relative z-10 p-4">
                        <h3 className="text-lg font-bold text-white text-center mb-4 uppercase tracking-tight drop-shadow-md">
                            Lợi ích khi bán hàng
                        </h3>

                        <div className="space-y-3">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                <p className="text-sm font-semibold text-white mb-1">Tiếp cận hơn 48,500+ Nông dân</p>
                                <p className="text-xs text-white/80">Khách hàng tiềm năng lớn</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                <p className="text-sm font-semibold text-white mb-1">Tăng uy tín qua hình thức tích điểm</p>
                                <p className="text-xs text-white/80">Hệ thống đánh giá minh bạch</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                <p className="text-sm font-semibold text-white mb-1">Không tính phí trung gian</p>
                                <p className="text-xs text-white/80">Liên hệ trực tiếp, tiết kiệm</p>
                            </div>
                        </div>
                    </div>
                </div> */}


                {/* Search Section */}

                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Tìm kiếm sản phẩm..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-base focus:border-green-600 focus:outline-none"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="w-full bg-green-700 text-white py-3 rounded-xl font-medium hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
                >
                    <Search className="w-5 h-5" />
                    Tìm kiếm
                </button>



                {/* Create Product Button */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                    <ShoppingBag className="w-5 h-5" />
                    Đăng bán sản phẩm
                </button>

                {/* Category Filter */}
                <div className="bg-white rounded-2xl shadow-md p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Danh mục sản phẩm</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedCategory === category.id
                                    ? "bg-green-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Count */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                        Sản phẩm ({products.length})
                    </h3>
                    <span className="text-sm text-gray-600">
                        {selectedCategory === "all" ? "Tất cả danh mục" :
                            categories.find(c => c.id === selectedCategory)?.label}
                    </span>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    </div>
                ) : products.length > 0 ? (
                    <div className="space-y-4 pb-24">
                        {products.map((product) => (
                            <div key={product.id} className="cursor-pointer">
                                <ProductCard
                                    product={product}
                                    onViewDetail={() => handleViewDetail(product)}
                                    onBuyClick={() => handleBuyProduct(product)}
                                    currentUserRole={profile?.role}
                                    isMobile={true}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-md">
                        <p className="text-lg text-gray-600 font-semibold mb-2">
                            Chưa có sản phẩm nào
                        </p>
                        <p className="text-gray-500 text-sm">Hãy thử lọc danh mục khác!</p>
                    </div>
                )}

                {/* Buyer Protection */}
                {/* <div className="bg-white rounded-2xl shadow-md p-4 mb-8">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4">
                        Lưu ý khi mua hàng
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-yellow-800 font-bold">!</span>
                            </div>
                            <div>
                                <p className="font-medium text-yellow-800 mb-1">Kiểm tra điểm uy tín người bán</p>
                                <p className="text-yellow-700 text-xs">Xem đánh giá và độ tin cậy trước khi mua</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-800 font-bold">✓</span>
                            </div>
                            <div>
                                <p className="font-medium text-blue-800 mb-1">Hình ảnh sản phẩm thực tế</p>
                                <p className="text-blue-700 text-xs">Xem kỹ hình ảnh và mô tả sản phẩm</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-red-800 font-bold">⚠</span>
                            </div>
                            <div>
                                <p className="font-medium text-red-800 mb-1">Kiểm tra hàng trước thanh toán</p>
                                <p className="text-red-700 text-xs">Đảm bảo chất lượng sản phẩm</p>
                            </div>
                        </div>
                    </div>
                </div> */}
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
                isOwner={!!user && selectedProduct?.user_id === user.id}
                onEdit={() => setShowEditModal(true)}
                onDelete={handleDeleteProduct}
                deleting={isDeleting}
                onBuyClick={
                    selectedProduct ? () => handleBuyProduct(selectedProduct) : undefined
                }
            />

            <EditProductModal
                isOpen={showEditModal}
                product={selectedProduct}
                onClose={() => setShowEditModal(false)}
                onSuccess={handleEditSuccess}
            />

            {/* Business Link Modal */}
            {showLinkModal && pendingPurchase && (
                <BusinessLinkModal
                    businessId={pendingPurchase.user_id}
                    businessName={(pendingPurchase as any).username || "Doanh nghiệp"}
                    onClose={() => {
                        setShowLinkModal(false);
                        setPendingPurchase(null);
                    }}
                    onLinked={handleLinked}
                    onSkip={handleSkipLink}
                />
            )}

            {/* Payment Modal for Business Products */}
            {productToBuy && (
                <PaymentModal
                    product={{
                        id: productToBuy.id,
                        name: productToBuy.name,
                        price: productToBuy.price,
                        user_id: productToBuy.user_id,
                    }}
                    onClose={() => {
                        setProductToBuy(null);
                    }}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}