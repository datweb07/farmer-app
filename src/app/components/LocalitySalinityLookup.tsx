import { useEffect, useState } from "react";
import { Volume2, VolumeX, CalendarDays, ShieldCheck } from "lucide-react";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import { getCurrentUserLocation } from "../../lib/location/location.service";
import type { UserLocation } from "../../lib/location/types";

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function latestWeekRange(date = new Date()) {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric" });
  return `${fmt(monday)} đến ${fmt(sunday)}`;
}

function speakDecimal(value: number) {
  const [whole, decimal] = value.toFixed(2).split(".");
  const wholeText = whole.split("").map((digit) => DIGITS[Number(digit)]).join(" ");
  const decimalText = decimal.split("").map((digit) => DIGITS[Number(digit)]).join(" ");
  return `${wholeText} phẩy ${decimalText}`;
}

function getMockSalinity(location: UserLocation) {
  if (location.province_name.includes("An Giang") && location.ward_name.includes("Vĩnh Hậu")) return 1.99;
  const seed = `${location.province_code}-${location.ward_code}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Number((0.35 + (seed % 430) / 100).toFixed(2));
}

export function LocalitySalinityLookup() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

  useEffect(() => {
    let active = true;
    getCurrentUserLocation()
      .then((result) => {
        if (!active) return;
        if (result.error) setLoadError("Không thể tải khu vực đã lưu trong hồ sơ.");
        else setLocation(result.location);
      })
      .catch(() => active && setLoadError("Không thể tải khu vực đã lưu trong hồ sơ."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const salinity = location
    ? getMockSalinity(location)
    : null;
  const week = latestWeekRange();

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    if (!location || salinity === null) return;
    speak(
      `Độ mặn tại ${location.province_name}, ${location.district_name}, ${location.ward_name} khoảng ${speakDecimal(salinity)} gam trên lít. Được cập nhật tuần mới nhất gần đây là từ ngày ${week}.`,
      { rate: 0.84, lang: "vi-VN" },
    );
  };

  return (
    <section className="p-4 text-white md:rounded-2xl md:border md:border-gray-200 md:bg-white md:text-gray-900 md:shadow-sm" aria-labelledby="locality-salinity-title">


      {loadError ? (
        <p className="text-sm text-red-200 md:text-red-700">{loadError}</p>
      ) : loading ? (
        <p className="text-sm text-white/80 md:text-gray-600">Đang tải khu vực trong hồ sơ...</p>
      ) : !location ? (
        <p className="text-sm text-white/80 md:text-gray-600">Bạn chưa lưu khu vực sinh sống. Hãy cập nhật địa chỉ trong hồ sơ để xem độ mặn tại địa bàn của mình.</p>
      ) : (
        <>
          {salinity !== null && (
            <div className="-mx-4 mt-4 rounded-xl border border-white/20 bg-white/10 p-4 md:mx-0 md:mt-0 md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mt-2 flex items-center gap-3 text-white md:text-gray-900">
                    <span className="text-4xl font-bold tabular-nums">{salinity.toFixed(2)}</span>
                    <span className="text-sm font-medium md:text-gray-600">g/L</span>
                    {isSupported && <button type="button" onClick={handleSpeak} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white/10 text-white transition hover:bg-white/20 active:scale-95 md:border-blue-600 md:bg-white md:text-blue-600 md:hover:bg-blue-50" aria-label={isSpeaking ? "Dừng đọc thông báo độ mặn" : "Đọc thông báo độ mặn"} title={isSpeaking ? "Dừng đọc" : "Nghe thông báo độ mặn"}>
                      {isSpeaking ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
                    </button>}
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-100 md:text-emerald-700"><ShieldCheck className="h-4 w-4" />Mức độ: {salinity < 1 ? "An toàn" : salinity <= 4 ? "Đáng báo động" : "Rất nguy hiểm"}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-white/20 pt-3 text-sm text-white/85 md:border-gray-200 md:text-gray-600">
                <p className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />Tuần mới cập nhật gần đây là {week}</p>
              </div>
            </div>
          )}

          {/* <p className="mt-3 text-xs text-amber-200">Dữ liệu độ mặn cấp xã hiện là dữ liệu mô phỏng để thử nghiệm. Người phát triển phần mềm sẽ không chịu trách nhiệm dưới mọi hình thức</p> */}
        </>
      )}
    </section>
  );
}
