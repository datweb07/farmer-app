import React from "react";
import type { BadgeProgress } from "../../lib/badges/types";

interface BadgeProps {
  badge: BadgeProgress;
  size?: "small" | "medium" | "large";
  showProgress?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  badge,
  size = "medium",
  showProgress = true,
}) => {
  const sizeClasses = {
    small: "w-10 h-10",
    medium: "w-14 h-14",
    large: "w-20 h-20",
  };

  const progressPercentage =
    badge.target > 0 ? Math.min((badge.progress / badge.target) * 100, 100) : 0;

  return (
    <div className="flex flex-col items-center">
      {/* Badge Icon */}
      <div className="relative">
        <div
          className={`
                        ${sizeClasses[size]}
                        rounded-full
                        flex items-center justify-center
                        ${badge.earned ? "border-2" : "border border-gray-200 opacity-60"}
                    `}
          style={{
            backgroundColor: badge.earned
              ? `${badge.badge_color}15`
              : "#f9fafb",
            borderColor: badge.earned ? badge.badge_color : "#e5e7eb",
          }}
        >
          <span className="text-lg">{badge.badge_icon}</span>
        </div>

        {/* Earned Checkmark */}
        {badge.earned && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>

      {/* Badge Name */}
      <p className="text-xs font-medium text-gray-700 mt-2 text-center">
        {badge.badge_name}
      </p>

      {/* Progress for unearned badges */}
      {!badge.earned && showProgress && badge.target > 0 && (
        <div className="w-full mt-1">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: badge.badge_color,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            {badge.progress}/{badge.target}
          </p>
        </div>
      )}
    </div>
  );
};

export default Badge;
