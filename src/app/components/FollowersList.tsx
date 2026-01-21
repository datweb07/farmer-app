import { useState, useEffect } from "react";
import { X, Users, UserCheck, Loader2 } from "lucide-react";
import {
  getUserFollowers,
  getUserFollowing,
} from "../../lib/follow/follow.service";
import type { UserFollow } from "../../lib/follow/types";
import { FollowButton } from "./FollowButton";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";

interface FollowersListProps {
  userId: string;
  username: string;
  initialTab?: "followers" | "following";
  isOpen: boolean;
  onClose: () => void;
}

export function FollowersList({
  userId,
  username,
  initialTab = "followers",
  isOpen,
  onClose,
}: FollowersListProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    initialTab,
  );
  const [followers, setFollowers] = useState<UserFollow[]>([]);
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab, userId]);

  const loadData = async () => {
    setLoading(true);

    try {
      if (activeTab === "followers") {
        const result = await getUserFollowers(userId);
        if (!result.error) {
          setFollowers(result.followers);
        }
      } else {
        const result = await getUserFollowing(userId);
        if (!result.error) {
          setFollowing(result.following);
        }
      }
    } catch (error) {
      console.error("Load followers error:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentList = activeTab === "followers" ? followers : following;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">{username}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("followers")}
              className={`flex-1 px-6 py-4 font-medium transition-colors relative ${
                activeTab === "followers"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                <span>Người theo dõi</span>
              </div>
              {activeTab === "followers" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 px-6 py-4 font-medium transition-colors relative ${
                activeTab === "following"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserCheck className="w-5 h-5" />
                <span>Đang theo dõi</span>
              </div>
              {activeTab === "following" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <p className="text-gray-500">Đang tải...</p>
              </div>
            ) : currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  {activeTab === "followers" ? (
                    <Users className="w-8 h-8 text-gray-400" />
                  ) : (
                    <UserCheck className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <p className="text-gray-500 text-center">
                  {activeTab === "followers"
                    ? "Chưa có người theo dõi"
                    : "Chưa theo dõi ai"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentList.map((item: any) => {
                  const user =
                    activeTab === "followers"
                      ? {
                          id: item.follower_id,
                          username: item.username,
                          avatar_url: item.avatar_url,
                        }
                      : {
                          id: item.following_id,
                          username: item.username,
                          avatar_url: item.avatar_url,
                        };

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={user.avatar_url}
                          username={user.username}
                          size="md"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {user.username}
                          </h3>
                        </div>
                      </div>

                      {/* Follow button - don't show for current logged-in user */}
                      {currentUser && user.id !== currentUser.id && (
                        <FollowButton
                          type="user"
                          targetId={user.id}
                          isFollowing={false} // This should be checked from context
                          size="sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
