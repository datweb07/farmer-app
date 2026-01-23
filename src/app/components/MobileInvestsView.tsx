// @ts-nocheck
import { useState, useEffect } from "react";
import {
    MapPin,
    Clock,
    Bell,
    Plus,
    Loader2,
    Users,
    TrendingUp,
    Award,
    Building2,
    Phone,
    Mail
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "../components/UserAvatar";
import { InvestmentProjectCard } from "../components/InvestmentProjectCard";
import { StatsCard } from "../components/StatsCard";
import { PartnerModal } from "../components/PartnerModal";
import { ProjectLeaderboard } from "../components/ProjectLeaderboard";
import SponsorsSlider from "../components/SponsorsSlider";
import { getProjects, getOverallStats, type OverallStats } from "../../lib/investments/investments.service";
import type { InvestmentProjectWithStats } from "../../lib/investments/types";
import { NotificationDropdown } from "./NotificationDropdown";

interface MobileInvestViewProps {
    onNavigate?: (page: string) => void;
    onEditProject?: (projectId: string) => void;
}

export function MobileInvestView({
    onNavigate,
    onEditProject
}: MobileInvestViewProps) {
    const { user, profile } = useAuth();
    const [projects, setProjects] = useState<InvestmentProjectWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [partnerModalType, setPartnerModalType] = useState<'investor' | 'business' | 'research' | null>(null);
    const [stats, setStats] = useState<OverallStats>({
        totalFarmers: 0,
        affectedArea: 0,
        activeProjects: 0,
        successRate: 0,
    });

    // State để lưu thời gian hiện tại
    const [currentTime, setCurrentTime] = useState(new Date());

    // Cập nhật thời gian mỗi giây
    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    // Load data
    useEffect(() => {
        loadProjects();
        loadStats();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        const result = await getProjects({ limit: 20 });
        if (!result.error) {
            setProjects(result.projects);
        }
        setLoading(false);
    };

    const loadStats = async () => {
        const result = await getOverallStats();
        if (result.stats) {
            setStats(result.stats);
        }
    };

    const getGreeting = (currentHour: number) => {
        if (currentHour >= 5 && currentHour < 10) {
            return { greeting: "Chào buổi sáng", message: "Đầu tư cho tương lai xanh!" };
        } else if (currentHour >= 10 && currentHour < 13) {
            return { greeting: "Chào buổi trưa", message: "Tìm kiếm cơ hội hợp tác!" };
        } else if (currentHour >= 13 && currentHour < 17) {
            return { greeting: "Chào buổi chiều", message: "Kết nối cùng phát triển!" };
        } else if (currentHour >= 17 && currentHour < 21) {
            return { greeting: "Chào buổi tối", message: "Buổi tối an lành!" };
        } else {
            return { greeting: "Chào buổi đêm", message: "Nghỉ ngơi để tái tạo năng lượng!" };
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
            {/* Header Section - Đồng bộ với MobilePostsView & MobileProductsView */}
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
            <div className="px-4 py-4 space-y-4 pb-24">
                {/* Invest Banner */}
                <div
                    className="relative bg-cover bg-center rounded-2xl overflow-hidden shadow-md"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("https://plus.unsplash.com/premium_photo-1664301700782-56a63f359d3a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
                        minHeight: '120px'
                    }}
                >
                    <div className="p-5 flex flex-col justify-center h-full">
                        <h2 className="text-xl font-bold text-white mb-1 drop-shadow-lg uppercase">
                            Đầu tư & Hợp tác
                        </h2>
                        <p className="text-xs text-white/90 drop-shadow">
                            Kết nối Nhà đầu tư - Doanh nghiệp - Nông dân
                        </p>
                    </div>
                </div>

                {/* Impact Stats Grid - 2 cols layout for mobile */}
                <div className="grid grid-cols-2 gap-3">
                    <StatsCard
                        title="Nông dân"
                        value={stats.totalFarmers.toLocaleString("vi-VN")}
                        icon={Users}
                        color="blue"
                        subtitle="Được hưởng lợi"
                    />
                    <StatsCard
                        title="Diện tích"
                        value={`${(stats.affectedArea / 1000).toFixed(1)}k ha`}
                        icon={MapPin}
                        color="green"
                        subtitle="Ảnh hưởng"
                    />
                    <StatsCard
                        title="Dự án"
                        value={stats.activeProjects}
                        icon={TrendingUp}
                        color="orange"
                        subtitle="Đang kêu gọi"
                    />
                    <StatsCard
                        title="Thành công"
                        value={`${stats.successRate}%`}
                        icon={Award}
                        color="purple"
                        subtitle="Tỷ lệ"
                    />
                </div>

                {/* Create Project Button */}
                {user && (
                    <button
                        onClick={() => onNavigate?.('create-project')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Tạo dự án gọi vốn
                    </button>
                )}

                {/* Leaderboard Section */}
                <div className="mb-8">
                    <h2 className="font-semibold text-xl text-gray-900 mb-4">
                        Bảng xếp hạng dự án
                    </h2>
                    <ProjectLeaderboard limit={10} />
                </div>

                {/* Active Projects List */}
                <div className="mb-8">
                    <h2 className="font-semibold text-xl text-gray-900 mb-6">
                        Các dự án đang kêu gọi đầu tư
                    </h2>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : projects.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {projects.map((project) => (
                                <InvestmentProjectCard
                                    key={project.id}
                                    project={project}
                                    onUpdate={loadProjects}
                                    onEdit={onEditProject}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                            <p className="text-gray-600">
                                Chưa có dự án nào đang kêu gọi đầu tư
                            </p>
                            {user && (
                                <button
                                    onClick={() => onNavigate?.('create-project')}
                                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Tạo dự án đầu tiên
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Partner Opportunities */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* For Investors */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-3">Nhà đầu tư</h3>
                        <p className="text-gray-700 text-sm mb-4">
                            Tìm kiếm cơ hội đầu tư sinh lợi và tạo tác động xã hội tích cực
                        </p>
                        <button
                            onClick={() => setPartnerModalType('investor')}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Tìm hiểu thêm
                        </button>
                    </div>

                    {/* For Businesses */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-3">
                            Doanh nghiệp
                        </h3>
                        <p className="text-gray-700 text-sm mb-4">
                            Hợp tác cùng phát triển chuỗi giá trị nông sản bền vững toàn diện
                        </p>
                        <button
                            onClick={() => setPartnerModalType('business')}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Đăng ký hợp tác
                        </button>
                    </div>

                    {/* For Research */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                            <Award className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-3">
                            Tổ chức Khoa học - Kỹ thuật
                        </h3>
                        <p className="text-gray-700 text-sm mb-4">
                            Triển khai nghiên cứu, thử nghiệm mô hình mới tại vùng thực tế
                        </p>
                        <button
                            onClick={() => setPartnerModalType('research')}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Liên hệ hợp tác
                        </button>
                    </div>
                </div>

                {/* Sponsors Slider */}
                <SponsorsSlider />

                {/* Contact Info (Compact for mobile) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <Phone className="w-6 h-6 text-blue-600 mb-2" />
                        <h3 className="font-semibold text-gray-900 mb-1">Hotline</h3>
                        <p className="text-lg font-semibold text-blue-600">1800-2468</p>
                        <p className="text-sm text-gray-600 mt-1">8:00 - 20:00 hàng ngày</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <Mail className="w-6 h-6 text-blue-600 mb-2" />
                        <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                        <p className="text-lg font-semibold text-blue-600">ueh.edu.vn</p>
                        <p className="text-sm text-gray-600 mt-1">Phản hồi trong 24h</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <MapPin className="w-6 h-6 text-blue-600 mb-2" />
                        <h3 className="font-semibold text-gray-900 mb-1">Văn phòng</h3>
                        <p className="font-semibold text-gray-900">Long An, Việt Nam</p>
                        <p className="text-sm text-gray-600 mt-1">Đồng Bằng Sông Cửu Long</p>
                    </div>
                </div>
            </div>

            {/* Partner Modal */}
            {partnerModalType && (
                <PartnerModal
                    isOpen={true}
                    onClose={() => setPartnerModalType(null)}
                    type={partnerModalType}
                />
            )}
        </div>
    );
}