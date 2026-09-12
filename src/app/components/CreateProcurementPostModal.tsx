import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createPost } from "../../lib/community/posts.service";

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; }

export function CreateProcurementPostModal({ isOpen, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ product: "", quantity: "", area: "", minPrice: "", maxPrice: "", startDate: "", endDate: "", receiving: "", standard: "", contact: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product || !form.quantity || !form.area || !form.minPrice || !form.startDate || !form.endDate || !form.contact) {
      return setError("Vui lòng nhập đầy đủ các trường bắt buộc.");
    }
    const content = `THU MUA NÔNG SẢN\n\nTên nông sản: ${form.product}\nSản lượng cần mua: ${form.quantity} tấn\nKhu vực thu mua: ${form.area}\nGiá thu mua: ${Number(form.minPrice).toLocaleString("vi-VN")}${form.maxPrice ? ` – ${Number(form.maxPrice).toLocaleString("vi-VN")}` : ""}đ/kg\nThời gian thu mua: ${new Date(form.startDate).toLocaleDateString("vi-VN")} – ${new Date(form.endDate).toLocaleDateString("vi-VN")}\nHình thức nhận hàng: ${form.receiving || "Thỏa thuận trực tiếp"}\nTiêu chuẩn: ${form.standard || "Trao đổi khi liên hệ"}\nLiên hệ: ${form.contact}\n\nMô tả:\n${form.description || "Doanh nghiệp đang có nhu cầu thu mua."}`;
    setSaving(true); setError(null);
    const result = await createPost({ title: `Thu mua ${form.product}`, content, category: "product" });
    setSaving(false);
    if (!result.success) return setError(result.error || "Không thể đăng bài.");
    setForm({ product: "", quantity: "", area: "", minPrice: "", maxPrice: "", startDate: "", endDate: "", receiving: "", standard: "", contact: "", description: "" });
    onSuccess(); onClose();
  };

  const fields: Array<[keyof typeof form, string, string, boolean]> = [
    ["product", "Tên nông sản", "Lúa ST25, sầu riêng Ri6...", true],
    ["quantity", "Sản lượng cần mua (tấn)", "50", true],
    ["area", "Khu vực thu mua", "Bến Tre", true],
    ["minPrice", "Giá tối thiểu (đ/kg)", "8000", true],
    ["maxPrice", "Giá tối đa (đ/kg)", "8500", false],
    ["receiving", "Hình thức nhận hàng", "Thu mua tại ruộng / tập kết tại kho", false],
    ["standard", "Tiêu chuẩn", "Độ ẩm ≤ 14%, không lẫn tạp chất", false],
    ["contact", "Số điện thoại / Zalo", "090...", true],
  ];
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5"><div><h2 className="text-xl font-bold">THU MUA SẢN LƯỢNG NÔNG PHẨM</h2><p className="text-sm text-gray-500">Tạo thông báo thu mua rõ ràng, uy tín và minh bạch</p></div><button onClick={onClose}><X /></button></div>
      <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2">
        {fields.map(([key, label, placeholder, required]) => <label key={key} className="text-sm font-medium text-gray-700">{label}{required && " *"}<input type={["quantity", "minPrice", "maxPrice"].includes(key) ? "number" : "text"} value={form[key]} onChange={update(key)} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label>)}
        <label className="text-sm font-medium text-gray-700">Bắt đầu *<input type="date" value={form.startDate} onChange={update("startDate")} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label>
        <label className="text-sm font-medium text-gray-700">Kết thúc *<input type="date" value={form.endDate} onChange={update("endDate")} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label>
        <label className="text-sm font-medium text-gray-700 md:col-span-2">Mô tả<textarea rows={4} value={form.description} onChange={update("description")} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p>}
        <button disabled={saving} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white md:col-span-2">{saving && <Loader2 className="h-5 w-5 animate-spin" />} Đăng nhu cầu thu mua</button>
      </form>
    </div>
  </div>;
}

