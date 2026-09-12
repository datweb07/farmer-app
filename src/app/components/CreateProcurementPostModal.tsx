import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { createPost } from "../../lib/community/posts.service";
import { uploadMultipleImages } from "../../lib/media/media-upload.service";
import { supabase } from "../../lib/supabase/supabase";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; }

export function CreateProcurementPostModal({ isOpen, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ product: "", quantity: "", area: "", minPrice: "", maxPrice: "", startDate: "", endDate: "", receiving: "", standard: "", contact: "", description: "" });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const handleImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    if (imageFiles.length + files.length > MAX_IMAGES) {
      setError(`Mỗi bài viết được tải tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    const invalidFile = files.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE,
    );
    if (invalidFile) {
      setError(
        ALLOWED_IMAGE_TYPES.includes(invalidFile.type)
          ? `${invalidFile.name}: kích thước ảnh tối đa là 5MB.`
          : `${invalidFile.name}: chỉ chấp nhận JPG, PNG, WebP hoặc GIF.`,
      );
      return;
    }

    const previews = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
            reader.readAsDataURL(file);
          }),
      ),
    ).catch((readError: Error) => {
      setError(readError.message);
      return null;
    });

    if (!previews) return;
    setImageFiles((current) => [...current, ...files]);
    setImagePreviews((current) => [...current, ...previews]);
    setError(null);
  };

  const removeImage = (index: number) => {
    setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setImagePreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product || !form.quantity || !form.area || !form.minPrice || !form.startDate || !form.endDate || !form.contact) {
      return setError("Vui lòng nhập đầy đủ các trường bắt buộc.");
    }
    const content = `THU MUA NÔNG SẢN\n\nTên nông sản: ${form.product}\nSản lượng cần mua: ${form.quantity} tấn\nKhu vực thu mua: ${form.area}\nGiá thu mua: ${Number(form.minPrice).toLocaleString("vi-VN")}${form.maxPrice ? ` – ${Number(form.maxPrice).toLocaleString("vi-VN")}` : ""}đ/kg\nThời gian thu mua: ${new Date(form.startDate).toLocaleDateString("vi-VN")} – ${new Date(form.endDate).toLocaleDateString("vi-VN")}\nHình thức nhận hàng: ${form.receiving || "Thỏa thuận trực tiếp"}\nTiêu chuẩn: ${form.standard || "Trao đổi khi liên hệ"}\nLiên hệ: ${form.contact}\n\nMô tả:\n${form.description || "Doanh nghiệp đang có nhu cầu thu mua."}`;
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return setError("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
    }

    setSaving(true); setError(null);
    try {
      const result = await createPost({ title: `Thu mua ${form.product}`, content, category: "product" });
      if (!result.success || !result.post) {
        setError(result.error || "Không thể đăng bài.");
        return;
      }

      if (imageFiles.length) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError("Phiên đăng nhập đã hết hạn. Bài viết đã được lưu nhưng chưa thể tải ảnh.");
          return;
        }

        const uploadResult = await uploadMultipleImages(imageFiles, "post-images", userData.user.id);
        if (uploadResult.error) {
          setError(`${uploadResult.error}. Bài viết đã được lưu nhưng chưa có ảnh.`);
          return;
        }

        const { error: imageError } = await supabase.from("post_images").insert(
          uploadResult.images.map((image, index) => ({
            post_id: result.post!.id,
            image_url: image.url,
            display_order: index,
          })) as never,
        );
        if (imageError) {
          setError("Bài viết đã được lưu nhưng không thể liên kết ảnh. Vui lòng thử chỉnh sửa lại bài viết.");
          return;
        }
      }

      setForm({ product: "", quantity: "", area: "", minPrice: "", maxPrice: "", startDate: "", endDate: "", receiving: "", standard: "", contact: "", description: "" });
      setImageFiles([]);
      setImagePreviews([]);
      onSuccess(); onClose();
    } finally {
      setSaving(false);
    }
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
        <div className="md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-700">Hình ảnh nông sản</p>
            <span className="text-xs text-gray-500">{imageFiles.length}/{MAX_IMAGES} ảnh · tối đa 5MB/ảnh</span>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImages}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={saving || imageFiles.length >= MAX_IMAGES}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
            Chọn một hoặc nhiều ảnh
          </button>
          {imagePreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imagePreviews.map((preview, index) => (
                <div key={`${imageFiles[index]?.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border bg-gray-100">
                  <img src={preview} alt={`Ảnh thu mua ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Xóa ảnh ${index + 1}`}
                    className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5 text-white shadow hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p>}
        <button disabled={saving} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white md:col-span-2 disabled:opacity-60">{saving && <Loader2 className="h-5 w-5 animate-spin" />} {saving ? "Đang lưu bài viết và hình ảnh..." : "Đăng nhu cầu thu mua"}</button>
      </form>
    </div>
  </div>;
}
