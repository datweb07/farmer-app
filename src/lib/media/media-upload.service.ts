// @ts-nocheck
// ============================================
// Media Upload Service
// ============================================
// Handles multiple images and video uploads
// ============================================

import { supabase } from "../supabase/supabase";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/mov"];

export interface UploadedImage {
  url: string;
  file: File;
}

export interface UploadedVideo {
  url: string;
  thumbnail?: string;
  duration?: number;
  fileSize: number;
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImages(
  files: File[],
  bucket: string,
  userId: string
): Promise<{
  images: UploadedImage[];
  error?: string;
}> {
  try {
    const uploadedImages: UploadedImage[] = [];

    for (const file of files) {
      // Validate
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
          images: [],
          error: `${file.name}: Chỉ chấp nhận định dạng JPG, PNG, WebP, GIF`,
        };
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return { images: [], error: `${file.name}: Kích thước tối đa 5MB` };
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        return { images: [], error: `Lỗi upload ${file.name}` };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName);

      uploadedImages.push({
        url: publicUrl,
        file,
      });
    }

    return { images: uploadedImages };
  } catch (error: any) {
    console.error("Error uploading multiple images:", error);
    return { images: [], error: error.message };
  }
}

/**
 * Upload video with thumbnail generation
 */
export async function uploadVideo(
  file: File,
  bucket: string,
  userId: string
): Promise<{
  video?: UploadedVideo;
  error?: string;
}> {
  try {
    // Validate
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { error: "Chỉ chấp nhận định dạng MP4, WebM, MOV" };
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return { error: "Kích thước video tối đa 50MB" };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    // Upload video
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Video upload error:", error);
      return { error: "Lỗi upload video" };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    // Get video metadata (duration)
    const duration = await getVideoDuration(file);

    // Generate thumbnail (if possible)
    const thumbnail = await generateVideoThumbnail(file);
    let thumbnailUrl: string | undefined;

    if (thumbnail) {
      const thumbFileName = `${userId}/thumb-${Date.now()}.jpg`;
      const { data: thumbData } = await supabase.storage
        .from(bucket)
        .upload(thumbFileName, thumbnail);

      if (thumbData) {
        const {
          data: { publicUrl: thumbPublicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(thumbFileName);
        thumbnailUrl = thumbPublicUrl;
      }
    }

    return {
      video: {
        url: publicUrl,
        thumbnail: thumbnailUrl,
        duration,
        fileSize: file.size,
      },
    };
  } catch (error: any) {
    console.error("Error uploading video:", error);
    return { error: error.message };
  }
}

/**
 * Get video duration
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };

    video.onerror = () => {
      resolve(0);
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Generate video thumbnail
 */
function generateVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      video.currentTime = 1; // Get frame at 1 second
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            window.URL.revokeObjectURL(video.src);
            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      } else {
        resolve(null);
      }
    };

    video.onerror = () => {
      resolve(null);
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Extract path from URL if needed
    const path = filePath.includes("supabase.co")
      ? filePath.split(`/${bucket}/`)[1]
      : filePath;

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Delete error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return { success: false, error: error.message };
  }
}
