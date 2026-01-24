import { MapPin, Clock, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react"; // Thêm useEffect
import { PostCard } from "./PostCard";
import { UserAvatar } from "./UserAvatar";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserProfileModal } from "./UserProfileModal";
import type { PostWithStats, TopContributor } from "../../lib/community/types";

// Function to get greeting based on time of day
const getGreeting = (currentHour: number) => {
    if (currentHour >= 5 && currentHour < 10) {
        return { greeting: "Chào buổi sáng", message: "Một ngày mới bội thu nhé!" };
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

interface MobilePostsViewProps {
    profile: any; // Use profile from AuthContext
    posts: PostWithStats[];
    topContributors: TopContributor[];
    loading: boolean;
    onCreatePost: () => void;
    onNavigate?: (page: string) => void;
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
    // State để lưu thời gian hiện tại
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

    // Cập nhật thời gian mỗi giây
    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000); // Cập nhật mỗi giây

        // Dọn dẹp interval khi component unmount
        return () => clearInterval(timerId);
    }, []);

    // Sử dụng currentTime để tính toán
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
            {/* Header Section */}
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
                {/* Community Banner */}
                <div
                    className="relative bg-cover bg-center rounded-2xl overflow-hidden shadow-md"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url("https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80")',
                        minHeight: '100px'
                    }}
                >
                    <div className="p-5 flex flex-col justify-center h-full">
                        <h2 className="text-xl font-bold text-white mb-1 drop-shadow-lg uppercase">
                            Cộng đồng nông dân
                        </h2>
                        <p className="text-xs text-white/90 drop-shadow">
                            Chia sẻ kinh nghiệm - Học tập lẫn nhau - Cùng phát triển
                        </p>
                    </div>
                </div>

                {/* === TOP CONTRIBUTORS - PODIUM STYLE (BỤC VINH QUANG) === */}
                <div className="relative rounded-2xl overflow-hidden shadow-md">
                    {/* Background Image & Overlay */}
                    <div
                        className="absolute inset-0 bg-cover bg-center z-0"
                        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80")' }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-green-900/60 to-green-900/90 z-0"></div>

                    <div className="relative z-10 p-4">
                        <h3 className="text-lg font-bold text-white text-center mb-6 uppercase tracking-tight drop-shadow-md font-sans">
                            Thành tích xuất sắc tháng
                        </h3>

                        {/* Podium Container: Flexbox align bottom */}
                        <div className="flex items-end justify-center gap-3 h-48 pb-2 px-2">
                            {(() => {
                                // 1. Chuẩn bị dữ liệu: Đảm bảo luôn có 3 phần tử để hiển thị bục
                                const safeContributors = [...topContributors];
                                while (safeContributors.length < 3) {
                                    // ĐÃ SỬA: Thêm đầy đủ các trường bắt buộc để thỏa mãn TypeScript
                                    safeContributors.push({
                                        user_id: `temp-${Math.random()}`,
                                        username: '---',
                                        total_points: 0,
                                        avatar_url: null,
                                        posts_count: 0,
                                        likes_received: 0,
                                        rank: 0
                                    });
                                }

                                // 2. Thứ tự hiển thị: Hạng 3 (Trái) -> Hạng 1 (Giữa) -> Hạng 2 (Phải)
                                // Index trong mảng safeContributors: 0 là Hạng 1, 1 là Hạng 2, 2 là Hạng 3
                                const podiumOrder = [2, 0, 1];

                                return podiumOrder.map((originalIndex) => {
                                    const contributor = safeContributors[originalIndex];
                                    const rank = originalIndex + 1; // Hạng thực tế (1, 2, 3)

                                    // 3. Style riêng cho từng bục
                                    let heightClass = "h-20"; // Mặc định hạng 3
                                    let bgColor = "bg-[#33691e]"; // Xanh đậm nhất
                                    let rankColor = "text-white/80";
                                    let zIndex = "z-10";

                                    if (rank === 1) {
                                        heightClass = "h-36"; // Cao nhất
                                        bgColor = "bg-[#8bc34a]"; // Xanh lá mạ sáng (Light Green)
                                        rankColor = "text-[#d4e157]"; // Màu vàng chanh
                                        zIndex = "z-20";
                                    } else if (rank === 2) {
                                        heightClass = "h-28"; // Cao nhì
                                        bgColor = "bg-[#558b2f]"; // Xanh lá trung bình
                                        rankColor = "text-white/90";
                                    }

                                    return (
                                        <div key={originalIndex} className={`flex flex-col items-center flex-1 ${zIndex}`}>
                                            {/* Số thứ hạng (#1, #2, #3) */}
                                            <div
                                                className={`text-3xl font-black italic ${rankColor} mb-1 leading-none drop-shadow-md`}
                                                style={{ fontFamily: 'sans-serif', textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}
                                            >
                                                #{rank}
                                            </div>

                                            {/* Tên User - Clickable */}
                                            <div
                                                className="text-[13px] text-white font-medium mb-1 truncate w-full text-center px-1 drop-shadow-sm cursor-pointer hover:underline hover:brightness-125 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (contributor.username !== '---') {
                                                        setSelectedUsername(contributor.username);
                                                    }
                                                }}
                                            >
                                                {contributor.username}
                                            </div>

                                            {/* Bục (Bar) hiển thị điểm */}
                                            <div className={`${bgColor} w-full ${heightClass} rounded-t-md flex flex-col items-center justify-center text-white shadow-lg border-t border-white/20 transition-all hover:brightness-110`}>
                                                <span className="text-3xl font-bold leading-none font-sans tracking-tighter">
                                                    {contributor.total_points}
                                                </span>
                                                <span className="text-[10px] uppercase font-medium opacity-80">điểm</span>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
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

                {/* Point System */}
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    Cách tích điểm
                </h3>

                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-black text-green-600 mb-1">+10</div>
                        <p className="text-xs text-gray-700 leading-tight font-medium">Đăng bài mới</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-black text-green-600 mb-1">+5</div>
                        <p className="text-xs text-gray-700 leading-tight font-medium">Mỗi 10 like</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-black text-green-600 mb-1">+2</div>
                        <p className="text-xs text-gray-700 leading-tight font-medium">Mỗi 100 xem</p>
                    </div>
                </div>

                {/* Posts List */}
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    </div>
                ) : posts.length > 0 ? (
                    <div className="space-y-4 pb-24">
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

            {/* User Profile Modal */}
            <UserProfileModal
                username={selectedUsername || ""}
                isOpen={!!selectedUsername}
                onClose={() => setSelectedUsername(null)}
            />
        </div>
    );
}