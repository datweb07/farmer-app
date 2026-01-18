import React, { useEffect, useState } from "react";
import Badge from "./Badge";
import { getUserBadgeProgress } from "../../lib/badges/badge.service";
import type { BadgeProgress } from "../../lib/badges/types";

interface BadgeListProps {
  userId: string;
  title?: string;
  showProgress?: boolean;
  compact?: boolean;
}

const BadgeList: React.FC<BadgeListProps> = ({
  userId,
  title = "Thành tích",
  showProgress = true,
  compact = false,
}) => {
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [userId]);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const data = await getUserBadgeProgress(userId);
      setBadges(data);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const earnedCount = badges.filter((b) => b.earned).length;
  const totalCount = badges.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {earnedCount} / {totalCount} thành tích đã đạt được
        </p>
      </div>

      {/* Badge Grid */}
      <div
        className={`
                grid gap-4
                ${
                  compact
                    ? "grid-cols-3 sm:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                }
            `}
      >
        {badges.map((badge) => (
          <Badge
            key={badge.badge_id}
            badge={badge}
            size={compact ? "small" : "medium"}
            showProgress={showProgress}
          />
        ))}
      </div>
    </div>
  );
};

export default BadgeList;
