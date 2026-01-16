import { Clock } from "lucide-react";
import type { ActivityItem } from "../../lib/dashboard/types";
import { formatDistanceToNow } from "../../lib/utils/date-utils";

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Hoạt động gần đây
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Hoạt động gần đây
        </h3>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chưa có hoạt động nào</p>
          <p className="text-gray-400 text-xs mt-1">
            Bắt đầu tương tác để thấy hoạt động của bạn
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Hoạt động gần đây
      </h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getColorClass(
                activity.color
              )}`}
            >
              <span className="text-lg">{activity.icon}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.title}
              </p>
              <p className="text-sm text-gray-600 truncate">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(activity.timestamp)}
              </p>
            </div>

            {/* Arrow on hover */}
            {activity.link && (
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-gray-400">→</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
    orange: "bg-orange-100 text-orange-600",
  };
  return colorMap[color] || "bg-gray-100 text-gray-600";
}
