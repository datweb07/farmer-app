import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Download, Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  downloadUserData,
  exportUserData,
  getUserSettings,
  updateUserSettings,
} from "../../lib/settings/settings.service";
import type { UpdateSettingsPayload, UserSettings } from "../../lib/settings/types";

interface ToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  indent?: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, checked, disabled, indent, onChange }: ToggleProps) {
  return (
    <label className={`flex items-center justify-between gap-4 ${indent ? "pl-5" : ""}`}>
      <span className={indent ? "text-sm text-gray-600" : "text-sm font-medium text-gray-700"}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
    </label>
  );
}

export function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getUserSettings().then((result) => {
      if (!active) return;
      if (result.settings) setSettings(result.settings);
      else setError(result.error || "Không thể tải cài đặt");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = async (updates: UpdateSettingsPayload) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, ...updates });
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await updateUserSettings(updates);
    if (result.success && result.settings) {
      setSettings(result.settings);
      setSuccess("Đã lưu thay đổi");
      window.setTimeout(() => setSuccess(null), 2500);
    } else {
      setSettings(previous);
      setError(result.error || "Không thể cập nhật cài đặt");
    }
    setSaving(false);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    const result = await exportUserData();
    if (result.data) {
      const date = new Date().toISOString().slice(0, 10);
      downloadUserData(result.data, `${profile?.username || "tai-khoan"}-data-${date}.json`);
      setSuccess("Đã tạo và tải xuống bản sao dữ liệu");
    } else {
      setError(result.error || "Không thể xuất dữ liệu");
    }
    setExporting(false);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!settings) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-red-600">Không thể tải cài đặt.</div>;
  }

  const notificationToggles: Array<[keyof UpdateSettingsPayload, string]> = [
    ["push_new_follower", "Người theo dõi mới"],
    ["push_post_like", "Like bài viết"],
    ["push_post_comment", "Bình luận và trả lời mới"],
    ["push_project_update", "Cập nhật dự án"],
    ["push_procurement", "Đăng ký, hoàn tất và đánh giá thu mua"],
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900"><SettingsIcon className="h-8 w-8 text-blue-600" />Cài đặt</h1>
          <p className="mt-2 text-gray-600">Quản lý thông báo và dữ liệu tài khoản</p>
        </div>

        {success && <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800"><Save className="h-5 w-5" />{success}</div>}
        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"><AlertTriangle className="h-5 w-5" />{error}</div>}

        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-gray-900"><Bell className="h-5 w-5 text-blue-600" />Thông báo trong ứng dụng</h2>
          <p className="mb-5 text-sm text-gray-500">Các lựa chọn này được áp dụng cho danh sách và số đếm trên biểu tượng chuông.</p>
          <div className="space-y-4">
            <Toggle label="Bật thông báo" checked={settings.push_notifications} disabled={saving} onChange={(value) => save({ push_notifications: value })} />
            {settings.push_notifications && notificationToggles.map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                checked={Boolean(settings[key as keyof UserSettings])}
                disabled={saving}
                indent
                onChange={(value) => save({ [key]: value })}
              />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Dữ liệu tài khoản</h2>
          <div className="flex flex-col gap-4 rounded-lg bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-medium text-gray-900">Xuất dữ liệu</h3><p className="text-sm text-gray-600">Tải bản sao hồ sơ, vị trí, bài viết, tương tác, giao dịch và đánh giá của bạn.</p></div>
            <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Đang xuất..." : "Xuất dữ liệu"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
