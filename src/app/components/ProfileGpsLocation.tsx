import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, LocateFixed, Loader2, Map } from "lucide-react";
import {
  getCurrentUserGpsLocation,
  saveCurrentUserGpsLocation,
} from "../../lib/location/gps-location.service";
import type { GpsCoordinates, UserGpsLocation } from "../../lib/location/types";
import { CurrentLocationMap } from "./CurrentLocationMap";

interface ProfileGpsLocationProps {
  onSaved?: (updatedAt: string) => void;
}

function toCoordinates(location: UserGpsLocation): GpsCoordinates {
  return {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    accuracy: location.accuracy_m == null ? null : Number(location.accuracy_m),
  };
}

export function ProfileGpsLocation({ onSaved }: ProfileGpsLocationProps) {
  const [coordinates, setCoordinates] = useState<GpsCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentUserGpsLocation()
      .then((result) => {
        if (!active) return;
        if (result.error) {
          setError("Không thể tải vị trí GPS đã lưu.");
        } else if (result.location) {
          setCoordinates(toCoordinates(result.location));
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const captureLocation = () => {
    setSaved(false);
    setError(null);

    if (!navigator.geolocation) {
      setError("Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const valid =
          Number.isFinite(coords.latitude) &&
          Number.isFinite(coords.longitude) &&
          coords.latitude >= -90 &&
          coords.latitude <= 90 &&
          coords.longitude >= -180 &&
          coords.longitude <= 180;

        if (!valid) {
          setError("Thiết bị trả về tọa độ không hợp lệ. Vui lòng thử lại.");
          setLocating(false);
          return;
        }

        const nextCoordinates: GpsCoordinates = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
        };

        // Open the map immediately after the browser returns a valid position.
        setCoordinates(nextCoordinates);
        setLocating(false);
        setSaving(true);

        const result = await saveCurrentUserGpsLocation(nextCoordinates);
        setSaving(false);
        if (result.error || !result.location) {
          setError(result.error || "Không thể lưu vị trí GPS vào cơ sở dữ liệu.");
          return;
        }

        setCoordinates(toCoordinates(result.location));
        setSaved(true);
        onSaved?.(result.location.updated_at);
      },
      (positionError) => {
        const message =
          positionError.code === positionError.PERMISSION_DENIED
            ? "Bạn đã từ chối quyền vị trí. Hãy bật quyền vị trí cho trang rồi thử lại."
            : positionError.code === positionError.TIMEOUT
              ? "Quá thời gian lấy vị trí. Hãy kiểm tra GPS hoặc thử ở nơi thoáng hơn."
              : "Không thể xác định vị trí hiện tại. Vui lòng thử lại.";
        setError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const googleMapsUrl = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    : "";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={captureLocation}
        disabled={loading || locating || saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading || locating || saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LocateFixed className="h-4 w-4" />
        )}
        {loading
          ? "Đang tải vị trí đã lưu..."
          : locating
            ? "Đang lấy GPS hiện tại..."
            : saving
              ? "Đang lưu vị trí..."
              : "Lấy GPS hiện tại"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {saved && (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Đã lưu vị trí GPS vào hồ sơ.
        </p>
      )}

      {coordinates && (
        <div className="space-y-3">
          <CurrentLocationMap
            latitude={coordinates.latitude}
            longitude={coordinates.longitude}
            accuracy={coordinates.accuracy ?? undefined}
            label={saved ? "Vị trí GPS đã lưu" : "Vị trí GPS hồ sơ"}
          />
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            <Map className="h-4 w-4" />
            Chuyển sang Google Map
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
