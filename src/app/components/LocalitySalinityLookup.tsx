import { useEffect, useMemo, useState } from "react";
import { Volume2, VolumeX, MapPin, Waves, CalendarDays, ShieldCheck } from "lucide-react";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";

interface Commune {
  code: string;
  name: string;
  type: string;
}

interface Province {
  code: string;
  name: string;
  type: string;
  communes: Commune[];
}

interface AdminData {
  effectiveDate: string;
  sourceUrl: string;
  provinces: Province[];
}

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

function getMockSalinity(province: Province, commune: Commune) {
  if (province.name === "An Giang" && commune.name === "Xã Vĩnh Hậu") return 1.99;
  const seed = `${province.code}-${commune.code}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Number((0.35 + (seed % 430) / 100).toFixed(2));
}

export function LocalitySalinityLookup() {
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [provinceCode, setProvinceCode] = useState("");
  const [communeCode, setCommuneCode] = useState("");
  const [showCommunes, setShowCommunes] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

  useEffect(() => {
    let active = true;
    fetch("/data/vietnam-admin-2025.json")
      .then((response) => {
        if (!response.ok) throw new Error("Không tải được danh mục hành chính.");
        return response.json() as Promise<AdminData>;
      })
      .then((data) => {
        if (!active) return;
        setAdminData(data);
        const anGiang = data.provinces.find((province) => province.name === "An Giang");
        setProvinceCode(anGiang?.name ?? data.provinces[0]?.name ?? "");
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Không tải được danh mục hành chính.");
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedProvince = adminData?.provinces.find((province) => province.name === provinceCode) ?? null;
  const communes = useMemo(() => selectedProvince?.communes ?? [], [selectedProvince]);
  const selectedCommune = communes.find((commune) => commune.code === communeCode) ?? null;

  useEffect(() => {
    if (!selectedProvince) return;
    const firstCommune = selectedProvince.communes[0];
    setCommuneCode((current) => selectedProvince.communes.some((commune) => commune.code === current) ? current : firstCommune?.code ?? "");
  }, [selectedProvince]);

  const salinity = selectedProvince && selectedCommune
    ? getMockSalinity(selectedProvince, selectedCommune)
    : null;
  const week = latestWeekRange();

  const handleProvinceChange = (name: string) => {
    setProvinceCode(name);
    setCommuneCode("");
    setShowCommunes(true);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    if (!selectedProvince || !selectedCommune || salinity === null) return;
    speak(
      `Độ mặn tại tỉnh ${selectedProvince.name}, ${selectedCommune.name} khoảng ${speakDecimal(salinity)} gam trên lít. Được cập nhật tuần mới nhất gần đây là từ ngày ${week}.`,
      { rate: 0.84, lang: "vi-VN" },
    );
  };

  return (
    <section className="rounded-2xl border border-white/25 bg-slate-950/35 p-4 text-white shadow-lg backdrop-blur-md md:p-6" aria-labelledby="locality-salinity-title">


      {loadError ? (
        <p className="text-sm text-red-200">{loadError}</p>
      ) : !adminData ? (
        <p className="text-sm text-white/80">Đang tải danh mục 34 tỉnh/thành và đơn vị cấp xã...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-white" onMouseEnter={() => setShowCommunes(true)} onFocus={() => setShowCommunes(true)}>
              Tỉnh / Thành phố
              <select value={provinceCode} onChange={(event) => handleProvinceChange(event.target.value)} className="mt-2 w-full rounded-lg border border-white/30 bg-white px-3 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {adminData.provinces.map((province) => <option key={province.name} value={province.name}>{province.type} {province.name}</option>)}
              </select>
            </label>
            {showCommunes && <label className="block text-sm font-medium text-white">
              Phường / Xã
              <select value={communeCode} onChange={(event) => setCommuneCode(event.target.value)} className="mt-2 w-full rounded-lg border border-white/30 bg-white px-3 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {communes.map((commune) => <option key={commune.code} value={commune.code}>{commune.name}</option>)}
              </select>
            </label>}
          </div>

          <p className="mt-3 text-xs leading-5 text-white/70">
            Danh mục hiện hành từ 01/07/2025 gồm 2 cấp tỉnh/thành phố và xã/phường; cấp huyện đã kết thúc hoạt động hành chính. Nguồn: <a className="text-blue-200 underline" href={adminData.sourceUrl} target="_blank" rel="noreferrer">DVHCVN 20250701</a> · MIT.
          </p>

          {selectedProvince && selectedCommune && salinity !== null && (
            <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white"><Waves className="h-4 w-4" />
                    {selectedProvince.type} {selectedProvince.name} · {selectedCommune.name}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-white">
                    <span className="text-4xl font-bold tabular-nums">{salinity.toFixed(2)}</span>
                    <span className="text-sm font-medium">g/L</span>
                    {isSupported && <button type="button" onClick={handleSpeak} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white/10 text-white transition hover:bg-white/20 active:scale-95" aria-label={isSpeaking ? "Dừng đọc thông báo độ mặn" : "Đọc thông báo độ mặn"} title={isSpeaking ? "Dừng đọc" : "Nghe thông báo độ mặn"}>
                      {isSpeaking ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
                    </button>}
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-100"><ShieldCheck className="h-4 w-4" />Mức độ: {salinity < 1 ? "An toàn" : salinity <= 4 ? "Đáng báo động" : "Rất nguy hiểm"}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 border-t border-white/20 pt-3 text-sm text-white/85 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />Vị trí: {selectedCommune.name}, {selectedProvince.name}</p>
                <p className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />Tuần mới cập nhật gần đây là {week}</p>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-amber-200">Dữ liệu độ mặn cấp xã hiện là dữ liệu mô phỏng để thử nghiệm. Người phát triển phần mềm sẽ không chịu trách nhiệm dưới mọi hình thức</p>
        </>
      )}
    </section>
  );
}
