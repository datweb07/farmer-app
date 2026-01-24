/**
 * Types for Verification Documents
 * Used for farmer credit verification
 */

export type VerificationStatus = "pending" | "approved" | "rejected";

export type DocumentType = "farming_certificate" | "business_license" | "other";

export interface VerificationDocument {
  id: string;
  user_id: string;
  transaction_id: string | null;
  document_type: DocumentType;
  document_url: string;
  reference_link: string | null;
  status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationDocumentWithUser extends VerificationDocument {
  user_profile: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  verifier_profile?: {
    username: string;
    full_name: string | null;
  };
}

export interface VerificationUploadData {
  user_id: string;
  transaction_id?: string;
  document_type: DocumentType;
  document_url: string;
  reference_link?: string;
  notes?: string;
}

export interface VerificationApprovalData {
  status: "approved" | "rejected";
  verified_by: string;
  verified_at: string;
  rejection_reason?: string;
}
