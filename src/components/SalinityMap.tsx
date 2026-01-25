// ============================================
// Salinity Map Component
// ============================================
// Interactive map displaying salinity forecast stations with color-coded markers
// Using MapLibre for better performance and animation support
// ============================================

import React, { useMemo, useState, useRef } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import MapLibreGL from "maplibre-gl";
import type { ProphetPredict } from "@/types/prophet";
import { Sprout, Wheat, Fish, TreeDeciduous } from "lucide-react";

// --- LOGIC GỢI Ý CÂY TRỒNG ---
const getCropRecommendations = (salinity: number) => {
  if (salinity <= 1) {
    return {
      label: "Vùng Ngọt Hóa",
      crops: ["Lúa", "Sầu riêng", "Cam", "Rau"],
      desc: "Nguồn nước an toàn, thích hợp đa canh.",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      icon: <Sprout className="w-4 h-4 text-emerald-600" />,
    };
  } else if (salinity <= 2.5) {
    return {
      label: "Chịu Mặn Nhẹ",
      crops: ["Lúa (ST24, ST25)", "Dừa", "Mía", "Dứa"],
      desc: "Cần theo dõi độ mặn triều cường.",
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: <Wheat className="w-4 h-4 text-yellow-600" />,
    };
  } else if (salinity <= 4) {
    return {
      label: "Chịu Mặn Trung Bình",
      crops: ["Dừa xiêm", "Cói / Lác", "Mô hình Tôm - Lúa", "Thanh long"],
      desc: "Hạn chế cây ăn trái mẫn cảm.",
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: <TreeDeciduous className="w-4 h-4 text-orange-600" />,
    };
  } else {
    return {
      label: "Vùng Mặn Cao",
      crops: ["Tôm/Cua", "Không trồng lúa"],
      desc: "Chuyển đổi sang nuôi trồng thủy sản.",
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: <Fish className="w-4 h-4 text-blue-600" />,
    };
  }
};

interface SalinityMapProps {
  data: ProphetPredict[];
}

// Helper function to get salinity category
const getSalinityCategory = (salinity: number): string => {
  if (salinity < 1) return "Thấp";
  if (salinity < 4) return "Trung bình";
  return "Cao";
};

export const SalinityMap: React.FC<SalinityMapProps> = ({ data }) => {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  // Group data by station to show latest forecast
  const stationData = useMemo(() => {
    const stationMap: Record<string, ProphetPredict> = {};

    data.forEach((item) => {
      const key = `${item.tinh}-${item.ten_tram}`;
      const existing = stationMap[key];

      // Keep the most recent year for each station
      if (!existing || item.nam > existing.nam) {
        stationMap[key] = item;
      }
    });

    return Object.values(stationMap);
  }, [data]);

  // Group stations by province
  const provinceData = useMemo(() => {
    const provinceMap: Record<string, ProphetPredict[]> = {};

    stationData.forEach((station) => {
      if (!provinceMap[station.tinh]) {
        provinceMap[station.tinh] = [];
      }
      provinceMap[station.tinh].push(station);
    });

    return Object.entries(provinceMap).map(([tinh, stations]) => ({
      tinh,
      stations,
      avgSalinity:
        stations.reduce(
          (sum: number, s: ProphetPredict) => sum + s.du_bao_man,
          0,
        ) / stations.length,
      stationCount: stations.length,
    }));
  }, [stationData]);

  // Calculate map center
  const center = useMemo(() => {
    if (stationData.length === 0) return { lat: 10.0, lng: 105.8 }; // Default to Mekong Delta

    const avgLat =
      stationData.reduce((sum: number, s: ProphetPredict) => sum + s.lat, 0) /
      stationData.length;
    const avgLon =
      stationData.reduce((sum: number, s: ProphetPredict) => sum + s.lon, 0) /
      stationData.length;

    return { lat: avgLat, lng: avgLon };
  }, [stationData]);

  // Handler for province click with animation
  const handleProvinceClick = (provinceName: string) => {
    setSelectedProvince(provinceName);
    const provinceStations = stationData.filter(
      (s: ProphetPredict) => s.tinh === provinceName,
    );

    if (provinceStations.length > 0 && mapRef.current) {
      const avgLat =
        provinceStations.reduce(
          (sum: number, s: ProphetPredict) => sum + s.lat,
          0,
        ) / provinceStations.length;
      const avgLon =
        provinceStations.reduce(
          (sum: number, s: ProphetPredict) => sum + s.lon,
          0,
        ) / provinceStations.length;

      // Animate map to province location
      mapRef.current.flyTo({
        center: [avgLon, avgLat],
        zoom: 10,
        duration: 1500, // 1.5 seconds animation
        essential: true,
      });
    }
  };

  // Handler for station marker click
  const handleStationClick = (station: ProphetPredict) => {
    setSelectedStation(`${station.tinh}-${station.ten_tram}`);
  };

  if (stationData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Bản đồ trạm đo
        </h3>
        <div className="flex items-center justify-center h-96 text-gray-500 bg-gray-50 rounded">
          Không có dữ liệu để hiển thị trên bản đồ
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Province List with Animation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Danh sách tỉnh/thành phố ({provinceData.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2">
          {provinceData.map(
            (province: {
              tinh: string;
              stations: ProphetPredict[];
              avgSalinity: number;
              stationCount: number;
            }) => {
              const salinityLevel =
                province.avgSalinity < 1
                  ? "safe"
                  : province.avgSalinity < 4
                    ? "warning"
                    : "danger";

              return (
                <div
                  key={province.tinh}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
                    salinityLevel === "danger"
                      ? "bg-linear-to-r from-red-50 to-red-100 border-red-300"
                      : salinityLevel === "warning"
                        ? "bg-linear-to-r from-yellow-50 to-yellow-100 border-yellow-300"
                        : "bg-linear-to-r from-green-50 to-green-100 border-green-300"
                  } ${selectedProvince === province.tinh ? "ring-2 ring-blue-500 scale-[1.02]" : ""}`}
                  onClick={() => handleProvinceClick(province.tinh)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          salinityLevel === "danger"
                            ? "bg-red-500"
                            : salinityLevel === "warning"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      >
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-900">
                          {province.tinh}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {province.stationCount} trạm đo
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {province.avgSalinity.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">g/l TB</p>
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
      {/* Map Container */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Bản đồ trạm đo - Độ mặn dự báo
          </h3>
          <p className="text-gray-600 text-sm">
            Dữ liệu cập nhật từ mô hình Prophet •{" "}
            {`${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
          </p>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-gray-700">{"< 1 g/l (Thấp)"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700">1-4 g/l (Trung bình)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-gray-700">{"> 4 g/l (Cao)"}</span>
          </div>
        </div>

        {/* Map with MapLibre */}
        <Card className="h-125 p-0 overflow-hidden">
          <Map ref={mapRef} center={[center.lng, center.lat]} zoom={8}>
            {stationData.map((station: ProphetPredict) => {
              const key = `${station.tinh}-${station.ten_tram}`;
              return (
                <MapMarker
                  key={station.id}
                  longitude={station.lon}
                  latitude={station.lat}
                  onClick={() => handleStationClick(station)}
                >
                  <MarkerContent>
                    <div
                      className={`relative rounded-full p-2 shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform ${
                        station.du_bao_man < 1
                          ? "bg-green-500"
                          : station.du_bao_man < 4
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    >
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </MarkerContent>
                  {selectedStation === key &&
                    (() => {
                      const recommendation = getCropRecommendations(
                        station.du_bao_man,
                      );
                      return (
                        <MarkerPopup closeButton anchor="bottom" offset={12}>
                          <div className="min-w-[280px] max-w-[320px] max-h-[350px] overflow-y-auto">
                            <h4 className="font-semibold text-gray-900 mb-2">
                              {station.ten_tram}
                            </h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Tỉnh:</span>
                                <span className="font-medium">
                                  {station.tinh}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Năm:</span>
                                <span className="font-medium">
                                  {station.nam}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Độ mặn:</span>
                                <span className="font-semibold text-blue-600">
                                  {station.du_bao_man.toFixed(2)} g/l
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Mức độ:</span>
                                <span className="font-medium">
                                  {getSalinityCategory(station.du_bao_man)}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-gray-200 mt-2">
                                {/* <div className="text-xs text-gray-500">
                                  Khoảng tin cậy 95%:
                                </div>
                                <div className="text-xs">
                                  [{station.lower_ci.toFixed(2)} -{" "}
                                  {station.upper_ci.toFixed(2)}] g/l
                                </div> */}
                              </div>
                              {/* <div className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                  Hệ số vị trí:
                                </span>
                                <span>
                                  {station.he_so_vi_tri?.toFixed(2) || "N/A"}
                                </span>
                              </div> */}
                            </div>

                            {/* --- PHẦN GỢI Ý CÂY TRỒNG --- */}
                            <div
                              className={`mt-3 rounded-lg p-3 border ${recommendation.bgColor} ${recommendation.borderColor}`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {recommendation.icon}
                                <span
                                  className={`text-sm font-bold ${recommendation.color}`}
                                >
                                  {recommendation.label}
                                </span>
                              </div>
                              {/* <p className="text-xs text-gray-600 italic mb-2">
                              {recommendation.desc}
                            </p> */}
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
                          </div>
                        </MarkerPopup>
                      );
                    })()}
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

        {/* Map Statistics */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-gray-600">Tổng số trạm</div>
            <div className="text-lg font-semibold text-gray-900">
              {stationData.length}
            </div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-gray-600">Độ mặn TB</div>
            <div className="text-lg font-semibold text-gray-900">
              {(
                stationData.reduce(
                  (sum: number, s: ProphetPredict) => sum + s.du_bao_man,
                  0,
                ) / stationData.length
              ).toFixed(2)}{" "}
              g/l
            </div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-gray-600">Tỉnh/Thành phố</div>
            <div className="text-lg font-semibold text-gray-900">
              {new Set(stationData.map((s: ProphetPredict) => s.tinh)).size}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
