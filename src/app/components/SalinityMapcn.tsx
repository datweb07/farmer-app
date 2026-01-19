import { useState, useRef } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import { Skull, AlertTriangle, ThumbsUp } from "lucide-react";
import MapLibreGL from "maplibre-gl";

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case "danger":
      return <Skull className="w-4 h-4 text-white" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-white" />;
    case "safe":
      return <ThumbsUp className="w-4 h-4 text-white" />;
    default:
      return <ThumbsUp className="w-4 h-4 text-white" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "danger":
      return "Nguy hiểm";
    case "warning":
      return "Cảnh báo";
    case "safe":
      return "An toàn";
    default:
      return "An toàn";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "danger":
      return "bg-red-500";
    case "warning":
      return "bg-yellow-500";
    case "safe":
      return "bg-green-500";
    default:
      return "bg-green-500";
  }
};

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
      // Animate map to province location
      mapRef.current.flyTo({
        center: [coords.lng, coords.lat],
        zoom: 10,
        duration: 1500, // 1.5 seconds animation
        essential: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Map Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            Bản đồ xâm nhập mặn ĐBSCL
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            Dữ liệu cập nhật theo thời gian thực •{" "}
            {new Date().toLocaleDateString("vi-VN")}
          </p>
        </div>

        <Card className="h-[500px] p-0 overflow-hidden">
          <Map ref={mapRef} center={[105.8, 10.0]} zoom={7.5}>
            {areas.map((area) => {
              const coords = provinceCoords[area.province];
              if (!coords) return null;

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
                        area.status,
                      )} shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform`}
                    >
                      {getStatusIcon(area.status)}
                    </div>
                  </MarkerContent>
                  {selectedProvince === area.province && (
                    <MarkerPopup closeButton>
                      <div className="min-w-[200px]">
                        <h4 className="font-bold text-lg text-gray-900 mb-2">
                          {area.province}
                        </h4>
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className={`p-2 rounded-full ${
                              area.status === "danger"
                                ? "bg-red-100"
                                : area.status === "warning"
                                  ? "bg-yellow-100"
                                  : "bg-green-100"
                            }`}
                          >
                            {getStatusIcon(area.status)}
                          </div>
                          <div>
                            <span
                              className={`font-semibold ${
                                area.status === "danger"
                                  ? "text-red-600"
                                  : area.status === "warning"
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {getStatusText(area.status)}
                            </span>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {area.salinity}‰
                            </p>
                          </div>
                        </div>
                        {area.population && (
                          <p className="text-gray-700 text-sm mb-1">
                            <span className="font-semibold">
                              Dân số ảnh hưởng:
                            </span>{" "}
                            {area.population.toLocaleString()} người
                          </p>
                        )}
                        {area.lastUpdate && (
                          <p className="text-gray-500 text-xs mt-2">
                            Cập nhật: {area.lastUpdate}
                          </p>
                        )}
                      </div>
                    </MarkerPopup>
                  )}
                </MapMarker>
              );
            })}
            {/* <MapControls position="bottom-right" showZoom showCompass /> */}
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
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">An toàn (&lt; 4‰)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-700">Cảnh báo (4-6‰)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700">Nguy hiểm (&gt; 6‰)</span>
          </div>
        </div>
      </div>

      {/* Province List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-bold text-lg text-gray-900 mb-4">
          Danh sách tỉnh/thành phố ({areas.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2">
          {areas.map((area) => (
            <div
              key={area.province}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${
                area.status === "danger"
                  ? "bg-gradient-to-r from-red-50 to-red-100 border-red-300"
                  : area.status === "warning"
                    ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300"
                    : "bg-gradient-to-r from-green-50 to-green-100 border-green-300"
              }`}
              onClick={() => handleProvinceClick(area.province)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${getStatusColor(area.status)}`}
                  >
                    {getStatusIcon(area.status)}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">{area.province}</h5>
                    <p className="text-sm text-gray-600">
                      {provinceCoords[area.province]?.region || "ĐBSCL"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {area.salinity}‰
                  </p>
                  <p className="text-xs text-gray-500">
                    {getStatusText(area.status)}
                  </p>
                </div>
              </div>
              {area.population && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                  <span className="text-gray-600">Dân số:</span>
                  <span className="font-semibold">
                    {area.population.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Tổng quan</p>
          <p className="text-3xl font-bold text-red-600">{areas.length} tỉnh</p>
          <div className="mt-4 pt-4 border-t border-red-200 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-red-600">Nguy hiểm</p>
              <p className="text-xl font-bold text-red-700">
                {dangerAreas.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-yellow-600">Cảnh báo</p>
              <p className="text-xl font-bold text-yellow-600">
                {warningAreas.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600">An toàn</p>
              <p className="text-xl font-bold text-green-600">
                {safeAreas.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-700 mb-1">
            Diện tích ảnh hưởng
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {areas.reduce((sum, area) => sum + (area.affectedAreaKm || 0), 0) >
            0
              ? `${areas.reduce((sum, area) => sum + (area.affectedAreaKm || 0), 0).toLocaleString()} km²`
              : "--"}
          </p>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-purple-700 mb-1">
            Dân số ảnh hưởng
          </p>
          <p className="text-3xl font-bold text-purple-600">
            {areas.reduce((sum, area) => sum + (area.population || 0), 0) > 0
              ? `${(areas.reduce((sum, area) => sum + (area.population || 0), 0) / 1000).toFixed(1)}K`
              : "--"}
          </p>
        </div>
      </div>
    </div>
  );
}
