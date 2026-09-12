import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Save } from "lucide-react";
import {
  ADMINISTRATIVE_DATA_SOURCE,
  ADMINISTRATIVE_DATASET_VERSION,
  loadAdministrativeUnits,
} from "../../lib/location/administrative-data";
import {
  getCurrentUserLocation,
  saveCurrentUserLocation,
} from "../../lib/location/location.service";
import type { Province, UserLocation } from "../../lib/location/types";

const selectClassName =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

export function ProfileLocationEditor() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [savedLocation, setSavedLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedProvince = useMemo(
    () => provinces.find((item) => item.code === provinceCode),
    [provinces, provinceCode],
  );
  const districts = useMemo(
    () => selectedProvince?.districts || [],
    [selectedProvince],
  );
  const selectedDistrict = useMemo(
    () => districts.find((item) => item.code === districtCode),
    [districts, districtCode],
  );
  const wards = useMemo(
    () => selectedDistrict?.wards || [],
    [selectedDistrict],
  );
  const selectedWard = useMemo(
    () => wards.find((item) => item.code === wardCode),
    [wards, wardCode],
  );
  const hasChanged =
    !savedLocation ||
    savedLocation.province_code !== provinceCode ||
    savedLocation.district_code !== districtCode ||
    savedLocation.ward_code !== wardCode;

  useEffect(() => {
    let active = true;

    Promise.all([loadAdministrativeUnits(), getCurrentUserLocation()])
      .then(([data, result]) => {
        if (!active) return;
        setProvinces(data);
        if (result.error) throw new Error(result.error);
        if (result.location) {
          setSavedLocation(result.location);
          setProvinceCode(result.location.province_code);
          setDistrictCode(result.location.district_code);
          setWardCode(result.location.ward_code);
        }
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const handleProvinceChange = (value: string) => {
    setProvinceCode(value);
    setDistrictCode("");
    setWardCode("");
    setSaved(false);
  };

  const handleDistrictChange = (value: string) => {
    setDistrictCode(value);
    setWardCode("");
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      setError("Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện và phường/xã.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);
    const result = await saveCurrentUserLocation({
      province_code: selectedProvince.code,
      province_name: selectedProvince.name,
      district_code: selectedDistrict.code,
      district_name: selectedDistrict.name,
      ward_code: selectedWard.code,
      ward_name: selectedWard.name,
    });
    setSaving(false);

    if (result.error || !result.location) {
      setError(result.error || "Không thể lưu địa chỉ.");
      return;
    }

    setSavedLocation(result.location);
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải danh mục hành chính...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {savedLocation && (
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-3 text-emerald-900">
          <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-medium text-emerald-700">Địa chỉ đã lưu</p>
            <p className="mt-0.5 text-sm font-semibold">
              {savedLocation.ward_name}, {savedLocation.district_name},{" "}
              {savedLocation.province_name}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1.5 text-sm font-medium text-gray-700">
          Tỉnh / Thành phố
          <select
            className={selectClassName}
            value={provinceCode}
            onChange={(event) => handleProvinceChange(event.target.value)}
          >
            <option value="">Chọn tỉnh/thành</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium text-gray-700">
          Quận / Huyện
          <select
            className={selectClassName}
            value={districtCode}
            disabled={!provinceCode}
            onChange={(event) => handleDistrictChange(event.target.value)}
          >
            <option value="">Chọn quận/huyện</option>
            {districts.map((district) => (
              <option key={district.code} value={district.code}>
                {district.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium text-gray-700">
          Phường / Xã
          <select
            className={selectClassName}
            value={wardCode}
            disabled={!districtCode}
            onChange={(event) => {
              setWardCode(event.target.value);
              setSaved(false);
            }}
          >
            <option value="">Chọn phường/xã</option>
            {wards.map((ward) => (
              <option key={ward.code} value={ward.code}>
                {ward.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Đã lưu địa chỉ. Thông báo mới đã được gửi tới chuông.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          Nguồn{" "}
          <a
            href={ADMINISTRATIVE_DATA_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            dvhcvn
          </a>{" "}
          · hiệu lực {ADMINISTRATIVE_DATASET_VERSION} ·{" "}
          <a
            href="/data/dvhcvn-LICENSE.txt"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            GPL-3.0
          </a>
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selectedWard || !hasChanged}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {hasChanged ? "Lưu địa chỉ" : "Địa chỉ đã lưu"}
        </button>
      </div>
    </div>
  );
}
