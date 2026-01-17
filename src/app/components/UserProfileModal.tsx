// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, Award, Calendar, User as UserIcon, FileText, Share2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { PostCard } from './PostCard';
import type { UserProfile } from '../../lib/auth/auth.types';
import type { PostWithStats } from '../../lib/community/types';
import { supabase } from '../../lib/supabase/supabase';
import { getUserPosts, getUserSharedPosts } from '../../lib/community/posts.service';
import { getUserPoints } from '../../lib/community/leaderboard.service';

interface UserProfileModalProps {
    username: string;
    isOpen: boolean;
    onClose: () => void;
}

export function UserProfileModal({ username, isOpen, onClose }: UserProfileModalProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'shared'>('posts');
    const [userPosts, setUserPosts] = useState<PostWithStats[]>([]);
    const [sharedPosts, setSharedPosts] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [userPoints, setUserPoints] = useState<number>(0);

    useEffect(() => {
        if (isOpen && username) {
            loadProfile();
        } else {
            // Reset state when modal closes
            setProfile(null);
            setUserPosts([]);
            setSharedPosts([]);
            setActiveTab('posts');
            setUserPoints(0);
        }
    }, [isOpen, username]);

    useEffect(() => {
        if (profile?.id) {
            loadUserActivity();
        }
    }, [profile?.id, activeTab]);

    const loadProfile = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (!error && data) {
            setProfile(data);
            // Load dynamic points
            const pointsResult = await getUserPoints(data.id);
            if (!pointsResult.error) {
                setUserPoints(pointsResult.points);
            }
        }
        setLoading(false);
    };

    const loadUserActivity = async () => {
        if (!profile?.id) return;

        setLoadingPosts(true);
        if (activeTab === 'posts') {
            const result = await getUserPosts(profile.id);
            if (!result.error) {
                setUserPosts(result.posts);
            }
        } else {
            const result = await getUserSharedPosts(profile.id);
            if (!result.error) {
                setSharedPosts(result.posts);
            }
        }
        setLoadingPosts(false);
    };

    if (!isOpen) return null;

    const currentPosts = activeTab === 'posts' ? userPosts : sharedPosts;
    const hasNoPosts = currentPosts.length === 0 && !loadingPosts;

    return (
        <>
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div
                    className="bg-white border border-gray-200 rounded-lg max-w-2xl w-full relative my-8 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="sticky top-2 right-2 float-right text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full shadow-sm z-10"
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
                            <div className="space-y-2 mb-6">
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
                                            {userPoints} điểm
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

                            {/* Activity Section */}
                            <div className="border-t border-gray-200 pt-4">
                                <h3 className="text-base font-semibold text-gray-900 mb-3">
                                    Hoạt động
                                </h3>

                                {/* Tabs */}
                                <div className="flex gap-2 mb-4 border-b border-gray-200">
                                    <button
                                        onClick={() => setActiveTab('posts')}
                                        className={`flex items-center gap-2 px-3 py-2 font-medium text-xs transition-colors ${activeTab === 'posts'
                                            ? 'text-blue-600 border-b-2 border-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <FileText className="w-3 h-3" />
                                        Bài viết
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('shared')}
                                        className={`flex items-center gap-2 px-3 py-2 font-medium text-xs transition-colors ${activeTab === 'shared'
                                            ? 'text-blue-600 border-b-2 border-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <Share2 className="w-3 h-3" />
                                        Đã chia sẻ
                                    </button>
                                </div>

                                {/* Posts */}
                                {loadingPosts ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : hasNoPosts ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 text-xs">
                                            {activeTab === 'posts'
                                                ? 'Người dùng này chưa có bài viết nào'
                                                : 'Người dùng này chưa chia sẻ bài viết nào'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {currentPosts.slice(0, 5).map((post: any) => (
                                            <PostCard
                                                key={post.id}
                                                post={post}
                                                onUpdate={loadUserActivity}
                                            />
                                        ))}
                                        {currentPosts.length > 5 && (
                                            <p className="text-center text-xs text-gray-500 py-2">
                                                Hiển thị 5/{currentPosts.length} bài viết
                                            </p>
                                        )}
                                    </div>
                                )}
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