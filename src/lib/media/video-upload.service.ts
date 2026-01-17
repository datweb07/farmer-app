// ============================================
// Video Upload Service
// ============================================
// Handles video file upload with validation and metadata extraction

import { supabase } from '../supabase/supabase';

const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi'];

interface VideoMetadata {
    duration: number; // in seconds
    width: number;
    height: number;
}

interface VideoUploadResult {
    url: string;
    thumbnail?: string;
    duration?: number;
    fileSize: number;
    error: string | null;
}

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File): { valid: boolean; error: string } {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'Không tìm thấy file video' };
    }

    // Check file size (50MB limit for Supabase free tier)
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            error: `Video quá lớn (${sizeMB}MB). Tối đa ${MAX_VIDEO_SIZE_MB}MB`,
        };
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isValidExtension = ALLOWED_VIDEO_EXTENSIONS.includes(fileExtension || '');

    if (!isValidType && !isValidExtension) {
        return {
            valid: false,
            error: 'Định dạng video không hợp lệ. Chỉ chấp nhận MP4, WebM, MOV, AVI',
        };
    }

    return { valid: true, error: '' };
}

/**
 * Extract video metadata (duration, dimensions)
 */
export function getVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve({
                duration: Math.floor(video.duration),
                width: video.videoWidth,
                height: video.videoHeight,
            });
        };

        video.onerror = () => {
            reject(new Error('Không thể đọc metadata của video'));
        };

        video.src = URL.createObjectURL(file);
    });
}

/**
 * Generate video thumbnail from first frame
 */
export function generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Seek to 1 second (or start if video is shorter)
            video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
            if (!ctx) {
                reject(new Error('Cannot get canvas context'));
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to generate thumbnail'));
                    return;
                }

                const thumbnailURL = URL.createObjectURL(blob);
                resolve(thumbnailURL);
                window.URL.revokeObjectURL(video.src);
            }, 'image/jpeg', 0.85);
        };

        video.onerror = () => {
            reject(new Error('Cannot load video'));
        };

        video.src = URL.createObjectURL(file);
    });
}

/**
 * Upload video to Supabase storage
 */
export async function uploadVideo(
    file: File,
    bucketName: 'post-videos' | 'product-videos',
    userId: string
): Promise<VideoUploadResult> {
    try {
        // Validate file
        const validation = validateVideoFile(file);
        if (!validation.valid) {
            return {
                url: '',
                fileSize: 0,
                error: validation.error,
            };
        }

        // Get video metadata
        let metadata: VideoMetadata | undefined;
        try {
            metadata = await getVideoMetadata(file);
        } catch (err) {
            console.warn('Could not extract video metadata:', err);
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileName = `${userId}/${timestamp}-${randomString}.${fileExt}`;

        console.log(`📹 [VideoUpload] Uploading video: ${fileName}`);
        console.log(`📹 [VideoUpload] Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
        if (metadata) {
            console.log(`📹 [VideoUpload] Duration: ${metadata.duration}s, Resolution: ${metadata.width}x${metadata.height}`);
        }

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('❌ [VideoUpload] Upload failed:', error);
            return {
                url: '',
                fileSize: 0,
                error: `Không thể tải video lên: ${error.message}`,
            };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(data.path);

        console.log('✅ [VideoUpload] Upload successful:', urlData.publicUrl);

        return {
            url: urlData.publicUrl,
            duration: metadata?.duration,
            fileSize: file.size,
            error: null,
        };
    } catch (err) {
        console.error('❌ [VideoUpload] Unexpected error:', err);
        return {
            url: '',
            fileSize: 0,
            error: 'Đã xảy ra lỗi không mong muốn khi tải video',
        };
    }
}

/**
 * Upload video thumbnail to Supabase storage
 * @param thumbnailBlob - Blob URL or Blob object of the thumbnail
 * @param bucketName - Bucket to upload to
 * @param userId - User ID for folder organization
 * @param videoFileName - Original video filename (for naming consistency)
 * @returns Public URL of the uploaded thumbnail
 */
export async function uploadVideoThumbnail(
    thumbnailBlob: string | Blob,
    bucketName: 'post-videos' | 'product-videos',
    userId: string,
): Promise<{ url: string | null; error: string | null }> {
    try {
        // Convert blob URL to blob object if needed
        let blob: Blob;
        if (typeof thumbnailBlob === 'string') {
            const response = await fetch(thumbnailBlob);
            blob = await response.blob();
        } else {
            blob = thumbnailBlob;
        }

        // Generate unique filename for thumbnail
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileName = `${userId}/thumbnails/${timestamp}-${randomString}.jpg`;

        console.log(`🖼️ [ThumbnailUpload] Uploading thumbnail: ${fileName}`);

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('❌ [ThumbnailUpload] Upload failed:', error);
            return {
                url: null,
                error: `Không thể tải thumbnail lên: ${error.message}`,
            };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(data.path);

        console.log('✅ [ThumbnailUpload] Upload successful:', urlData.publicUrl);

        return {
            url: urlData.publicUrl,
            error: null,
        };
    } catch (err) {
        console.error('❌ [ThumbnailUpload] Unexpected error:', err);
        return {
            url: null,
            error: 'Đã xảy ra lỗi không mong muốn khi tải thumbnail',
        };
    }
}

/**
 * Delete video from Supabase storage
 */
export async function deleteVideo(
    videoUrl: string,
    bucketName: 'post-videos' | 'product-videos'
): Promise<{ success: boolean; error: string | null }> {
    try {
        // Extract file path from URL
        const url = new URL(videoUrl);
        const pathMatch = url.pathname.match(new RegExp(`/${bucketName}/(.+)`));

        if (!pathMatch) {
            return {
                success: false,
                error: 'Invalid video URL',
            };
        }

        const filePath = pathMatch[1];

        const { error } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);

        if (error) {
            console.error('Error deleting video:', error);
            return {
                success: false,
                error: `Không thể xóa video: ${error.message}`,
            };
        }

        return {
            success: true,
            error: null,
        };
    } catch (err) {
        console.error('Unexpected error deleting video:', err);
        return {
            success: false,
            error: 'Đã xảy ra lỗi khi xóa video',
        };
    }
}
