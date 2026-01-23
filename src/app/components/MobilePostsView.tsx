import { MapPin, Clock, PlusCircle } from "lucide-react";
import { PostCard } from "./PostCard";
import { UserAvatar } from "./UserAvatar";
import { NotificationDropdown } from "./NotificationDropdown";
import type { PostWithStats, TopContributor } from "../../lib/community/types";

// Function to get greeting based on time of day
const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 10) {
        return { greeting: "Chào buổi sáng", message: "Một ngày mới bội thu nhé!" };
    } else if (hour >= 10 && hour < 13) {
        return { greeting: "Chào buổi trưa", message: "Giờ nghỉ trưa vui vẻ!" };
    } else if (hour >= 13 && hour < 17) {
        return { greeting: "Chào buổi chiều", message: "Buổi chiều làm việc hiệu quả!" };
    } else if (hour >= 17 && hour < 21) {
        return { greeting: "Chào buổi tối", message: "Buổi tối an lành bên gia đình!" };
    } else {
        return { greeting: "Chào buổi đêm", message: "Đêm khuya nhớ nghỉ ngơi sớm!" };
    }
};

interface MobilePostsViewProps {
    profile: any; // Use profile from AuthContext
    posts: PostWithStats[];
    topContributors: TopContributor[];
    loading: boolean;
    onCreatePost: () => void;
    onNavigate?: (page: string) => void; // Added for avatar click
    onPostClick: (post: PostWithStats) => void;
    onNavigateToProduct: (productId: string) => void;
    onPostUpdate: () => void;
}

export function MobilePostsView({
    profile,
    posts,
    topContributors,
    loading,
    onCreatePost,
    onNavigate,
    onPostClick,
    onNavigateToProduct,
    onPostUpdate,
}: MobilePostsViewProps) {
    const currentDate = new Date();
    const greeting = getGreeting();
    const formattedTime = currentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const formattedDate = currentDate.toLocaleDateString('vi-VN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const province = "AN GIANG";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Section */}
            <div
                className="relative bg-cover bg-center text-white px-4 pt-6 pb-4"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80")',
                }}
            >
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {/* Profile Avatar with border and online status - matching Dashboard */}
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
                                {greeting.greeting}, Anh {profile?.username || "Nông dân"}!
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
                {/* Community Card */}
                <div
                    className="relative bg-cover bg-center rounded-2xl overflow-hidden shadow-md"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url("https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80")',
                        minHeight: '120px'
                    }}
                >
                    <div className="p-5 flex flex-col justify-center h-full">
                        <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
                            CỘNG ĐỒNG NÔNG DÂN
                        </h2>
                        <p className="text-sm text-white/90 drop-shadow">
                            Chia sẻ kinh nghiệm - Học hỏi lẫn nhau - Cùng phát triển
                        </p>
                    </div>
                </div>

                {/* Top Contributors - Thành tích xuất sắc tháng */}
                <div
                    className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-5 shadow-md"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(34, 139, 34, 0.85), rgba(0, 100, 0, 0.85)), url("https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    <h3 className="text-xl font-bold text-white mb-4">
                        Thành tích xuất sắc tháng
                    </h3>

                    <div className="grid grid-cols-3 gap-3">
                        {topContributors.slice(0, 3).map((contributor, index) => (
                            <div
                                key={contributor.user_id}
                                className="relative"
                            >
                                {/* Rank Badge */}
                                <div className="absolute -top-1 -left-1 z-10 bg-yellow-400 text-green-900 font-bold text-lg w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                                    #{index + 1}
                                </div>

                                {/* Avatar */}
                                <div className="bg-white/95 backdrop-blur rounded-xl p-3 text-center shadow-lg">
                                    {contributor.avatar_url ? (
                                        <img
                                            src={contributor.avatar_url}
                                            alt={contributor.username}
                                            className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 border-green-600"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-green-600">
                                            {contributor.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <p className="text-xs font-semibold text-gray-800 truncate mb-1">
                                        {contributor.username}
                                    </p>
                                    <div className="text-2xl font-bold text-green-700">
                                        {contributor.total_points}
                                    </div>
                                    <p className="text-xs text-gray-600">điểm</p>
                                </div>
                            </div>
                        ))}

                        {/* Fill empty slots if less than 3 */}
                        {topContributors.length < 3 && [...Array(3 - topContributors.length)].map((_, i) => (
                            <div key={`empty-${i}`} className="relative">
                                <div className="absolute -top-1 -left-1 z-10 bg-gray-400 text-white font-bold text-lg w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                                    #{topContributors.length + i + 1}
                                </div>
                                <div className="bg-white/50 backdrop-blur rounded-xl p-3 text-center shadow-lg">
                                    <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-gray-300 flex items-center justify-center">
                                        <span className="text-3xl text-gray-400">?</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">Chưa có</p>
                                    <div className="text-2xl font-bold text-gray-400">0</div>
                                    <p className="text-xs text-gray-500">điểm</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Create Post Button */}
                <button
                    onClick={onCreatePost}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                    <PlusCircle className="w-5 h-5" />
                    Đăng bài mới
                </button>

                {/* Point System - Cách tích điểm */}
                <div className="bg-white rounded-2xl p-5 shadow-md">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Cách tích điểm
                    </h3>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">+10</div>
                            <p className="text-xs text-gray-700 leading-tight">Đăng bài mới</p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">+5</div>
                            <p className="text-xs text-gray-700 leading-tight">Mỗi 10 like</p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">+2</div>
                            <p className="text-xs text-gray-700 leading-tight">Mỗi 100 lượt xem</p>
                        </div>
                    </div>
                </div>

                {/* Posts List */}
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    </div>
                ) : posts.length > 0 ? (
                    <div className="space-y-4 pb-20">
                        {posts.map((post) => (
                            <div key={post.id} onClick={() => onPostClick(post)} className="cursor-pointer">
                                <PostCard
                                    post={post}
                                    onProductClick={onNavigateToProduct}
                                    onUpdate={onPostUpdate}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-md">
                        <p className="text-lg text-gray-600 font-semibold mb-2">
                            Chưa có bài viết nào
                        </p>
                        <p className="text-gray-500 text-sm">Hãy là người đầu tiên chia sẻ!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
