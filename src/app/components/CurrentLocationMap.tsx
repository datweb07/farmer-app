import { useEffect } from "react";
import { MapPin } from "lucide-react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  useMap,
} from "../../components/ui/map";

interface CurrentLocationMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

function FlyToCurrentLocation({ latitude, longitude }: CurrentLocationMapProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    map.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      duration: 1800,
      essential: true,
    });
  }, [isLoaded, latitude, longitude, map]);

  return null;
}

export function CurrentLocationMap({
  latitude,
  longitude,
  accuracy,
}: CurrentLocationMapProps) {
  return (
    <div className="animate-in fade-in zoom-in-95 overflow-hidden rounded-xl border border-gray-200 bg-white duration-500">
      <div className="h-52 w-full">
        <Map center={[105.7, 10.2]} zoom={6} dragRotate={false}>
          <FlyToCurrentLocation latitude={latitude} longitude={longitude} />
          <MapMarker longitude={longitude} latitude={latitude}>
            <MarkerContent>
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg">
                <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-40" />
                <MapPin className="relative h-5 w-5" />
              </div>
            </MarkerContent>
          </MapMarker>
          <MapControls position="bottom-right" showZoom showCompass={false} />
        </Map>
      </div>
      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800">
        <p className="font-medium">Vị trí GPS vừa ghi nhận</p>
        <p className="mt-0.5">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
          {accuracy != null ? ` · độ chính xác khoảng ${Math.round(accuracy)} m` : ""}
        </p>
      </div>
    </div>
  );
}
