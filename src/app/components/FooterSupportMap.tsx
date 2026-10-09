import { MapPin } from "lucide-react";
import { Map, MapControls, MapMarker, MarkerContent } from "../../components/ui/map";

// Replace these placeholder coordinates with the support office location.
const SUPPORT_LONGITUDE = 105.7;
const SUPPORT_LATITUDE = 10.2;

export function FooterSupportMap() {
  return <div className="overflow-hidden rounded-xl border border-white/15 bg-white/5">
    <div className="h-48 w-full" aria-label="Bản đồ">
      <Map center={[SUPPORT_LONGITUDE, SUPPORT_LATITUDE]} zoom={6} dragRotate={false}>
        <MapMarker longitude={SUPPORT_LONGITUDE} latitude={SUPPORT_LATITUDE}>
          <MarkerContent>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-gray-800 shadow-lg">
              <MapPin className="h-5 w-5" />
            </div>
          </MarkerContent>
        </MapMarker>
        <MapControls position="bottom-right" showZoom showCompass={false} className="[&_button]:bg-white [&_button]:text-black [&_button:hover]:bg-gray-100" />
      </Map>
    </div>
  </div>;
}
