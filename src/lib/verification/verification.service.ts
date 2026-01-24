// @ts-nocheck - Types will be fully available after running SQL schema in Supabase

/**
 * Verification Service
 * Handles farmer verification documents for credit purchases
 */

import { supabase } from "../supabase/supabase";
import type {
  VerificationDocument,
  VerificationDocumentWithUser,
  VerificationUploadData,
  VerificationApprovalData,
} from "../../types/verification";

/**
 * Upload verification document
 */
export async function uploadVerificationDocument(
  data: VerificationUploadData,
): Promise<{ document: VerificationDocument | null; error: string | null }> {
  try {
    const { data: document, error } = (await supabase
      .from("verification_documents")
      .insert({
        user_id: data.user_id,
        transaction_id: data.transaction_id || null,
        document_type: data.document_type,
        document_url: data.document_url,
        reference_link: data.reference_link || null,
        notes: data.notes || null,
        status: "pending",
      } as any)
      .select()
      .single()) as { data: VerificationDocument | null; error: any };

    if (error) {
      console.error("Error uploading verification document:", error);
      return { document: null, error: error.message };
    }

    return { document, error: null };
  } catch (error) {
    console.error("Exception uploading verification document:", error);
    return {
      document: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get verification documents for a user
 */
export async function getUserVerificationDocuments(userId: string): Promise<{
  documents: VerificationDocument[] | null;
  error: string | null;
}> {
  try {
    const { data: documents, error } = await supabase
      .from("verification_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user verification documents:", error);
      return { documents: null, error: error.message };
    }

    return { documents, error: null };
  } catch (error) {
    console.error("Exception fetching user verification documents:", error);
    return {
      documents: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get verification document by transaction ID
 */
export async function getVerificationByTransaction(
  transactionId: string,
): Promise<{ document: VerificationDocument | null; error: string | null }> {
  try {
    const { data: document, error } = await supabase
      .from("verification_documents")
      .select("*")
      .eq("transaction_id", transactionId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      console.error("Error fetching verification document:", error);
      return { document: null, error: error.message };
    }

    return { document: document || null, error: null };
  } catch (error) {
    console.error("Exception fetching verification document:", error);
    return {
      document: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all pending verification documents (for business dashboard)
 */
export async function getPendingVerifications(): Promise<{
  documents: VerificationDocumentWithUser[] | null;
  error: string | null;
}> {
  try {
    const { data: documents, error } = await supabase
      .from("verification_documents")
      .select(
        `
        *,
        user_profile:profiles!verification_documents_user_id_fkey(username, avatar_url, full_name)
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending verifications:", error);
      return { documents: null, error: error.message };
    }

    return { documents: documents as any, error: null };
  } catch (error) {
    console.error("Exception fetching pending verifications:", error);
    return {
      documents: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all verification documents with filters (for business dashboard)
 */
export async function getAllVerifications(status?: string): Promise<{
  documents: VerificationDocumentWithUser[] | null;
  error: string | null;
}> {
  try {
    let query = supabase.from("verification_documents").select(
      `
        *,
        user_profile:profiles!verification_documents_user_id_fkey(username, avatar_url, full_name),
        verifier_profile:profiles!verification_documents_verified_by_fkey(username, full_name)
      `,
    );

    if (status) {
      query = query.eq("status", status);
    }

    const { data: documents, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching verifications:", error);
      return { documents: null, error: error.message };
    }

    return { documents: documents as any, error: null };
  } catch (error) {
    console.error("Exception fetching verifications:", error);
    return {
      documents: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Approve or reject verification document
 */
export async function updateVerificationStatus(
  documentId: string,
  approvalData: VerificationApprovalData,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: {
      status: string;
      verified_by: string;
      verified_at: string;
      rejection_reason?: string;
    } = {
      status: approvalData.status,
      verified_by: approvalData.verified_by,
      verified_at: approvalData.verified_at,
    };

    if (approvalData.status === "rejected" && approvalData.rejection_reason) {
      updateData.rejection_reason = approvalData.rejection_reason;
    }

    // @ts-ignore - Supabase generated types may not be up to date
    const { error } = await supabase
      .from("verification_documents")
      .update(updateData as any)
      .eq("id", documentId);

    if (error) {
      console.error("Error updating verification status:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Exception updating verification status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upload document image to Supabase Storage
 */
export async function uploadDocumentImage(
  file: File,
  userId: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading document image:", uploadError);
      return { url: null, error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("verification-documents").getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error("Exception uploading document image:", error);
    return {
      url: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create storage bucket for verification documents (run once)
 */
export async function createVerificationBucket(): Promise<void> {
  try {
    const { error } = await supabase.storage.createBucket(
      "verification-documents",
      {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
        ],
      },
    );

    if (error && error.message !== "Bucket already exists") {
      console.error("Error creating verification bucket:", error);
    }
  } catch (error) {
    console.error("Exception creating verification bucket:", error);
  }
}
