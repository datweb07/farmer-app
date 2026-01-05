// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, Award, Calendar, User as UserIcon } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import type { UserProfile } from '../../lib/auth/auth.types';
import { supabase } from '../../lib/supabase/supabase';

interface UserProfileModalProps {
    username: string;
    isOpen: boolean;
    onClose: () => void;
}

export function UserProfileModal({ username, isOpen, onClose }: UserProfileModalProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && username) {
            loadProfile();
        }
    }, [isOpen, username]);

    const loadProfile = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (!error && data) {
            setProfile(data);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white border border-gray-200 rounded-lg max-w-md w-full relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="mt-3 text-gray-600 text-sm">Đang tải...</p>
                        </div>
                    ) : profile ? (
                        <div className="p-4">
                            {/* Avatar & Name */}
                            <div className="text-center mb-4">
                                <div className="inline-block mb-2">
                                    <UserAvatar
                                        avatarUrl={profile.avatar_url}
                                        username={profile.username}
                                        size="xl"
                                    />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {profile.username}
                                </h2>
                            </div>

                            {/* Profile Info */}
                            <div className="space-y-2">
                                {/* Phone */}
                                {profile.phone_number && (
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                        <UserIcon className="w-3 h-3 text-gray-600" />
                                        <div>
                                            <p className="text-xs text-gray-500">Số điện thoại</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {profile.phone_number}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Points */}
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                                    <Award className="w-3 h-3 text-blue-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Điểm uy tín</p>
                                        <p className="text-sm font-medium text-blue-700">
                                            {profile.points || 0} điểm
                                        </p>
                                    </div>
                                </div>

                                {/* Join date */}
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                    <Calendar className="w-3 h-3 text-gray-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Tham gia</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                </div>

                                {/* Role */}
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                    <UserIcon className="w-3 h-3 text-gray-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Vai trò</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {profile.role === 'farmer' ? 'Nông dân' : 'Tổ chức'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center">
                            <p className="text-gray-600 text-sm">Không tìm thấy thông tin người dùng</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}