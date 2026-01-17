import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Trash2,
  X,
  Loader2,
  CheckCheck,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  subscribeToNotifications,
} from "../../lib/notifications/notifications.service";
import type { Notification } from "../../lib/notifications/types";
import { UserAvatar } from "./UserAvatar";
import { formatDistanceToNow } from "../../lib/utils/date-utils";

export function NotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();

      // Subscribe to real-time notifications
      const unsubscribe = subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      );

      return () => unsubscribe();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    const result = await getNotifications({ limit: 20 });
    if (!result.error) {
      setNotifications(result.notifications);
      setHasMore(result.notifications.length === 20);
    }
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    const result = await getUnreadCount();
    if (!result.error) {
      setUnreadCount(result.count);
    }
  };

  const handleMarkAsRead = async (
    notificationId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    await markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const notification = notifications.find((n) => n.id === notificationId);
    await deleteNotification(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (notification && !notification.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleDeleteAllRead = async () => {
    if (!confirm("Xóa tất cả thông báo đã đọc?")) return;
    await deleteAllRead();
    setNotifications((prev) => prev.filter((n) => !n.is_read));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate to link if available
    if (notification.link) {
      // This will be handled by the app routing system
      // For now, just close the dropdown
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClasses = "w-4 h-4";
    switch (type) {
      case "POST_LIKE":
        return <span className={iconClasses}>❤️</span>;
      case "POST_COMMENT":
      case "COMMENT_REPLY":
        return <span className={iconClasses}>💬</span>;
      case "POST_SHARE":
        return <span className={iconClasses}>🔄</span>;
      case "PROJECT_INVESTMENT":
        return <span className={iconClasses}>💰</span>;
      case "PROJECT_RATING":
        return <span className={iconClasses}>⭐</span>;
      case "PRODUCT_VIEW_MILESTONE":
        return <span className={iconClasses}>👀</span>;
      case "FOLLOW":
        return <span className={iconClasses}>👤</span>;
      case "MENTION":
        return <span className={iconClasses}>@</span>;
      default:
        return <Bell className={iconClasses} />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed md:absolute right-2 md:right-0 left-2 md:left-auto mt-2 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.some((n) => n.is_read) && (
                <button
                  onClick={handleDeleteAllRead}
                  className="text-xs text-gray-600 hover:text-gray-700 flex items-center gap-1"
                  title="Xóa đã đọc"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative ${
                      !notification.is_read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Avatar or Icon */}
                      <div className="flex-shrink-0">
                        {notification.actor_avatar ||
                        notification.actor_username ? (
                          <UserAvatar
                            username={notification.actor_username || "U"}
                            avatarUrl={notification.actor_avatar}
                            size="sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              {notification.actor_username && (
                                <span className="font-semibold">
                                  {notification.actor_username}{" "}
                                </span>
                              )}
                              <span className="text-gray-700">
                                {notification.message}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(notification.created_at)}
                            </p>
                          </div>

                          {/* Unread indicator */}
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>

                      {/* Actions - Always visible */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {!notification.is_read ? (
                          <>
                            <button
                              onClick={(e) =>
                                handleMarkAsRead(notification.id, e)
                              }
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                              title="Đánh dấu đã đọc"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(notification.id, e)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && hasMore && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={loadNotifications}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Xem tất cả
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
