// ============================================
// Mobile Top Bar Component
// ============================================

import { UserAvatar } from './UserAvatar';
import { NotificationDropdown } from './NotificationDropdown';

interface MobileTopBarProps {
    profile: {
        avatar_url?: string | null;
        username?: string | null;
    } | null;
    onNavigateToProfile: () => void;
}

export function MobileTopBar({
    profile,
    onNavigateToProfile
}: MobileTopBarProps) {
    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-30">
            {/* Layer nền Glassmorphism:
               - bg-white/90: Nền trắng đục 90% (đậm hơn footer một chút để dễ đọc text)
               - backdrop-blur-md: Làm mờ nội dung trượt bên dưới
               - border-b: Đường kẻ mờ ngăn cách
            */}
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md border-b border-white/20 shadow-sm rounded-bl-3xl rounded-br-3xl" />


            {/* Content Container */}
            <div className="relative flex items-center justify-between px-6 h-18">

                {/* LEFT: User Avatar */}
                <div className="flex-1 flex justify-start">
                    <button
                        onClick={onNavigateToProfile}
                        className="group relative rounded-full p-0.5 border border-transparent hover:border-blue-200 transition-all active:scale-95"
                        aria-label="Hồ sơ"
                    >
                        <UserAvatar
                            avatarUrl={profile?.avatar_url}
                            username={profile?.username || 'User'}
                            size="lg" // Giảm xuống sm (32px) hoặc md (40px) tùy component của bạn, sm thường gọn hơn cho topbar
                        />
                        {/* Status Dot (Online indicator - Optional) */}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </button>
                </div>

                {/* CENTER: App Logo / Title */}
                <div className="flex-none">
                    <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-1">
                        <div className="flex flex-col leading-tight text-center">
                            <span className="text-blue-600">Nông nghiệp ĐBSCL</span>
                            <span className="text-green-600">Hỗ trợ nông dân</span>
                        </div>

                    </h1>
                </div>

                {/* RIGHT: Notification Dropdown */}
                <div className="flex-1 flex justify-end">
                    {/* Wrapper để căn chỉnh icon chuông */}
                    <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100/50 transition-colors active:scale-95">
                        <NotificationDropdown />
                    </div>
                </div>

            </div>
        </div>
    );
}