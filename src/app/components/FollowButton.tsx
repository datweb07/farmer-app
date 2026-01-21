import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import {
  followUser,
  unfollowUser,
  followProject,
  unfollowProject,
} from "../../lib/follow/follow.service";

interface FollowButtonProps {
  type: "user" | "project";
  targetId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FollowButton({
  type,
  targetId,
  isFollowing: initialIsFollowing,
  onFollowChange,
  className = "",
  size = "md",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);

    try {
      let result;
      if (isFollowing) {
        result =
          type === "user"
            ? await unfollowUser(targetId)
            : await unfollowProject(targetId);
      } else {
        result =
          type === "user"
            ? await followUser(targetId)
            : await followProject(targetId);
      }

      if (result.success) {
        const newFollowState = !isFollowing;
        setIsFollowing(newFollowState);
        onFollowChange?.(newFollowState);
      } else {
        alert(result.error || "Đã xảy ra lỗi");
      }
    } catch (error) {
      console.error("Follow error:", error);
      alert("Đã xảy ra lỗi không mong muốn");
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        rounded-lg font-medium
        flex items-center gap-2
        transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          isFollowing
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }
        ${className}
      `}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : isFollowing ? (
        <UserMinus className={iconSizes[size]} />
      ) : (
        <UserPlus className={iconSizes[size]} />
      )}
      <span>
        {isFollowing
          ? type === "user"
            ? "Đang theo dõi"
            : "Đã theo dõi"
          : "Theo dõi"}
      </span>
    </button>
  );
}
