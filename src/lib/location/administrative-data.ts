import type { District, Province, Ward } from "./types";

type CompactWard = [string, string, string, string];
type CompactDistrict = [string, string, string, string, CompactWard[]];
type CompactProvince = [string, string, string, string, CompactDistrict[]];

export const ADMINISTRATIVE_DATASET_VERSION = "2025-03-01";
export const ADMINISTRATIVE_DATA_SOURCE =
  "https://github.com/daohoangson/dvhcvn";

let cachedData: Promise<Province[]> | null = null;

function withType(type: string, name: string) {
  return `${type} ${name}`.replace(/\s+/g, " ").trim();
}

function mapWard(unit: CompactWard): Ward {
  return { code: unit[0], name: withType(unit[2], unit[1]), type: unit[2] };
}

function mapDistrict(unit: CompactDistrict): District {
  return {
    code: unit[0],
    name: withType(unit[2], unit[1]),
    type: unit[2],
    wards: (unit[4] || []).map(mapWard),
  };
}

function mapProvince(unit: CompactProvince): Province {
  return {
    code: unit[0],
    name: withType(unit[2], unit[1]),
    type: unit[2],
    districts: (unit[4] || []).map(mapDistrict),
  };
}

export function loadAdministrativeUnits(): Promise<Province[]> {
  if (!cachedData) {
    cachedData = fetch("/data/dvhcvn-sorted.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Không thể tải danh mục hành chính");
        }
        return response.json() as Promise<CompactProvince[]>;
      })
      .then((data) => data.map(mapProvince))
      .catch((error) => {
        cachedData = null;
        throw error;
      });
  }

  return cachedData;
}

