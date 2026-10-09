import { Clock, MapPin } from "lucide-react";
import { formatSavedProfileLocation, useSavedProfileLocation } from "../../hooks/useSavedProfileLocation";

interface ProfileLocationTimeBarProps {
  time: Date;
  variant?: "light" | "dark";
  dateStyle?: "short" | "long";
  className?: string;
}

export function ProfileLocationTimeBar({ time, variant = "light", dateStyle = "long", className = "" }: ProfileLocationTimeBarProps) {
  const { location, loading, error } = useSavedProfileLocation();
  const foreground = variant === "light" ? "text-white" : "text-gray-600";
  const locationLabel = error
    ? "Không tải được vị trí hồ sơ"
    : loading
      ? "Đang tải vị trí..."
      : formatSavedProfileLocation(location);

  return <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs font-medium sm:text-sm ${foreground} ${className}`}>
    <div className="flex min-w-0 items-center gap-1.5" title={locationLabel}>
      <MapPin className="h-4 w-4 shrink-0" />
      <span className="line-clamp-2 leading-4">{locationLabel}</span>
    </div>
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <Clock className="h-4 w-4 shrink-0" />
      <span>{time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })} <span className="px-0.5">|</span> {time.toLocaleDateString("vi-VN", { day: "numeric", month: dateStyle === "short" ? "short" : "long", year: "numeric" })}</span>
    </div>
  </div>;
}
