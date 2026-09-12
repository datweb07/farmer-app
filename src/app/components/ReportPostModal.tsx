import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { createReport } from "../../lib/admin/admin.service";
import type { CreateReportRequest } from "../../lib/admin/types";
import type { PostWithStats } from "../../lib/community/types";

type ReportReason = CreateReportRequest["reason"];

interface ReportPostModalProps {
  post: PostWithStats;
  isOpen: boolean;
  onClose: () => void;
}

const reasons: Array<{ value: ReportReason; label: string }> = [
  { value: "spam", label: "Spam hoặc quảng cáo không phù hợp" },
  { value: "misleading", label: "Thông tin sai lệch hoặc gây hiểu nhầm" },
  { value: "inappropriate", label: "Nội dung không phù hợp" },
  { value: "harassment", label: "Quấy rối hoặc xúc phạm" },
  { value: "other", label: "Lý do khác" },
];

export function ReportPostModal({ post, isOpen, onClose }: ReportPostModalProps) {
  const [reason, setReason] = useState<ReportReason>("misleading");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const close = () => {
    setReason("misleading");
    setDescription("");
    setError(null);
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createReport({
      content_type: "post",
      content_id: post.id,
      reason,
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      const message = result.error?.includes("đã báo cáo")
        ? result.error
        : "Không thể gửi báo cáo. Vui lòng thử lại.";
      setError(message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-2"><Flag className="h-5 w-5 text-red-600" /><h2 className="text-lg font-bold">Báo cáo bài viết</h2></div>
          <button type="button" onClick={close} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {submitted ? (
          <div className="p-7 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div>
            <h3 className="font-semibold text-gray-900">Đã gửi báo cáo</h3>
            <p className="mt-2 text-sm text-gray-600">Quản trị viên sẽ xem xét bài “{post.title}”.</p>
            <button type="button" onClick={close} className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white">Đóng</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="rounded-lg bg-gray-50 p-3 text-sm"><span className="text-gray-500">Bài viết:</span> <strong>{post.title}</strong></div>
            <label className="block text-sm font-medium text-gray-700">Lý do
              <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5">
                {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">Mô tả thêm
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 p-3" placeholder="Cho quản trị viên biết nội dung nào đang có vấn đề..." />
              <span className="mt-1 block text-right text-xs text-gray-400">{description.length}/1000</span>
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Gửi báo cáo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
