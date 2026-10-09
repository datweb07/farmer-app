import { useState, useEffect } from "react";
import {
  Clock,
  ChevronRight,
  Heart,
  TrendingUp,
  FileText,
  ShoppingBag,
  MessageCircle,
  Eye, // Đã thêm icon Eye
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getUserStats,
  getRecentActivities,
  getTrendingPosts,
  getRecentProducts,
} from "../../lib/dashboard/dashboard.service";
import type { UserStats, ActivityItem } from "../../lib/dashboard/types";
import type { PostWithStats } from "../../lib/community/types";
import type { ProductWithStats } from "../../lib/community/types";
import { UserStatsCard } from "../components/UserStatsCard";
import { ActivityFeed } from "../components/ActivityFeed";
import { RecentProducts } from "../components/RecentProducts";
import { UserAvatar } from "../components/UserAvatar";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { LocalitySalinityLookup } from "../components/LocalitySalinityLookup";
import { SuccessfulSeasonTransactions } from "../components/SuccessfulSeasonTransactions";
import { supabase } from "../../lib/supabase/supabase";

const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
}).format(amount);

// Custom hook to detect mobile screen
function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Function to get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) {
    return { greeting: "Chào buổi sáng", message: "Một ngày mới bội thu nhé!" };
  } else if (hour >= 10 && hour < 13) {
    return { greeting: "Chào buổi trưa", message: "Giờ nghỉ trưa vui vẻ!" };
  } else if (hour >= 13 && hour < 17) {
    return {
      greeting: "Chào buổi chiều",
      message: "Buổi chiều làm việc hiệu quả!",
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: "Chào buổi tối",
      message: "Buổi tối an lành bên gia đình!",
    };
  } else {
    return {
      greeting: "Chào buổi đêm",
      message: "Đêm khuya nhớ nghỉ ngơi sớm!",
    };
  }
};

interface DashboardPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile } = useAuth();
  const isMobile = useIsMobile();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<PostWithStats[]>([]);
  const [recentProducts, setRecentProducts] = useState<ProductWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState(getGreeting());

  // Update clock every minute (for mobile layout)
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);

      // Update greeting if hour has changed
      const currentHour = newTime.getHours();
      const previousHour = currentTime.getHours();
      if (currentHour !== previousHour) {
        setGreeting(getGreeting());
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [currentTime]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      const [
        statsResult,
        activitiesResult,
        postsResult,
        productsResult,
      ] = await Promise.all([
        getUserStats(),
        getRecentActivities(10),
        getTrendingPosts(5),
        getRecentProducts(4),
      ]);

      if (statsResult.stats) setStats(statsResult.stats);
      if (activitiesResult && !activitiesResult.error)
        setActivities(activitiesResult.activities || []);
      if (postsResult && !postsResult.error)
        setTrendingPosts(postsResult.posts || []);
      if (productsResult && !productsResult.error) {
        console.log("📦 [Dashboard] Products data:", productsResult.products);

        // Fetch media for each product
        const productsWithMedia = await Promise.all(
          productsResult.products.map(async (product) => {
            try {
              // Load images from product_images table
              const { data: imagesData } = await supabase
                .from("product_images")
                .select("image_url, display_order")
                .eq("product_id", product.id)
                .order("display_order")
                .limit(1); // Only need first image for dashboard

              if (imagesData && imagesData.length > 0) {
                // Use first image from product_images
                return {
                  ...product,
                  image_url: (imagesData as any[])[0].image_url,
                };
              }

              // Keep existing image_url if no images in product_images table
              return product;
            } catch (error) {
              console.error("Error loading product media:", error);
              return product; // Return original product on error
            }
          }),
        );

        setRecentProducts(productsWithMedia);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  };

  // ==================== MOBILE LAYOUT ====================
  if (isMobile) {
    return (
      <div className="min-h-screen relative bg-gray-900 text-white font-sans">
        {/* Background Image - Cập nhật để fill full chiều dài màn hình */}
        <div
          className="fixed inset-0 z-0 opacity-60"
          style={{
            backgroundImage: "url('/assets/images/background-mobile.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed", // Giữ cố định background khi scroll
          }}
        />
        {/* Gradient Overlay - Cập nhật để phủ lên toàn bộ background */}
        <div className="fixed inset-0 z-0" />

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col px-4 pt-6 pb-8">
          {/* Header Section */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {/* Profile Button - Clickable */}
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
                  {greeting.greeting}, Anh/Chị {profile?.username || "Nông dân"}
                  !
                </h1>
                <p className="text-xs text-gray-200">{greeting.message}</p>
              </div>
            </div>

            {/* Notification Dropdown */}
            <NotificationDropdown />
          </header>

          {/* Home salinity and locality panel */}
          <div className="mb-8">
            <div className="mb-3 flex justify-end">
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                <Clock className="h-4 w-4" />
                {currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                <span className="px-1">|</span>
                {currentTime.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
            <LocalitySalinityLookup />
          </div>

          {/* Dự án đang kêu gọi đã được gỡ khỏi trang chủ. */}

          {/* Successful transaction progress replaces trending posts on home. */}
          <div className="mb-8"><SuccessfulSeasonTransactions /></div>

          {/* New Products */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Sản phẩm mới
              </h2>
              <button
                onClick={() => onNavigate?.("products")}
                className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded flex items-center gap-1 transition"
              >
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="min-w-[140px] h-[200px] bg-white/10 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-4">
                {recentProducts.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl overflow-hidden shadow-lg text-gray-900 group cursor-pointer hover:translate-y-[-2px] transition-transform duration-300"
                    onClick={() => onNavigate?.("products", product.id)}
                  >
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      <div className="absolute inset-0">
                        <img
                          src={
                            product.image_url && product.image_url.trim() !== ""
                              ? product.image_url
                              : "https://via.placeholder.com/150?text=No+Image"
                          }
                          alt={product.name}
                          className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-xs line-clamp-2 min-h-[2.5em] mb-1">
                        {product.name}
                      </h3>
                      <div className="text-green-700 font-extrabold text-sm">
                        {formatCurrency(product.price)}
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                        <TrendingUp className="w-3 h-3" /> {product.views_count}{" "}
                        lượt xem
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* === BÀI VIẾT THỊNH HÀNH (Thay thế Footer) === */}
          <div className="mt-auto hidden">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-8">
              Bài viết thịnh hành
            </h2>

            <div className="space-y-10">
              {" "}
              {/* Tăng khoảng cách giữa các bài để số không bị chồng chéo */}
              {trendingPosts.slice(0, 3).map((post, index) => {
                // Xác định màu sắc cho số thứ hạng
                let rankColor = "text-[#d4e157]"; // #1 - Xanh vàng
                if (index === 1) rankColor = "text-[#9ccc65]"; // #2 - Xanh lá nhạt
                if (index === 2) rankColor = "text-[#66bb6a]"; // #3 - Xanh đậm hơn

                return (
                  <div
                    key={post.id}
                    className="relative w-full cursor-pointer group" // Giảm pl-10 xuống pl-8 cho cân đối
                    onClick={() => onNavigate?.("posts", post.id)}
                  >
                    {/* Số thứ hạng - Đã sửa z-index lên z-20 để nổi lên trên */}
                    <span
                      className={`absolute left-0 -top-8 text-[85px] font-black italic ${rankColor} leading-none z-20 pointer-events-none drop-shadow-md`}
                      style={{
                        fontFamily: "sans-serif",
                        textShadow: "2px 2px 0px rgba(0,0,0,0.2)", // Thêm bóng nhẹ cho số dễ nhìn hơn
                      }}
                    >
                      #{index + 1}
                    </span>

                    {/* Card nội dung */}
                    <div className="w-full relative z-10 bg-[#2e5d32] bg-opacity-95 backdrop-blur-sm rounded-xl p-4 pl-24 shadow-lg border border-white/10 min-h-[100px] flex flex-col justify-center">
                      {/* Đã thêm pl-24 và bỏ ml-4 ở dòng trên để card dài ra bao trùm số */}

                      <h3 className="text-white font-medium text-sm mb-3 line-clamp-2 leading-tight">
                        {post.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-gray-200">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-white/20" />
                          <span>{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 fill-white/20" />
                          <span>{post.comments_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 fill-white/20" />
                          <span>{post.views_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Fallback Skeleton */}
              {loading &&
                trendingPosts.length === 0 &&
                [1, 2, 3].map((i) => (
                  <div key={i} className="relative pl-8 h-24 mt-6">
                    <div className="absolute -left-1 -top-5 text-[80px] font-black italic text-gray-600 opacity-50 z-20">
                      #{i}
                    </div>
                    <div className="relative z-10 h-full bg-white/10 rounded-xl animate-pulse ml-4"></div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== DESKTOP LAYOUT ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-8 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {greeting.greeting}, {profile?.username || "Nông dân"}!
          </h1>
          <p className="text-blue-100">{greeting.message}</p>
        </div>

        <div className="mb-8 flex justify-end text-sm text-gray-600">
          <Clock className="mr-2 h-4 w-4" />
          {currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}
          <span className="px-2">|</span>
          {currentTime.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="mb-8"><LocalitySalinityLookup /></div>

        {/* User Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <UserStatsCard
              icon={FileText}
              label="Bài viết"
              value={stats.total_posts}
              color="blue"
            />
            <UserStatsCard
              icon={ShoppingBag}
              label="Sản phẩm"
              value={stats.total_products}
              color="purple"
            />
            <UserStatsCard
              icon={MessageCircle}
              label="Bình luận"
              value={stats.total_comments}
              color="green"
            />
            <UserStatsCard
              icon={Heart}
              label="Lượt thích"
              value={stats.total_likes_received}
              color="red"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            <ActivityFeed activities={activities} loading={loading} />
            <SuccessfulSeasonTransactions />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <RecentProducts
              products={recentProducts}
              loading={loading}
              onNavigate={onNavigate}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-xl text-gray-900 mb-6 flex items-center gap-2">
            Hành động nhanh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate?.("salinity")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Xem dự báo độ mặn
            </button>
            <button
              onClick={() => onNavigate?.("posts")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Tham gia cộng đồng
            </button>
            <button
              onClick={() => onNavigate?.("products")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Mua sắm thiết bị
            </button>
            <button
              onClick={() => onNavigate?.("connections")}
              className="bg-white text-blue-600 border-2 border-blue-600 p-5 rounded-lg font-medium text-base hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Kết nối đối tác
            </button>
          </div>
        </div>

        {/* Help Guide */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-xl text-gray-900 mb-4">
            Hướng dẫn sử dụng
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">Theo dõi độ mặn</p>
                <p className="text-sm text-gray-600">
                  Xem dự báo và biểu đồ chi tiết để lập kế hoạch canh tác
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">Học hỏi cộng đồng</p>
                <p className="text-sm text-gray-600">
                  Chia sẻ kinh nghiệm và học hỏi từ nông dân khác
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">Mua sắm thiết bị</p>
                <p className="text-sm text-gray-600">
                  Tìm thiết bị, giống cây, vật tư hỗ trợ canh tác
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                4
              </span>
              <div>
                <p className="font-medium text-gray-900">Kêu gọi đầu tư</p>
                  <p className="text-sm text-gray-600">
                  Theo dõi thông tin độ mặn và kết nối với doanh nghiệp thu mua
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
