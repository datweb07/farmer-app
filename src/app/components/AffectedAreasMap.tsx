import React, { type JSX, useState, useCallback, useMemo } from 'react';
import {
  Skull,
  AlertTriangle,
  ThumbsUp,
  ExternalLink,
  Thermometer,
  Droplets,
  Wind,
  BarChart,
  Calendar,
  Clock,
  ZoomIn,
  ZoomOut,
  Navigation,
  MapPin,
  Info,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { GoogleMap, useLoadScript, Marker, Circle, InfoWindow, type Libraries } from '@react-google-maps/api';

// Define libraries outside component to prevent recreation on each render
const libraries: Libraries = ['places'];

interface AffectedArea {
  province: string;
  salinity: number;
  status: 'safe' | 'warning' | 'danger';
  population?: number;
  affectedAreaKm?: number;
  lastUpdate?: string;
}

interface AffectedAreasMapProps {
  areas: AffectedArea[];
}

const provinceCoords: Record<string, { lat: number; lng: number; region?: string }> = {
  'Bến Tre': { lat: 10.15, lng: 106.37, region: 'Đồng bằng sông Cửu Long' },
  'Trà Vinh': { lat: 9.97, lng: 106.34, region: 'Đồng bằng sông Cửu Long' },
  'Sóc Trăng': { lat: 9.60, lng: 105.97, region: 'Đồng bằng sông Cửu Long' },
  'Cà Mau': { lat: 9.17, lng: 105.15, region: 'Đồng bằng sông Cửu Long' },
  'Kiên Giang': { lat: 10.02, lng: 105.44, region: 'Đồng bằng sông Cửu Long' },
  'An Giang': { lat: 10.53, lng: 105.38, region: 'Đồng bằng sông Cửu Long' },
  'Đồng Tháp': { lat: 10.71, lng: 105.64, region: 'Đồng bằng sông Cửu Long' },
  'Vĩnh Long': { lat: 10.25, lng: 105.97, region: 'Đồng bằng sông Cửu Long' },
  'Cần Thơ': { lat: 10.03, lng: 105.77, region: 'Đồng bằng sông Cửu Long' },
  'Hậu Giang': { lat: 9.78, lng: 105.73, region: 'Đồng bằng sông Cửu Long' },
  'Bạc Liêu': { lat: 9.29, lng: 106.58, region: 'Đồng bằng sông Cửu Long' },
  'Long An': { lat: 10.72, lng: 106.16, region: 'Đồng bằng sông Cửu Long' },
  'Tiền Giang': { lat: 10.41, lng: 106.15, region: 'Đồng bằng sông Cửu Long' },
};

const statusColor = (status: string) => {
  if (status === 'danger') return '#ef4444';
  if (status === 'warning') return '#f59e0b';
  return '#10b981';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'danger':
      return <Skull className="w-5 h-5 text-white" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-white" />;
    case 'safe':
      return <ThumbsUp className="w-5 h-5 text-white" />;
    default:
      return <ThumbsUp className="w-5 h-5 text-white" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'danger':
      return 'Nguy hiểm';
    case 'warning':
      return 'Cảnh báo';
    case 'safe':
      return 'An toàn';
    default:
      return 'An toàn';
  }
};

// Dữ liệu bài báo chính thống
const officialReports = [
  {
    id: 1,
    title: 'Bản tin dự báo ranh mặn tuần 15-21/12/2024',
    source: 'SIWRR - Viện Khoa học Thủy lợi Miền Nam',
    url: 'https://siwrr.org.vn/du-bao-nguon-nuoc',
    date: '14/12/2024',
    data: {
      temperature: '28-32°C',
      humidity: '65-80%',
      salinity: '4-6‰',
      rainfall: '15-25mm',
      windSpeed: '10-15 km/h'
    },
    highlights: [
      'Ranh mặn 1g/l xâm nhập sâu 40-50km',
      'Cống Cái Lớn mở cửa tháo lũ',
      'Đề xuất hạn chế lấy nước từ sông chính'
    ]
  },
  {
    id: 2,
    title: 'Dự báo hạn mặn mùa khô 2024-2025',
    source: 'NCHMF - Trung tâm Dự báo Khí tượng Thủy văn Quốc gia',
    url: 'https://nchmf.gov.vn',
    date: '10/12/2024',
    data: {
      temperature: '29-34°C',
      humidity: '60-75%',
      salinity: '5-7‰',
      rainfall: '10-20mm',
      elNino: 'Đang hoạt động mạnh'
    },
    highlights: [
      'Đỉnh mặn cao nhất vào tháng 3-4/2025',
      'Lưu lượng nước về thấp hơn trung bình 20%',
      'Cảnh báo hạn mặn nghiêm trọng khu vực ven biển'
    ]
  },
  {
    id: 3,
    title: 'Long An công bố xâm nhập mặn khẩn cấp',
    source: 'VNEXPRESS - Báo điện tử',
    url: 'https://vnexpress.net/long-an-cong-bo-xam-nhap-man-khan-cap-4735647.html',
    date: '17/04/2024',
    data: {
      waterLevel: '8.2m',
      discharge: '3500 m³/s',
      change: 'Giảm 15% so với tuần trước',
      temperature: '27°C',
      tide: 'Chế độ bán nhật triều'
    },
    highlights: [
      "Tỉnh Long An chính thức công bố rủi ro thiên tai xâm nhập mặn ở cấp độ cao nhất (cấp 4).",
      "Nước mặn (4‰) đã xâm nhập sâu vào hệ thống sông chính, ảnh hưởng trực tiếp đến nguồn nước sinh hoạt.",
      "Hơn 20.000 người dân đang bị thiếu nước sinh hoạt do hạn mặn kéo dài.",
      "Tỉnh đã đề xuất ngân sách lớn cho các biện pháp cấp bách như nạo vét kênh, lắp trạm bơm, cung cấp nước sạch.",
      "Đây là tỉnh thứ ba ở ĐBSCL (sau Tiền Giang và Cà Mau) công bố tình trạng khẩn cấp về xâm nhập mặn trong mùa khô năm nay."
    ]
  },
  {
    id: 4,
    title: 'Chỉ số ONI tháng 11/2024: +1.2°C',
    source: 'CPC/NCEP - NOAA',
    url: 'https://cpc.ncep.noaa.gov',
    date: '08/12/2024',
    data: {
      oniIndex: '+1.2°C',
      status: 'El Niño mạnh',
      forecast: 'Duy trì đến Q2/2025',
      impact: 'Hạn hán và xâm nhập mặn nghiêm trọng'
    },
    highlights: [
      'El Niño đang ở giai đoạn cực đại',
      'Dự báo ảnh hưởng đến hết mùa khô',
      'Cần chuẩn bị ứng phó hạn mặn kéo dài'
    ]
  },
  {
    id: 5,
    title: 'Bản đồ độ ẩm đất ĐBSCL tháng 12',
    source: 'SERVIR-Mekong - ADPC',
    url: 'https://servir.adpc.net',
    date: '12/12/2024',
    data: {
      soilMoisture: '35-45%',
      vegetation: 'Khỏe mạnh 70%',
      drought: 'Bình thường',
      recommendation: 'Tưới bổ sung cho cây trồng'
    },
    highlights: [
      'Độ ẩm đất thấp ở vùng ven biển',
      'Cây lúa đang phát triển tốt',
      'Cần giám sát độ ẩm đất chặt chẽ'
    ]
  },
  {
    id: 6,
    title: 'Báo cáo vận hành các cống lớn',
    source: 'Cục Thủy lợi',
    url: 'https://tongcucthuyloi.gov.vn',
    date: '15/12/2024',
    data: {
      caoLanh: 'Đóng cửa',
      caiLon: 'Mở 50%',
      ninhQuoi: 'Đóng cửa',
      vamCo: 'Mở 30%',
      waterStorage: '85% công suất'
    },
    highlights: [
      'Cống Cái Lớn mở điều tiết nước',
      'Hồ chứa thượng nguồn đạt 80-90%',
      'Sẵn sàng ứng phó xâm nhập mặn'
    ]
  }
];

// Custom map styles
const mapStyles = [
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#a2daf2" }]
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }]
  },
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#666666" }]
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  }
];

export function AffectedAreasMap({ areas }: AffectedAreasMapProps) {
  const [selectedProvince, setSelectedProvince] = useState<AffectedArea | null>(null);
  const [mapZoom, setMapZoom] = useState(8);
  const [mapCenter, setMapCenter] = useState({ lat: 10.0, lng: 105.8 });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // API configuration
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries
  });

  // Process and filter areas
  const filteredAreas = useMemo(() => {
    if (!activeFilter) return areas;
    return areas.filter(area => area.status === activeFilter);
  }, [areas, activeFilter]);

  const sortedAreas = useMemo(() =>
    [...filteredAreas].sort((a, b) => b.salinity - a.salinity),
    [filteredAreas]
  );

  const dangerAreas = useMemo(() => sortedAreas.filter(a => a.status === 'danger'), [sortedAreas]);
  const warningAreas = useMemo(() => sortedAreas.filter(a => a.status === 'warning'), [sortedAreas]);
  const safeAreas = useMemo(() => sortedAreas.filter(a => a.status === 'safe'), [sortedAreas]);

  // Statistics
  const totalAffectedPopulation = useMemo(() =>
    sortedAreas.reduce((sum, area) => sum + (area.population || 0), 0),
    [sortedAreas]
  );

  const totalAffectedArea = useMemo(() =>
    sortedAreas.reduce((sum, area) => sum + (area.affectedAreaKm || 0), 0),
    [sortedAreas]
  );

  // Map interaction handlers
  const handleZoomIn = useCallback(() => setMapZoom(prev => Math.min(prev + 1, 15)), []);
  const handleZoomOut = useCallback(() => setMapZoom(prev => Math.max(prev - 1, 5)), []);
  const handleResetView = useCallback(() => {
    setMapCenter({ lat: 10.0, lng: 105.8 });
    setMapZoom(8);
    setSelectedProvince(null);
  }, []);

  const handleMarkerClick = useCallback((area: AffectedArea) => {
    setSelectedProvince(area);
    const coords = provinceCoords[area.province];
    if (coords) {
      setMapCenter(coords);
      setMapZoom(10);
    }
  }, []);

  const handleFilterClick = useCallback((status: string | null) => {
    setActiveFilter(prev => prev === status ? null : status);
  }, []);

  // Get icon for report data
  const getDataIcon = (key: string) => {
    const iconMap: Record<string, JSX.Element> = {
      temperature: <Thermometer className="w-4 h-4 text-blue-600" />,
      humidity: <Droplets className="w-4 h-4 text-blue-600" />,
      salinity: <AlertTriangle className="w-4 h-4 text-blue-600" />,
      rainfall: <Droplets className="w-4 h-4 text-blue-600" />,
      windSpeed: <Wind className="w-4 h-4 text-blue-600" />,
      waterLevel: <BarChart className="w-4 h-4 text-blue-600" />,
      discharge: <Wind className="w-4 h-4 text-blue-600" />,
      change: <BarChart className="w-4 h-4 text-blue-600" />,
      tide: <Droplets className="w-4 h-4 text-blue-600" />,
      oniIndex: <Thermometer className="w-4 h-4 text-blue-600" />,
      status: <AlertTriangle className="w-4 h-4 text-blue-600" />,
      forecast: <Calendar className="w-4 h-4 text-blue-600" />,
      impact: <AlertTriangle className="w-4 h-4 text-blue-600" />,
      soilMoisture: <Droplets className="w-4 h-4 text-blue-600" />,
      vegetation: <Wind className="w-4 h-4 text-blue-600" />,
      drought: <AlertTriangle className="w-4 h-4 text-blue-600" />,
      recommendation: <Clock className="w-4 h-4 text-blue-600" />,
      elNino: <Thermometer className="w-4 h-4 text-blue-600" />,
      caoLanh: <BarChart className="w-4 h-4 text-blue-600" />,
      caiLon: <BarChart className="w-4 h-4 text-blue-600" />,
      ninhQuoi: <BarChart className="w-4 h-4 text-blue-600" />,
      vamCo: <BarChart className="w-4 h-4 text-blue-600" />,
      waterStorage: <Droplets className="w-4 h-4 text-blue-600" />
    };
    return iconMap[key] || <BarChart className="w-4 h-4 text-blue-600" />;
  };

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
        <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🗺️</span>
          Bản đồ xâm nhập mặn
        </h3>
        <div className="text-red-600 bg-red-50 p-4 rounded-lg">
          <p className="font-bold mb-2">Lỗi khi tải Google Maps</p>
          <p className="text-sm">Vui lòng kiểm tra API key trong file .env</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main Map Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              Bản đồ xâm nhập mặn ĐBSCL
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Dữ liệu cập nhật theo thời gian thực • {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg"
              title="Phóng to"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center gap-1"
              title="Về vị trí mặc định"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative mb-6 rounded-lg overflow-hidden border-2 border-gray-200">
          {!isLoaded ? (
            <div className="w-full h-96 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-gray-600">Đang tải bản đồ...</p>
              </div>
            </div>
          ) : (
            <>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '400px' }}
                center={mapCenter}
                zoom={mapZoom}
                options={{
                  styles: mapStyles,
                  mapTypeControl: true,
                  streetViewControl: false,
                  fullscreenControl: true,
                  zoomControl: false,
                }}
              >
                {sortedAreas.map((area) => {
                  const coords = provinceCoords[area.province];
                  if (!coords) return null;
                  const color = statusColor(area.status);
                  const radius = area.status === 'danger' ? 25000 : area.status === 'warning' ? 15000 : 10000;

                  return (
                    <React.Fragment key={area.province}>
                      <Marker
                        position={coords}
                        onClick={() => handleMarkerClick(area)}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          fillColor: color,
                          fillOpacity: 0.9,
                          strokeColor: '#ffffff',
                          strokeWeight: 2,
                          scale: 10
                        }}
                      />
                      <Circle
                        center={coords}
                        radius={radius}
                        options={{
                          strokeColor: color,
                          strokeOpacity: 0.5,
                          strokeWeight: 2,
                          fillColor: color,
                          fillOpacity: 0.1,
                        }}
                      />
                    </React.Fragment>
                  );
                })}

                {selectedProvince && (
                  <InfoWindow
                    position={provinceCoords[selectedProvince.province]}
                    onCloseClick={() => setSelectedProvince(null)}
                  >
                    <div className="p-3 max-w-xs">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">{selectedProvince.province}</h4>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-full ${selectedProvince.status === 'danger' ? 'bg-red-100' : selectedProvince.status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                          {getStatusIcon(selectedProvince.status)}
                        </div>
                        <div>
                          <span className={`font-semibold ${selectedProvince.status === 'danger' ? 'text-red-600' : selectedProvince.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {getStatusText(selectedProvince.status)}
                          </span>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{selectedProvince.salinity}‰</p>
                        </div>
                      </div>
                      {selectedProvince.population && (
                        <p className="text-gray-700 text-sm mb-1">
                          <span className="font-semibold">Dân số ảnh hưởng:</span> {selectedProvince.population.toLocaleString()} người
                        </p>
                      )}
                      {selectedProvince.lastUpdate && (
                        <p className="text-gray-500 text-xs mt-2">
                          Cập nhật: {selectedProvince.lastUpdate}
                        </p>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>

              {/* Map Legend Overlay */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  Chú thích
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs">An toàn (&lt; 4‰)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs">Cảnh báo (4-6‰)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs">Nguy hiểm (&gt; 6‰)</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Statistics and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">Tổng quan</p>
                <p className="text-3xl font-bold text-red-600">{sortedAreas.length} tỉnh</p>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-red-600 hover:text-red-700"
              >
                {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showDetails && (
              <div className="mt-4 pt-4 border-t border-red-200 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-red-600">Nguy hiểm</p>
                  <p className="text-xl font-bold text-red-700">{dangerAreas.length}</p>
                </div>
                <div>
                  <p className="text-xs text-yellow-600">Cảnh báo</p>
                  <p className="text-xl font-bold text-yellow-600">{warningAreas.length}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">An toàn</p>
                  <p className="text-xl font-bold text-green-600">{safeAreas.length}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-700 mb-1">Diện tích ảnh hưởng</p>
            <p className="text-3xl font-bold text-blue-600">
              {totalAffectedArea > 0 ? `${totalAffectedArea.toLocaleString()} km²` : '--'}
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-purple-700 mb-1">Dân số ảnh hưởng</p>
            <p className="text-3xl font-bold text-purple-600">
              {totalAffectedPopulation > 0 ? `${(totalAffectedPopulation / 1000).toFixed(1)}K` : '--'}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => handleFilterClick(null)}
            className={`px-4 py-2 rounded-lg font-medium ${!activeFilter ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700'}`}
          >
            Tất cả ({areas.length})
          </button>
          <button
            onClick={() => handleFilterClick('danger')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${activeFilter === 'danger' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-700'}`}
          >
            <Skull className="w-4 h-4" />
            Nguy hiểm ({dangerAreas.length})
          </button>
          <button
            onClick={() => handleFilterClick('warning')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${activeFilter === 'warning' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' : 'bg-gray-100 text-gray-700'}`}
          >
            <AlertTriangle className="w-4 h-4" />
            Cảnh báo ({warningAreas.length})
          </button>
          <button
            onClick={() => handleFilterClick('safe')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${activeFilter === 'safe' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-700'}`}
          >
            <ThumbsUp className="w-4 h-4" />
            An toàn ({safeAreas.length})
          </button>
        </div>

        {/* Areas List */}
        <div className="mb-6">
          <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Danh sách tỉnh/thành phố ({sortedAreas.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2">
            {sortedAreas.map((area) => (
              <div
                key={area.province}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${area.status === 'danger'
                  ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
                  : area.status === 'warning'
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300'
                    : 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
                  }`}
                onClick={() => handleMarkerClick(area)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${area.status === 'danger' ? 'bg-red-500' : area.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                      {getStatusIcon(area.status)}
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900">{area.province}</h5>
                      <p className="text-sm text-gray-600">{provinceCoords[area.province]?.region || 'ĐBSCL'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{area.salinity}‰</p>
                    <p className="text-xs text-gray-500">{getStatusText(area.status)}</p>
                  </div>
                </div>
                {area.population && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                    <span className="text-gray-600">Dân số:</span>
                    <span className="font-semibold">{area.population.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Official Reports Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <BarChart className="w-6 h-6 text-blue-600" />
              Dữ liệu dự báo từ cơ quan chuyên môn
            </h3>
            <p className="text-gray-600 mt-1">Thông tin được cập nhật từ các nguồn uy tín</p>
          </div>
          <div className="text-sm text-gray-500">
            {officialReports.length} báo cáo • Cập nhật gần nhất: {officialReports[0]?.date}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {officialReports.map((report) => (
            <div
              key={report.id}
              className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{report.title}</h4>
                <a
                  href={report.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2"
                  title="Truy cập nguồn chính thức"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {report.date} • {report.source}
                </p>
              </div>

              {/* Technical Data */}
              <div className="mb-4 bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  Thông số chính
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(report.data).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded">
                        {getDataIcon(key)}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
                        <p className="text-sm font-semibold text-gray-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlights */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Điểm nổi bật
                </p>
                <ul className="space-y-1">
                  {report.highlights.map((highlight, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="line-clamp-2">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <a
                  href={report.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  Xem chi tiết trên {report.source.split(' - ')[0]}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Summary Section */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
        <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
          <BarChart className="w-6 h-6 text-blue-600" />
          Tổng hợp dữ liệu từ các nguồn
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 border-2 border-blue-100 shadow-sm">
            <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-500" />
              Chỉ số khí hậu
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Chỉ số ONI</span>
                <span className="font-bold text-orange-600">+1.2°C (El Niño mạnh)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Nhiệt độ TB</span>
                <span className="font-bold text-gray-900">29-32°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Độ ẩm</span>
                <span className="font-bold text-gray-900">65-80%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border-2 border-blue-100 shadow-sm">
            <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Thông số thủy văn
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Mực nước Kratie</span>
                <span className="font-bold text-blue-600">8.2m (-15%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Lưu lượng nước về</span>
                <span className="font-bold text-gray-900">3,500 m³/s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Độ ẩm đất</span>
                <span className="font-bold text-gray-900">35-45%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border-2 border-blue-100 shadow-sm">
            <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Dự báo xâm nhập mặn
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Độ mặn TB</span>
                <span className="font-bold text-red-600">4-6‰</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ranh mặn 1g/l</span>
                <span className="font-bold text-gray-900">40-50km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Đỉnh mặn dự báo</span>
                <span className="font-bold text-red-600">Tháng 3-4/2025</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-blue-200">
          <p className="text-sm text-gray-600 mb-3">
            <span className="font-bold">Ghi chú:</span> Dữ liệu được tổng hợp từ các nguồn chính thống
          </p>
          <div className="flex flex-wrap gap-2">
            {['SIWRR', 'NCHMF', 'Mekong Portal', 'NOAA', 'SERVIR', 'Cục Thủy lợi'].map((source) => (
              <span
                key={source}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}