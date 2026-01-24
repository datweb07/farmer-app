import { useState, useEffect, useMemo } from "react";
import {
    MapPin,
    Clock,
    Bell,
    Droplet,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Calendar,
    Sprout,
    Info
} from "lucide-react";
import { useProphetPredict } from "../../hooks/useProphetPredict";
import { FilterBar } from "@/components/FilterBar";
import { SalinityChart } from "@/components/SalinityChart";
import { SalinityMap } from "@/components/SalinityMap";
import { SalinityTable } from "@/components/SalinityTable";
import { ComparisonCharts } from "@/components/ComparisonCharts";
import { TrendCharts } from "@/components/TrendCharts";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "../components/UserAvatar";
import type { FilterState } from "@/types/prophet";

// ============================================
// 1. CUSTOM HOOK: useIsMobile
// ============================================
function useIsMobile(breakpoint: number = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, [breakpoint]);

    return isMobile;
}

// ============================================
// 2. COMPONENT CON: SalinityStatusCard (Mobile Only)
// ============================================
const SalinityStatusCard = ({ salinity, cropType }: { salinity: number, cropType: string }) => {
    const thresholds: Record<string, number> = {
        'lua': 2.0,
        'sau-rieng': 0.5,
        'tom': 15.0,
        'binh-thuong': 4.0
    };

    const limit = thresholds[cropType] || 4.0;
    let status = "safe";
    if (salinity > limit) status = "danger";
    else if (salinity > limit * 0.7) status = "warning";

    const statusConfig = {
        safe: {
            color: "bg-green-100 text-green-800 border-green-200",
            icon: CheckCircle,
            label: "An Toàn",
            advice: "Nước tốt. Có thể bơm tưới và tích trữ nước ngọt ngay."
        },
        warning: {
            color: "bg-yellow-100 text-yellow-800 border-yellow-200",
            icon: AlertTriangle,
            label: "Cảnh Báo",
            advice: `Độ mặn tiệm cận ngưỡng của ${cropType === 'sau-rieng' ? 'cây sầu riêng' : 'cây trồng'}. Cần đo kỹ trước khi bơm.`
        },
        danger: {
            color: "bg-red-100 text-red-800 border-red-200",
            icon: XCircle,
            label: "Nguy Hiểm",
            advice: "Độ mặn VƯỢT NGƯỠNG. Tuyệt đối KHÔNG bơm nước. Đóng kín cống bọng."
        }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
        <div className={`rounded-xl border p-5 ${config.color} shadow-sm mb-6`}>
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-6 h-6" />
                        <h3 className="text-lg font-bold uppercase">{config.label}</h3>
                    </div>
                    <p className="text-4xl font-black mb-1">
                        {salinity.toFixed(2)} <span className="text-xl font-normal">g/l</span>
                    </p>
                    <p className="text-sm opacity-90 mb-4">Dự báo trung bình hôm nay</p>
                </div>
                <div className="bg-white/40 p-2 rounded-lg">
                    <Droplet className={`w-8 h-8 ${status === 'danger' ? 'text-red-600' : 'text-blue-500'}`} />
                </div>
            </div>

            <div className="bg-white/60 rounded-lg p-3 text-sm font-medium">
                💡 Khuyến nghị: {config.advice}
            </div>
        </div>
    );
};

// ============================================
// 3. COMPONENT: MobileSalinityView
// ============================================
interface MobileSalinityViewProps {
    data: any[];
    loading: boolean;
    error: string | null;
    onNavigate?: (page: string) => void;
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
}

function MobileSalinityView({ data, loading, onNavigate, filters, setFilters }: MobileSalinityViewProps) {
    const { profile } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedCrop, setSelectedCrop] = useState("lua");

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const getGreeting = (currentHour: number) => {
        if (currentHour >= 5 && currentHour < 10) return { greeting: "Chào buổi sáng", message: "Kiểm tra độ mặn trước khi tưới nhé!" };
        if (currentHour >= 10 && currentHour < 13) return { greeting: "Chào buổi trưa", message: "Nghỉ ngơi và cập nhật tình hình nước." };
        if (currentHour >= 13 && currentHour < 17) return { greeting: "Chào buổi chiều", message: "Theo dõi diễn biến thủy triều." };
        if (currentHour >= 17 && currentHour < 21) return { greeting: "Chào buổi tối", message: "Lên kế hoạch cho ngày mai." };
        return { greeting: "Chào buổi đêm", message: "Chúc bà con ngủ ngon!" };
    };

    const greeting = getGreeting(currentTime.getHours());
    const formattedTime = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedDate = currentTime.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
    const province = filters.tinh || "TOÀN VÙNG";

    // Filter logic cho Mobile
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (filters.nam && item.nam !== filters.nam) return false;
            if (filters.tinh && item.tinh !== filters.tinh) return false;
            if (filters.ten_tram && item.ten_tram !== filters.ten_tram) return false;
            return true;
        });
    }, [data, filters]);

    const currentAvgSalinity = useMemo(() => {
        if (filteredData.length === 0) return 0;
        const recentData = filteredData.slice(0, 7);
        const sum = recentData.reduce((acc, curr) => acc + curr.du_bao_man, 0);
        return sum / recentData.length;
    }, [filteredData]);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header Section - Giống MobilePostView */}
            <div
                className="relative bg-cover bg-center text-white px-4 pt-6 pb-4"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("https://images.unsplash.com/photo-1621961458348-e53b95a6390b?w=800&q=80")', // Ảnh sông nước miền tây
                }}
            >
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onNavigate?.("profile")}
                            className="group relative rounded-full p-0.5 border-2 border-white/50 hover:border-white transition-all active:scale-95"
                        >
                            <UserAvatar
                                avatarUrl={profile?.avatar_url}
                                username={profile?.username || "User"}
                                size="lg"
                            />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold tracking-wide">
                                {greeting.greeting}, {profile?.username || "Bà con"}!
                            </h1>
                            <p className="text-xs text-gray-200">{greeting.message}</p>
                        </div>
                    </div>
                    <button className="relative p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all">
                        <Bell className="w-6 h-6 text-white" />
                    </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> Khu vực: <span className="font-bold uppercase truncate max-w-[120px]">{province}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{formattedTime} | {formattedDate}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-4 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                        <p className="text-gray-500 text-sm">Đang cập nhật số liệu...</p>
                    </div>
                ) : (
                    <>
                        {/* 1. Filter Bar (Giản lược hoặc giữ nguyên nếu component đã responsive) */}
                        <div className="bg-white p-3 rounded-xl shadow-sm">
                            <FilterBar data={data} filters={filters} onFilterChange={setFilters} />
                        </div>

                        {/* 2. Crop Selector */}
                        <div>
                            <label className="text-sm font-bold text-gray-700 mb-2 block ml-1">Bạn đang canh tác gì?</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setSelectedCrop('lua')}
                                    className={`p-3 rounded-xl text-sm font-medium border transition-all flex flex-col items-center gap-1 ${selectedCrop === 'lua' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                                >
                                    <Sprout className="w-5 h-5" /> Lúa
                                </button>
                                <button
                                    onClick={() => setSelectedCrop('sau-rieng')}
                                    className={`p-3 rounded-xl text-sm font-medium border transition-all flex flex-col items-center gap-1 ${selectedCrop === 'sau-rieng' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                                >
                                    <Sprout className="w-5 h-5" /> Sầu riêng
                                </button>
                                <button
                                    onClick={() => setSelectedCrop('tom')}
                                    className={`p-3 rounded-xl text-sm font-medium border transition-all flex flex-col items-center gap-1 ${selectedCrop === 'tom' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                                >
                                    <Droplet className="w-5 h-5" /> Tôm
                                </button>
                            </div>
                        </div>

                        {/* 3. Status Card */}
                        {filteredData.length > 0 ? (
                            <SalinityStatusCard
                                salinity={currentAvgSalinity}
                                cropType={selectedCrop}
                            />
                        ) : (
                            <div className="bg-yellow-50 p-4 rounded-xl text-yellow-800 text-sm border border-yellow-200 flex gap-2">
                                <Info className="w-5 h-5 flex-shrink-0" />
                                Vui lòng chọn Tỉnh và Trạm cụ thể ở bộ lọc phía trên để xem cảnh báo chi tiết.
                            </div>
                        )}

                        {/* 4. Chart & Map (Gọn gàng hơn cho mobile) */}
                        {filteredData.length > 0 && (
                            <>
                                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                            Xu hướng 7 ngày tới
                                        </h3>
                                    </div>
                                    <div className="h-64">
                                        <SalinityChart data={filteredData} />
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                    <h3 className="font-bold text-gray-900 mb-2">Bản đồ theo dõi</h3>
                                    <div className="h-64 rounded-lg overflow-hidden bg-gray-100">
                                        <SalinityMap data={filteredData} />
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ============================================
// 4. MAIN PAGE: SalinityPage
// ============================================
interface SalinityPageProps {
    onNavigate?: (page: string) => void;
}

export function SalinityPage({ onNavigate }: SalinityPageProps) {
    const { data, loading, error, refetch } = useProphetPredict();
    const isMobile = useIsMobile();

    const [filters, setFilters] = useState<FilterState>({
        nam: new Date().getFullYear(),
        tinh: null,
        ten_tram: null,
    });

    // Apply filters to data (Dùng chung cho cả 2 view nếu cần logic phức tạp hơn, 
    // nhưng hiện tại MobileView tự handle filter để linh hoạt UI)
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (filters.nam && item.nam !== filters.nam) return false;
            if (filters.tinh && item.tinh !== filters.tinh) return false;
            if (filters.ten_tram && item.ten_tram !== filters.ten_tram) return false;
            return true;
        });
    }, [data, filters]);

    // --- MOBILE VIEW RETURN ---
    if (isMobile) {
        return (
            <MobileSalinityView
                data={data} // Truyền data gốc để Mobile tự filter hoặc truyền filteredData tùy chiến lược
                loading={loading}
                error={error}
                onNavigate={onNavigate}
                filters={filters}
                setFilters={setFilters}
            />
        );
    }

    // --- DESKTOP VIEW RETURN (Giữ nguyên logic cũ) ---
    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-600">Đang tải dữ liệu dự báo độ mặn...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-start">
                            <div className="shrink-0">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-lg font-medium text-red-800">Lỗi tải dữ liệu</h3>
                                <p className="mt-2 text-sm text-red-700">{error}</p>
                                <button
                                    onClick={refetch}
                                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                >
                                    Thử lại
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
                            Độ Mặn Dự Báo (Prophet Model)
                        </h1>
                        <p className="text-gray-600">
                            Dự báo độ mặn nước mặt dựa trên mô hình Prophet
                        </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-start">
                            <div className="shrink-0">
                                <Info className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-yellow-800">Chưa có dữ liệu</h3>
                                <p className="mt-2 text-sm text-yellow-700">
                                    Hiện tại chưa có dữ liệu dự báo độ mặn trong hệ thống. Vui lòng kiểm tra lại sau.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                    <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
                        Độ Mặn Dự Báo (Dựa trên mô hình Prophet)
                    </h1>
                    <p className="text-gray-600">
                        Lưu ý: Mọi kết quả từ việc chạy mô hình và dự báo chỉ mang tính tham
                        khảo. Đội ngũ phát triển không chịu trách nhiệm về bất kỳ thiệt hại
                        nào phát sinh từ việc sử dụng dữ liệu này.
                    </p>
                </div>

                {/* Filter Bar */}
                <div className="mb-8">
                    <FilterBar
                        data={data}
                        filters={filters}
                        onFilterChange={setFilters}
                    />
                </div>

                {/* Statistics Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Tổng số bản ghi</p>
                        <p className="text-2xl font-bold text-blue-600">{filteredData.length}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Năm dự báo</p>
                        <p className="text-2xl font-bold text-green-600">
                            {new Set(filteredData.map((d) => d.nam)).size} năm
                        </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Tỉnh/Thành phố</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {new Set(filteredData.map((d) => d.tinh)).size}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Độ mặn TB</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {(filteredData.reduce((sum, d) => sum + d.du_bao_man, 0) / (filteredData.length || 1)).toFixed(2)} g/l
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="mb-8">
                    <SalinityMap data={filteredData} />
                </div>
                <div className="mb-8">
                    <SalinityChart data={filteredData} />
                </div>
                <div className="mb-8">
                    <TrendCharts data={filteredData} />
                </div>
                <ComparisonCharts data={filteredData} />
                <div className="mb-8 mt-8">
                    <SalinityTable data={filteredData} />
                </div>
            </div>
        </div>
    );
}