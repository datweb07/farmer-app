// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Globe,
  Moon,
  Bell,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getUserSettings,
  updateUserSettings,
  exportUserData,
  deleteUserAccount,
  downloadUserData,
} from "../../lib/settings/settings.service";
import type {
  UserSettings,
  UpdateSettingsPayload,
} from "../../lib/settings/types";

export function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const result = await getUserSettings();
    if (!result.error && result.settings) {
      setSettings(result.settings);
    } else {
      setError(result.error || "Không thể tải cài đặt");
    }
    setLoading(false);
  };

  const handleUpdateSettings = async (updates: UpdateSettingsPayload) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateUserSettings(updates);

    if (result.success && result.settings) {
      setSettings(result.settings);
      setSuccess("Đã lưu thay đổi");
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Không thể cập nhật");
    }

    setSaving(false);
  };

  const handleExportData = async () => {
    setExporting(true);
    setError(null);

    const result = await exportUserData();

    if (result.data) {
      const filename = `${profile?.username}-data-${new Date().toISOString().split("T")[0]}.json`;
      downloadUserData(result.data, filename);
      setSuccess("Đã tải dữ liệu xuống");
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Không thể xuất dữ liệu");
    }

    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== profile?.username) {
      setError("Tên đăng nhập không khớp");
      return;
    }

    const result = await deleteUserAccount();

    if (result.success) {
      // User will be signed out automatically
      window.location.href = "/";
    } else {
      setError(result.error || "Không thể xóa tài khoản");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Không thể tải cài đặt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            Cài đặt (Đang phát triển)
          </h1>
          <p className="text-gray-600 mt-2">
            Quản lý tài khoản và tùy chỉnh trải nghiệm
          </p>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <Save className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Preferences Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Tùy chỉnh
          </h2>

          <div className="space-y-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngôn ngữ
              </label>
              <select
                value={settings.language}
                onChange={(e) =>
                  handleUpdateSettings({ language: e.target.value as any })
                }
                disabled={saving}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giao diện
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  handleUpdateSettings({ theme: e.target.value as any })
                }
                disabled={saving}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
                <option value="system">Theo hệ thống</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Thông báo
          </h2>

          <div className="space-y-6">
            {/* Email Notifications */}
            {/* <div>
              <h3 className="font-medium text-gray-900 mb-3">Email</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Bật thông báo email
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) =>
                      handleUpdateSettings({
                        email_notifications: e.target.checked,
                      })
                    }
                    disabled={saving}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {settings.email_notifications && (
                  <>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Người theo dõi mới
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email_new_follower}
                        onChange={(e) =>
                          handleUpdateSettings({
                            email_new_follower: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Like bài viết
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email_post_like}
                        onChange={(e) =>
                          handleUpdateSettings({
                            email_post_like: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Bình luận mới
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email_post_comment}
                        onChange={(e) =>
                          handleUpdateSettings({
                            email_post_comment: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Cập nhật dự án
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email_project_update}
                        onChange={(e) =>
                          handleUpdateSettings({
                            email_project_update: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </>
                )}
              </div>
            </div> */}

            {/* Push Notifications */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Thông báo đẩy</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Bật thông báo đẩy
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.push_notifications}
                    onChange={(e) =>
                      handleUpdateSettings({
                        push_notifications: e.target.checked,
                      })
                    }
                    disabled={saving}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {settings.push_notifications && (
                  <>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Người theo dõi mới
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.push_new_follower}
                        onChange={(e) =>
                          handleUpdateSettings({
                            push_new_follower: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Like bài viết
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.push_post_like}
                        onChange={(e) =>
                          handleUpdateSettings({
                            push_post_like: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Bình luận mới
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.push_post_comment}
                        onChange={(e) =>
                          handleUpdateSettings({
                            push_post_comment: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-600">
                        Cập nhật dự án
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.push_project_update}
                        onChange={(e) =>
                          handleUpdateSettings({
                            push_project_update: e.target.checked,
                          })
                        }
                        disabled={saving}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Quyền riêng tư
          </h2>

          <div className="space-y-4">
            {/* Profile Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hiển thị hồ sơ
              </label>
              <select
                value={settings.profile_visibility}
                onChange={(e) =>
                  handleUpdateSettings({
                    profile_visibility: e.target.value as any,
                  })
                }
                disabled={saving}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="public">Công khai</option>
                <option value="followers">Chỉ người theo dõi</option>
                <option value="private">Riêng tư</option>
              </select>
            </div>

            {/* Privacy Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Hiển thị email</span>
                <input
                  type="checkbox"
                  checked={settings.show_email}
                  onChange={(e) =>
                    handleUpdateSettings({ show_email: e.target.checked })
                  }
                  disabled={saving}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Hiển thị số điện thoại
                </span>
                <input
                  type="checkbox"
                  checked={settings.show_phone}
                  onChange={(e) =>
                    handleUpdateSettings({ show_phone: e.target.checked })
                  }
                  disabled={saving}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Cho phép tin nhắn</span>
                <input
                  type="checkbox"
                  checked={settings.allow_messages}
                  onChange={(e) =>
                    handleUpdateSettings({ allow_messages: e.target.checked })
                  }
                  disabled={saving}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Hiển thị hoạt động
                </span>
                <input
                  type="checkbox"
                  checked={settings.show_activity}
                  onChange={(e) =>
                    handleUpdateSettings({ show_activity: e.target.checked })
                  }
                  disabled={saving}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Data & Account Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Dữ liệu & Tài khoản
          </h2>

          <div className="space-y-4">
            {/* Export Data */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Xuất dữ liệu</h3>
                <p className="text-sm text-gray-600">
                  Tải xuống bản sao tất cả dữ liệu của bạn
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                {exporting ? "Đang xuất..." : "Xuất dữ liệu"}
              </button>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-medium text-red-900">Xóa tài khoản</h3>
                <p className="text-sm text-red-600">
                  Xóa vĩnh viễn tài khoản và tất cả dữ liệu
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Xóa tài khoản
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Xác nhận xóa tài khoản
                </h3>
              </div>

              <div className="mb-6 space-y-2">
                <p className="text-gray-600">
                  Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị
                  xóa vĩnh viễn.
                </p>
                <p className="text-sm text-gray-500">
                  Nhập <strong>{profile?.username}</strong> để xác nhận:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={profile?.username}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== profile?.username}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
