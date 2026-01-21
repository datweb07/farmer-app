// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Profile Page
// ============================================
// User profile management interface with avatar upload
// ============================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  LogOut,
  User,
  Phone,
  Briefcase,
  Building2,
  Upload,
  Trash2,
  FileText,
  Share2,
  Users as UsersIcon,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { uploadAvatar, deleteAvatar } from "../../lib/auth/auth.service";
import { UserAvatar } from "../../app/components/UserAvatar";
import { validateImageFile } from "../../lib/utils/image-validation";
import {
  getUserPosts,
  getUserSharedPosts,
} from "../../lib/community/posts.service";
import { PostCard } from "../../app/components/PostCard";
import type { PostWithStats } from "../../lib/community/types";
import BadgeList from "../../app/components/BadgeList";
import BadgeNotification from "../../app/components/BadgeNotification";
import { subscribeToUserBadges } from "../../lib/badges/badge.service";
import type { BadgeProgress } from "../../lib/badges/types";
import { getUserFollowStats } from "../../lib/follow/follow.service";
import type { FollowStats } from "../../lib/follow/types";
import { FollowersList } from "../../app/components/FollowersList";

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Activity state
  const [activeTab, setActiveTab] = useState<"posts" | "shared">("posts");
  const [userPosts, setUserPosts] = useState<PostWithStats[]>([]);
  const [sharedPosts, setSharedPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Badge notification state
  const [newBadge, setNewBadge] = useState<BadgeProgress | null>(null);

  // Follow stats state
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [followersListTab, setFollowersListTab] = useState<
    "followers" | "following"
  >("followers");

  const loadUserActivity = useCallback(async () => {
    if (!profile?.id) return;

    setLoadingPosts(true);
    if (activeTab === "posts") {
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
  }, [profile?.id, activeTab]);

  // Set up badge notification subscription (only depends on profile.id)
  useEffect(() => {
    if (!profile?.id) return;

    console.log(
      "🔔 [ProfilePage] Setting up badge subscription for:",
      profile.id,
    );

    // Subscribe to new badge awards
    const subscription = subscribeToUserBadges(profile.id, async (badge) => {
      console.log("🎉 [ProfilePage] New badge earned!", badge);

      // Fetch the full badge progress to get all details for notification
      const { getUserBadgeProgress } =
        await import("../../lib/badges/badge.service");
      const badgeProgress = await getUserBadgeProgress(profile.id);
      console.log("📊 [ProfilePage] Badge progress data:", badgeProgress);

      const earnedBadge = badgeProgress.find(
        (b) => b.badge_id === badge.badge_id,
      );
      console.log("🔍 [ProfilePage] Found earned badge:", earnedBadge);

      if (earnedBadge) {
        // Show notification
        console.log(
          "✅ [ProfilePage] Setting new badge for notification:",
          earnedBadge,
        );
        setNewBadge(earnedBadge);
      } else {
        console.warn("⚠️ [ProfilePage] Could not find badge in progress data");
      }

      // Refresh the badge list (triggers re-render of BadgeList)
      loadUserActivity();
    });

    return () => {
      console.log("🔕 [ProfilePage] Unsubscribing from badge notifications");
      subscription.unsubscribe();
    };
  }, [profile?.id, loadUserActivity]); // Add loadUserActivity to dependencies

  // Load user activity when profile or activeTab changes
  useEffect(() => {
    if (profile?.id) {
      loadUserActivity();
    }
  }, [profile?.id, activeTab, loadUserActivity]);

  // Load follow stats
  useEffect(() => {
    if (profile?.id) {
      loadFollowStats();
    }
  }, [profile?.id]);

  const loadFollowStats = async () => {
    if (!profile?.id) return;
    const stats = await getUserFollowStats(profile.id);
    if (stats) {
      setFollowStats(stats);
    }
  };

  const handleSignOut = async () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      await signOut();
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setAvatarError(validation.error || "File không hợp lệ");
      return;
    }

    setAvatarUploading(true);
    const result = await uploadAvatar(file);
    setAvatarUploading(false);

    if (result.success) {
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setAvatarError(result.error || "Không thể tải ảnh lên");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Bạn có chắc muốn xóa ảnh đại diện?")) return;

    setAvatarUploading(true);
    const result = await deleteAvatar();
    setAvatarUploading(false);

    if (result.success) {
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setAvatarError(result.error || "Không thể xóa ảnh");
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  const currentPosts = activeTab === "posts" ? userPosts : sharedPosts;
  const hasNoPosts = currentPosts.length === 0 && !loadingPosts;

  return (
    <div className="min-h-screen bg-white pt-6 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Hồ sơ cá nhân
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Quản lý thông tin tài khoản
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-700 text-center text-sm">
              ✓ Cập nhật thành công!
            </p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          {/* Avatar Upload Section - Centered */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Ảnh đại diện
            </h2>

            <div className="flex flex-col items-center">
              {/* Avatar Container */}
              <div className="relative mb-4">
                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  username={profile?.username}
                  size="xl"
                />
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Image Info */}
              <p className="text-sm text-gray-600 mb-4 text-center">
                Ảnh JPG, PNG hoặc WebP. Tối đa 2MB.
              </p>

              {/* Buttons - Centered under avatar */}
              <div className="flex flex-wrap gap-2 justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                  disabled={avatarUploading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Tải ảnh lên
                </button>
                {profile?.avatar_url && (
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={avatarUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa ảnh
                  </button>
                )}
              </div>

              {/* Error Message */}
              {avatarError && (
                <p className="mt-3 text-sm text-red-600 text-center">
                  {avatarError}
                </p>
              )}
            </div>
          </div>

          {/* Follow Stats */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => {
                  setFollowersListTab("followers");
                  setShowFollowersList(true);
                }}
                className="flex flex-col items-center hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-bold text-gray-900">
                    {followStats?.followers_count || 0}
                  </span>
                </div>
                <span className="text-sm text-gray-600">Người theo dõi</span>
              </button>
              <div className="w-px h-12 bg-gray-300" />
              <button
                onClick={() => {
                  setFollowersListTab("following");
                  setShowFollowersList(true);
                }}
                className="flex flex-col items-center hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-bold text-gray-900">
                    {followStats?.following_count || 0}
                  </span>
                </div>
                <span className="text-sm text-gray-600">Đang theo dõi</span>
              </button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            {/* Username */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-white rounded flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Tên đăng nhập</p>
                <p className="text-base font-medium text-gray-900">
                  {profile.username}
                </p>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-white rounded flex items-center justify-center">
                <Phone className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Số điện thoại</p>
                <p className="text-base font-medium text-gray-900">
                  {profile.phone_number || "Chưa cập nhật"}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-white rounded flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Vai trò</p>
                <div className="mt-1">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      profile.role === "farmer"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {profile.role === "farmer" ? "Nông dân" : "Tổ chức"}
                  </span>
                </div>
              </div>
            </div>

            {/* Organization (if applicable) */}
            {profile.organization_id && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-white rounded flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Tổ chức</p>
                  <p className="text-base font-medium text-gray-900">
                    {profile.organization_id}
                  </p>
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-500">Ngày tạo</p>
                  <p className="font-medium text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Cập nhật lần cuối</p>
                  <p className="font-medium text-gray-900">
                    {new Date(profile.updated_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Badges Section */}
        {profile?.id && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <BadgeList userId={profile.id} />
          </div>
        )}

        {/* Badge Notification */}
        <BadgeNotification badge={newBadge} onClose={() => setNewBadge(null)} />

        {/* Activity Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Hoạt động của bạn
          </h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "posts"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-4 h-4" />
              Bài viết của tôi
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === "shared"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Share2 className="w-4 h-4" />
              Đã chia sẻ
            </button>
          </div>

          {/* Posts */}
          {loadingPosts ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : hasNoPosts ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">
                {activeTab === "posts"
                  ? "Bạn chưa có bài viết nào"
                  : "Bạn chưa chia sẻ bài viết nào"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentPosts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUpdate={loadUserActivity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>
            Cần hỗ trợ?{" "}
            <a
              href="mailto:support@dbscl.vn"
              className="text-blue-600 hover:underline"
            >
              Liên hệ với chúng tôi
            </a>
          </p>
        </div>
      </div>

      {/* Badge Notification */}
      {newBadge && (
        <BadgeNotification badge={newBadge} onClose={() => setNewBadge(null)} />
      )}

      {/* Followers List Modal */}
      {profile && (
        <FollowersList
          userId={profile.id}
          username={profile.username}
          initialTab={followersListTab}
          isOpen={showFollowersList}
          onClose={() => setShowFollowersList(false)}
        />
      )}
    </div>
  );
}
