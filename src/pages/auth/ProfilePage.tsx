// ============================================
// Profile Page
// ============================================
// User profile management interface
// ============================================

import { LogOut, User, Phone, Briefcase, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function ProfilePage() {
    const { profile, signOut } = useAuth();

    const handleSignOut = async () => {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            await signOut();
        }
    };

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pt-20 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mb-4 shadow-xl">
                        <User className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                        Hồ sơ cá nhân
                    </h1>
                    <p className="text-gray-600 mt-2">Quản lý thông tin tài khoản của bạn</p>
                </div>

                {/* Profile Card */}
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/50">
                    <div className="space-y-6">
                        {/* Username */}
                        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-500">Tên đăng nhập</p>
                                <p className="text-lg font-semibold text-gray-900 truncate">
                                    {profile.username}
                                </p>
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                                <Phone className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-500">Số điện thoại</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {profile.phone_number || 'Chưa cập nhật'}
                                </p>
                            </div>
                        </div>

                        {/* Role */}
                        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                                <Briefcase className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-500">Vai trò</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span
                                        className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${profile.role === 'farmer'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-blue-100 text-blue-800'
                                            }`}
                                    >
                                        {profile.role === 'farmer' ? '👨‍🌾 Nông dân' : '🏢 Tổ chức'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Organization (if applicable) */}
                        {profile.organization_id && (
                            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                                    <Building2 className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-500">Tổ chức</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {profile.organization_id}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Account Info */}
                        <div className="pt-6 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Ngày tạo</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Cập nhật lần cuối</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(profile.updated_at).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={handleSignOut}
                            className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            Đăng xuất
                        </button>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>
                        Cần hỗ trợ?{' '}
                        <a href="mailto:support@dbscl.vn" className="text-blue-600 hover:underline">
                            Liên hệ với chúng tôi
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
