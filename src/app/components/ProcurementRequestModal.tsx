import { useState } from "react";
import { CalendarDays, LocateFixed, Loader2, Phone, Send, X } from "lucide-react";
import type { PostWithStats } from "../../lib/community/types";
import { createProcurementRequest } from "../../lib/procurement/procurement.service";
import { CurrentLocationMap } from "./CurrentLocationMap";

interface ProcurementRequestModalProps {
  post: PostWithStats;
  defaultName: string;
  defaultPhone?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProcurementRequestModal({
  post,
  defaultName,
  defaultPhone,
  isOpen,
  onClose,
}: ProcurementRequestModalProps) {
  const [farmerName, setFarmerName] = useState(defaultName);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone || "");
  const [desiredDate, setDesiredDate] = useState("");
  const [productName, setProductName] = useState("");
  const [note, setNote] = useState("");
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setCoordinates(null);
      setError("Thiết bị không hỗ trợ định vị GPS.");
      return;
    }
    setError(null);
    setCoordinates(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const isValid =
          Number.isFinite(coords.latitude) &&
          Number.isFinite(coords.longitude) &&
          coords.latitude >= -90 &&
          coords.latitude <= 90 &&
          coords.longitude >= -180 &&
          coords.longitude <= 180;

        if (!isValid) {
          setError("Thiết bị trả về tọa độ không hợp lệ. Vui lòng thử lại.");
          setCoordinates(null);
          setLocating(false);
          return;
        }

        setError(null);
        setCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
        setLocating(false);
      },
      (positionError) => {
        const message =
          positionError.code === positionError.PERMISSION_DENIED
            ? "Quyền truy cập vị trí đã bị từ chối. Hãy bật quyền vị trí trong trình duyệt rồi thử lại."
            : positionError.code === positionError.TIMEOUT
              ? "Quá thời gian lấy vị trí. Hãy ra nơi thoáng hơn rồi thử lại."
              : "Không thể xác định vị trí hiện tại. Bạn vẫn có thể gửi đăng ký không kèm GPS.";
        setCoordinates(null);
        setError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!farmerName.trim() || !/^\+?[0-9]{10,15}$/.test(phoneNumber) || !desiredDate || !productName.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên, số điện thoại hợp lệ, ngày hẹn và nông sản.");
      return;
    }
    setSaving(true);
    const result = await createProcurementRequest({
      post_id: post.id,
      business_id: post.user_id,
      farmer_name: farmerName.trim(),
      phone_number: phoneNumber,
      desired_date: desiredDate,
      product_name: productName.trim(),
      note,
      farm_latitude: coordinates?.latitude,
      farm_longitude: coordinates?.longitude,
    });
    setSaving(false);
    if (result.error) return setError(result.error);
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Đăng ký thu mua</h2>
            <p className="text-sm text-gray-500">Gửi thông tin trực tiếp tới {post.author_username}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
            <h3 className="font-semibold text-gray-900">Đã gửi đăng ký thành công</h3>
            <p className="mt-2 text-sm text-gray-600">Doanh nghiệp đã nhận thông báo kèm thông tin của bạn.</p>
            <button onClick={onClose} className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white">Đóng</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <label className="block text-sm font-medium text-gray-700">Họ và tên
              <input value={farmerName} onChange={(e) => setFarmerName(e.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Số điện thoại
              <div className="relative mt-1.5"><Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full rounded-lg border py-2.5 pl-9 pr-3" /></div>
            </label>
            <label className="block text-sm font-medium text-gray-700">Tên nông sản
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ví dụ: Sầu riêng Ri6" className="mt-1.5 w-full rounded-lg border px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Ngày mong muốn đến thu mua
              <div className="relative mt-1.5"><CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="date" min={new Date().toISOString().slice(0, 10)} value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} className="w-full rounded-lg border py-2.5 pl-9 pr-3" /></div>
            </label>
            <label className="block text-sm font-medium text-gray-700">Ghi chú
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Sản lượng dự kiến, địa chỉ vườn, thời gian thuận tiện..." className="mt-1.5 w-full rounded-lg border px-3 py-2.5" />
            </label>
            <button type="button" onClick={captureLocation} disabled={locating} className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {coordinates ? "Đã ghi nhận GPS trang trại" : "Ghi nhận GPS trang trại (không bắt buộc)"}
            </button>
            {coordinates && !error && (
              <CurrentLocationMap
                latitude={coordinates.latitude}
                longitude={coordinates.longitude}
                accuracy={coordinates.accuracy}
              />
            )}
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Gửi đăng ký
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
