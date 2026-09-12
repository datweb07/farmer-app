export type ProcurementStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "rejected"
  | "cancelled";

export type PaymentVelocity =
  | "on_site"
  | "within_48h"
  | "within_7d"
  | "over_7d";

export interface ProcurementRequest {
  id: string;
  post_id: string;
  farmer_id: string;
  business_id: string;
  farmer_name: string;
  phone_number: string;
  desired_date: string;
  product_name: string;
  note: string | null;
  status: ProcurementStatus;
  actual_product_name: string | null;
  actual_weight_tons: number | null;
  payment_velocity: PaymentVelocity | null;
  farm_latitude: number | null;
  farm_longitude: number | null;
  buyer_latitude: number | null;
  buyer_longitude: number | null;
  gps_distance_km: number | null;
  gps_verified: boolean;
  otp_verified: boolean;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProcurementRequest {
  post_id: string;
  business_id: string;
  farmer_name: string;
  phone_number: string;
  desired_date: string;
  product_name: string;
  note?: string;
  farm_latitude?: number;
  farm_longitude?: number;
}

export interface CompleteProcurementRequest {
  actual_product_name: string;
  actual_weight_tons: number;
  payment_velocity: PaymentVelocity;
  buyer_latitude?: number;
  buyer_longitude?: number;
}

export interface BusinessReview {
  id: string;
  request_id: string;
  farmer_id: string;
  business_id: string;
  price_integrity: number;
  punctuality_care: number;
  transparency_attitude: number;
  comment: string | null;
  created_at: string;
  farmer_username?: string;
}

export interface BusinessReputation {
  business_id: string;
  username: string;
  avatar_url: string | null;
  successful_lots: number;
  total_tons: number;
  review_count: number;
  avg_price_integrity: number;
  avg_punctuality_care: number;
  avg_transparency_attitude: number;
  transaction_score: number;
  review_score: number;
  legal_score: number;
  total_score: number;
  star_rating: number;
  tier: "Top Partner" | "Verified Buyer" | "New Member";
  verified_id: boolean;
  bank_guarantee: boolean;
  export_standard: boolean;
}

