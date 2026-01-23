import { Home, FileText, ShoppingBag, TrendingUp, Droplet, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
    icon: typeof Home;
    label: string;
    page: string;
}

// Navigation items for farmers
const farmerNavItems: NavItem[] = [
    { icon: Home, label: '', page: 'dashboard' },
    { icon: FileText, label: '', page: 'posts' },
    { icon: ShoppingBag, label: '', page: 'products' },
    { icon: TrendingUp, label: '', page: 'invest' },
];

// Navigation items for business users
const businessNavItems: NavItem[] = [
    { icon: BarChart3, label: '', page: 'business-dashboard' },
    { icon: FileText, label: '', page: 'posts' },
    { icon: ShoppingBag, label: '', page: 'products' },
    { icon: TrendingUp, label: '', page: 'invest' },
];

interface MobileBottomNavProps {
    currentPage: string;
    onNavigate: (page: string) => void;
}

export function MobileBottomNav({ currentPage, onNavigate }: MobileBottomNavProps) {
    const { profile } = useAuth();
    const isActive = (page: string) => currentPage === page;

    // Choose nav items based on user role
    const navItems = profile?.role === 'business' ? businessNavItems : farmerNavItems;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
            {/* Container - Detached from bottom */}
            <div className="relative px-4 pb-6 pointer-events-auto">

                {/* Central FAB - Primary Action (positioned above notch) */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[4.5rem] z-20">
                    <button
                        onClick={() => onNavigate('salinity')}
                        className="group relative"
                        aria-label="Kiểm tra độ mặn"
                    >
                        {/* FAB Button */}
                        <div className="w-16 h-16 translate-y-2 bg-[#84cc16] rounded-full shadow-2xl hover:shadow-lime-500/40 active:scale-95 transition-all duration-200 flex items-center justify-center ring-4 ring-white">
                            <Droplet className="w-8 h-8 text-white drop-shadow-md group-active:rotate-12 transition-transform fill-white" />
                        </div>

                        {/* Permanent Label (Primary Action should be clear) */}
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 translate-y-5 whitespace-nowrap pointer-events-none">
                            <span className="text-[11px] font-bold text-blue-600 drop-shadow-sm">
                            </span>
                        </div>

                        {/* Glow halo */}

                    </button>
                </div>

                {/* Navigation Bar with SVG Notch */}
                <div className="relative">
                    {/* SVG Mask for Notch */}
                    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                        <defs>
                            <mask id="notch-mask">
                                {/* 1. Hình chữ nhật trắng - vùng hiển thị */}
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />

                                {/* 2. Thay thế hình tròn bằng Path để bo góc mượt mà */}
                                {/* Đặt x="50%" để căn giữa, overflow="visible" để vẽ xung quanh tâm */}
                                <svg x="50%" y="0" overflow="visible">
                                    <path
                                        /* Giải thích đường vẽ (d):
                                           M -55 0: Bắt đầu từ bên trái tâm 55px (trên cạnh trên cùng)
                                           C -35 0: Điểm điều khiển 1 (giữ đường nằm ngang để bo mượt)
                                           -30 45: Điểm điều khiển 2 (kéo cong xuống dưới)
                                           0 45:   Điểm đáy của rãnh (giữa tâm, sâu 45px)
                                           ... và lặp lại đối xứng cho bên phải
                                        */
                                        // d="M -60 0 C -35 0 -30 45 0 45 C 30 45 35 0 60 0 Z"
                                        // fill="black"

                                        d="M -70 0 C -35 0 -45 45 0 45 C 45 45 35 0 70 0 Z"
                                        fill="black"
                                    />
                                </svg>
                            </mask>
                        </defs>
                    </svg>

                    {/* Main Navigation Container */}
                    <div
                        className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20"
                        style={{
                            WebkitMask: 'url(#notch-mask)',
                            mask: 'url(#notch-mask)'
                        }}
                    >
                        {/* Navigation Content */}
                        <div className="h-[4.5rem] px-1 pt-4 pb-3 flex items-center justify-between">

                            {/* Left Group */}
                            <div className="flex items-center gap-2 flex-1 justify-start">
                                {navItems.slice(0, 2).map((item) => (
                                    <NavItemButton
                                        key={item.page}
                                        item={item}
                                        active={isActive(item.page)}
                                        onNavigate={onNavigate}
                                    />
                                ))}
                            </div>

                            {/* Center Spacer (for FAB) */}
                            <div className="w-24" />

                            {/* Right Group */}
                            <div className="flex items-center gap-2 flex-1 justify-end">
                                {navItems.slice(2).map((item) => (
                                    <NavItemButton
                                        key={item.page}
                                        item={item}
                                        active={isActive(item.page)}
                                        onNavigate={onNavigate}
                                    />
                                ))}
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Nav Item Button Component
interface NavItemButtonProps {
    item: NavItem;
    active: boolean;
    onNavigate: (page: string) => void;
}

function NavItemButton({ item, active, onNavigate }: NavItemButtonProps) {
    const Icon = item.icon;

    return (
        <button
            onClick={() => onNavigate(item.page)}
            className={`
        flex flex-col items-center justify-center gap-1 
        py-2 px-3 rounded-xl 
        transition-all duration-200
        ${active ? 'scale-105' : 'scale-100 hover:bg-gray-50 active:scale-95'}
      `}
            aria-label={item.label}
        >
            {/* Icon Container */}
            <div className={`p-1.5 rounded-lg transition-all ${active ? 'bg-blue-50' : ''}`}>
                <Icon
                    className={`w-7 h-7 transition-colors ${active ? 'text-green-500' : 'text-gray-500'
                        }`}
                />
            </div>

            {/* Label */}
            <span
                className={`text-[10px] font-medium transition-colors ${active ? 'text-blue-600' : 'text-gray-500'
                    }`}
            >
                {item.label}
            </span>
        </button>
    );
}