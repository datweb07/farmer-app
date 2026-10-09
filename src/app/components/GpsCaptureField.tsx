import { useState } from "react";
import { ExternalLink, LocateFixed, Map, LoaderCircle } from "lucide-react";
import { CurrentLocationMap } from "./CurrentLocationMap";

interface GpsValue {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface GpsCaptureFieldProps {
  initial?: Partial<GpsValue> | null;
  onChange: (value: GpsValue | null) => void;
  required?: boolean;
}

export function GpsCaptureField({ initial, onChange, required = false }: GpsCaptureFieldProps) {
  const [value, setValue] = useState<GpsValue | null>(initial?.latitude != null && initial.longitude != null
    ? { latitude: Number(initial.latitude), longitude: Number(initial.longitude), accuracy: initial.accuracy == null ? null : Number(initial.accuracy) }
    : null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const capture = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Thiết bị hoặc trình duyệt không hỗ trợ GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)
        || coords.latitude < -90 || coords.latitude > 90
        || coords.longitude < -180 || coords.longitude > 180) {
        setError("Thiết bị trả về tọa độ GPS không hợp lệ.");
        setLocating(false);
        return;
      }
      const next = { latitude: coords.latitude, longitude: coords.longitude, accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null };
      setValue(next);
      onChange(next);
      setLocating(false);
    }, (positionError) => {
      setError(positionError.code === positionError.PERMISSION_DENIED
        ? "Bạn đã từ chối quyền vị trí. Hãy bật quyền vị trí trong trình duyệt rồi thử lại."
        : positionError.code === positionError.TIMEOUT
          ? "Quá thời gian lấy GPS. Hãy ra nơi thoáng hơn rồi thử lại."
          : "Không thể xác định vị trí hiện tại. Vui lòng thử lại.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const googleMapsUrl = value ? `https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}` : undefined;

  return <div className="space-y-3">
    <button type="button" onClick={capture} disabled={locating} className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-blue-700 hover:border-blue-500 disabled:opacity-60">
      {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
      {locating ? "Đang lấy GPS..." : value ? "Lấy lại GPS hiện tại" : required ? "Ghi nhận GPS bắt buộc" : "Ghi nhận GPS khu vực"}
    </button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {value && <>
      <CurrentLocationMap latitude={value.latitude} longitude={value.longitude} accuracy={value.accuracy ?? undefined} label="Vị trí GPS mùa vụ" />
      <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-blue-700 hover:border-blue-500">
        <Map className="h-4 w-4" />Xem trong Google Map<ExternalLink className="h-3.5 w-3.5" />
      </a>
    </>}
  </div>;
}
