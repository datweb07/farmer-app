export interface AdministrativeUnit {
  code: string;
  name: string;
  type: string;
}

export type Ward = AdministrativeUnit;

export interface District extends AdministrativeUnit {
  wards: Ward[];
}

export interface Province extends AdministrativeUnit {
  districts: District[];
}

export interface UserLocation {
  user_id: string;
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  ward_code: string;
  ward_name: string;
  dataset_version: string;
  created_at: string;
  updated_at: string;
}

export interface LocationSelection {
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  ward_code: string;
  ward_name: string;
}
