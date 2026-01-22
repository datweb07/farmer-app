import { useState, useRef } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import {
  Skull,
  AlertTriangle,
  ThumbsUp,
  Sprout,
  Wheat,
  Fish,
  Droplets,
  TreeDeciduous
} from "lucide-react";
import MapLibreGL from "maplibre-gl";

// --- INTERFACES ---
interface AffectedArea {
  province: string;
  salinity: number;
  status: "safe" | "warning" | "danger";
  population?: number;
  affectedAreaKm?: number;
  lastUpdate?: string;
}

interface SalinityMapcnProps {
  areas: AffectedArea[];
}

// --- DATA CỐ ĐỊNH ---
const provinceCoords: Record<
  string,
  { lat: number; lng: number; region?: string }
> = {
  "Bến Tre": { lat: 10.15, lng: 106.37, region: "Đồng bằng sông Cửu Long" },
  "Trà Vinh": { lat: 9.97, lng: 106.34, region: "Đồng bằng sông Cửu Long" },
  "Sóc Trăng": { lat: 9.6, lng: 105.97, region: "Đồng bằng sông Cửu Long" },
  "Cà Mau": { lat: 9.17, lng: 105.15, region: "Đồng bằng sông Cửu Long" },
  "Kiên Giang": { lat: 10.02, lng: 105.44, region: "Đồng bằng sông Cửu Long" },
  "An Giang": { lat: 10.53, lng: 105.38, region: "Đồng bằng sông Cửu Long" },
  "Đồng Tháp": { lat: 10.71, lng: 105.64, region: "Đồng bằng sông Cửu Long" },
  "Vĩnh Long": { lat: 10.25, lng: 105.97, region: "Đồng bằng sông Cửu Long" },
  "Cần Thơ": { lat: 10.03, lng: 105.77, region: "Đồng bằng sông Cửu Long" },
  "Hậu Giang": { lat: 9.78, lng: 105.73, region: "Đồng bằng sông Cửu Long" },
  "Bạc Liêu": { lat: 9.29, lng: 106.58, region: "Đồng bằng sông Cửu Long" },
  "Long An": { lat: 10.72, lng: 106.16, region: "Đồng bằng sông Cửu Long" },
  "Tiền Giang": { lat: 10.41, lng: 106.15, region: "Đồng bằng sông Cửu Long" },
};

// --- LOGIC GỢI Ý CÂY TRỒNG (MỚI) ---
const getCropRecommendations = (salinity: number) => {
  if (salinity <= 1) {
    return {
      label: "Vùng Ngọt Hóa",
      crops: ["🌾", "Sầu riêng", "Xoài", "Bưởi", "Rau màu"],
      desc: "Nguồn nước an toàn, thích hợp đa canh.",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      icon: <Sprout className="w-4 h-4 text-emerald-600" />
    };
  } else if (salinity <= 2.5) {
    return {
      label: "Chịu Mặn Nhẹ",
      crops: ["Lúa chịu mặn (ST24, ST25)", "Dừa", "Mía", "Khóm (Dứa)", "Mít Thái"],
      desc: "Cần theo dõi độ mặn triều cường.",
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: <Wheat className="w-4 h-4 text-yellow-600" />
    };
  } else if (salinity <= 4) {
    return {
      label: "Chịu Mặn Trung Bình",
      crops: ["Dừa xiêm", "Cói / Lác", "Mô hình Tôm - Lúa", "Thanh long"],
      desc: "Hạn chế cây ăn trái mẫn cảm.",
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: <TreeDeciduous className="w-4 h-4 text-orange-600" />
    };
  } else {
    return {
      label: "Vùng Mặn Cao",
      crops: ["Nuôi tôm/cua nước lợ", "Rừng ngập mặn (Đước, Tràm)", "Không trồng lúa"],
      desc: "Chuyển đổi sang nuôi trồng thủy sản.",
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: <Fish className="w-4 h-4 text-blue-600" />
    };
  }
};

// --- HELPER FUNCTIONS CŨ ---
const getStatusIcon = (status: string) => {
  switch (status) {
    case "danger": return <Skull className="w-4 h-4 text-white" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-white" />;
    case "safe": return <ThumbsUp className="w-4 h-4 text-white" />;
    default: return <ThumbsUp className="w-4 h-4 text-white" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "danger": return "Nguy hiểm";
    case "warning": return "Cảnh báo";
    case "safe": return "An toàn";
    default: return "An toàn";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "danger": return "bg-red-500";
    case "warning": return "bg-yellow-500";
    case "safe": return "bg-green-500";
    default: return "bg-green-500";
  }
};

// --- MAIN COMPONENT ---
export function SalinityMapcn({ areas }: SalinityMapcnProps) {
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  // Statistics
  const dangerAreas = areas.filter((a) => a.status === "danger");
  const warningAreas = areas.filter((a) => a.status === "warning");
  const safeAreas = areas.filter((a) => a.status === "safe");

  // Handler for province click with animation
  const handleProvinceClick = (provinceName: string) => {
    setSelectedProvince(provinceName);
    const coords = provinceCoords[provinceName];
    if (coords && mapRef.current) {
      mapRef.current.flyTo({
        center: [coords.lng, coords.lat],
        zoom: 10,
        duration: 1500,
        essential: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Map Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Droplets className="w-6 h-6 text-blue-500" />
            Bản đồ & Khuyến nghị Canh tác ĐBSCL
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            Dữ liệu cập nhật theo thời gian thực • {new Date().toLocaleDateString("vi-VN")}
          </p>
        </div>

        <Card className="h-[600px] p-0 overflow-hidden relative border-0 shadow-inner bg-slate-50">
          <Map ref={mapRef} center={[105.8, 10.0]} zoom={7.5}>
            {areas.map((area) => {
              const coords = provinceCoords[area.province];
              if (!coords) return null;

              // Lấy thông tin gợi ý cây trồng cho khu vực này
              const recommendation = getCropRecommendations(area.salinity);

              return (
                <MapMarker
                  key={area.province}
                  longitude={coords.lng}
                  latitude={coords.lat}
                  onClick={() => handleProvinceClick(area.province)}
                >
                  <MarkerContent>
                    <div
                      className={`relative rounded-full p-2 ${getStatusColor(
                        area.status
                      )} shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform group`}
                    >
                      {getStatusIcon(area.status)}
                      {/* Tooltip nhỏ khi hover */}
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                        {area.salinity}‰
                      </span>
                    </div>
                  </MarkerContent>

                  {selectedProvince === area.province && (
                    <MarkerPopup closeButton>
                      <div className="min-w-[280px] max-w-[320px]">
                        {/* Header Popup */}
                        <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-100">
                          <div>
                            <h4 className="font-bold text-lg text-gray-900">
                              {area.province}
                            </h4>
                            <p className="text-xs text-gray-500">{provinceCoords[area.province]?.region}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${area.status === "danger" ? "bg-red-100 text-red-700" :
                            area.status === "warning" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                            }`}>
                            {area.salinity}‰
                          </div>
                        </div>

                        {/* Status Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-sm font-semibold ${area.status === "danger" ? "text-red-600" :
                            area.status === "warning" ? "text-yellow-600" : "text-green-600"
                            }`}>
                            Trạng thái: {getStatusText(area.status)}
                          </span>
                        </div>

                        {/* --- PHẦN MỚI: GỢI Ý CÂY TRỒNG --- */}
                        <div className={`mt-3 rounded-lg p-3 border ${recommendation.bgColor} ${recommendation.borderColor}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {recommendation.icon}
                            <span className={`text-sm font-bold ${recommendation.color}`}>
                              {recommendation.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 italic mb-2">
                            {recommendation.desc}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {recommendation.crops.map((crop, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-white border border-gray-200 shadow-sm text-gray-700 text-[11px] px-2 py-1 rounded-md"
                              >
                                {crop}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* ---------------------------------- */}

                        {/* Footer Info */}
                        <div className="mt-3 flex justify-between items-end text-xs text-gray-400">
                          {area.population && (
                            <span>Dân số: {(area.population / 1000).toFixed(1)}k</span>
                          )}
                          <span>{area.lastUpdate || "Vừa cập nhật"}</span>
                        </div>
                      </div>
                    </MarkerPopup>
                  )}
                </MapMarker>
              );
            })}
            <MapControls
              position="bottom-right"
              showZoom
              showCompass
              showLocate
              showFullscreen
            />
          </Map>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
            <span className="text-sm text-gray-700">Ngọt hóa (&lt; 1‰)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
            <span className="text-sm text-gray-700">Lợ (1-4‰)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
            <span className="text-sm text-gray-700">Mặn (&gt; 4‰)</span>
          </div>
        </div>
      </div>

      {/* Province List with Crops */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Wheat className="w-5 h-5 text-yellow-600" />
          Chi tiết & Giải pháp Canh tác
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-1">
          {areas.map((area) => {
            const rec = getCropRecommendations(area.salinity);
            const isSelected = selectedProvince === area.province;

            return (
              <div
                key={area.province}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${isSelected
                  ? "ring-2 ring-blue-500 shadow-md scale-[1.02]"
                  : "hover:shadow-md hover:border-blue-300"
                  } ${area.status === "danger"
                    ? "bg-white border-red-100"
                    : area.status === "warning"
                      ? "bg-white border-yellow-100"
                      : "bg-white border-green-100"
                  }`}
                onClick={() => handleProvinceClick(area.province)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getStatusColor(area.status)} text-white shadow-sm`}>
                      {getStatusIcon(area.status)}
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-lg leading-tight">{area.province}</h5>
                      <p className="text-xs text-gray-500 font-medium">
                        Độ mặn: <span className="text-gray-900">{area.salinity}‰</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Crop Recommendation in List */}
                <div className={`rounded-md p-2.5 ${rec.bgColor} border ${rec.borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase ${rec.color}`}>
                      {rec.label}
                    </span>
                    {rec.icon}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rec.crops.slice(0, 3).map((c, i) => ( // Show top 3 crops only
                      <span key={i} className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded border border-black/5 text-gray-700">
                        {c}
                      </span>
                    ))}
                    {rec.crops.length > 3 && (
                      <span className="text-[10px] text-gray-500 px-1 py-0.5">+ {rec.crops.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1 uppercase tracking-wide">Tổng quan rủi ro</p>
              <p className="text-4xl font-black text-gray-900">{areas.length} <span className="text-lg font-normal text-gray-500">tỉnh</span></p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <div className="flex-1 bg-white p-3 rounded-lg border border-red-100 text-center">
              <p className="text-2xl font-bold text-red-600">{dangerAreas.length}</p>
              <p className="text-xs text-gray-500 font-medium">Nguy hiểm</p>
            </div>
            <div className="flex-1 bg-white p-3 rounded-lg border border-yellow-100 text-center">
              <p className="text-2xl font-bold text-yellow-600">{warningAreas.length}</p>
              <p className="text-xs text-gray-500 font-medium">Cảnh báo</p>
            </div>
            <div className="flex-1 bg-white p-3 rounded-lg border border-green-100 text-center">
              <p className="text-2xl font-bold text-green-600">{safeAreas.length}</p>
              <p className="text-xs text-gray-500 font-medium">An toàn</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700 mb-1 uppercase tracking-wide">Diện tích</p>
            <p className="text-3xl font-bold text-gray-900">
              {areas.reduce((sum, area) => sum + (area.affectedAreaKm || 0), 0).toLocaleString()}
              <span className="text-sm font-normal text-gray-500 ml-1">km²</span>
            </p>
          </div>
          <div className="w-full h-2 bg-blue-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-700 mb-1 uppercase tracking-wide">Dân số bị ảnh hưởng</p>
            <p className="text-3xl font-bold text-gray-900">
              {(areas.reduce((sum, area) => sum + (area.population || 0), 0) / 1000000).toFixed(2)}
              <span className="text-sm font-normal text-gray-500 ml-1">triệu</span>
            </p>
          </div>
          <div className="flex -space-x-2 overflow-hidden mt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">+</div>
          </div>
        </div>
      </div>
    </div>
  );
}