/**
 * Hook to initialize Supabase Storage buckets
 * Creates necessary storage buckets if they don't exist
 */

import { useEffect } from "react";
import { supabase } from "../lib/supabase/supabase";

export function useInitStorage() {
  useEffect(() => {
    const initStorageBuckets = async () => {
      try {
        // Check if verification-documents bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();

        const verificationBucketExists = buckets?.some(
          (bucket) => bucket.name === "verification-documents",
        );

        if (!verificationBucketExists) {
          console.log("Creating verification-documents bucket...");

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

          if (error && !error.message.includes("already exists")) {
            console.error("Error creating verification bucket:", error);
          } else {
            console.log(
              "✅ Verification documents bucket created successfully",
            );
          }
        }
      } catch (error) {
        console.error("Error initializing storage:", error);
      }
    };

    initStorageBuckets();
  }, []);
}
