// ============================================
// Image Upload Service
// ============================================
// Handles image uploads to Supabase Storage
// ============================================

import { supabase } from '../supabase/supabase';

/**
 * Upload image to Supabase Storage
 * @param file Image file to upload
 * @param bucket Storage bucket name ('post-images' or 'product-images')
 * @param userId User ID for organizing uploads
 * @returns Public URL of uploaded image
 */
export async function uploadImage(
    file: File,
    bucket: 'post-images' | 'product-images' | 'project-images',
    userId: string
): Promise<{ url: string | null; error: string | null }> {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            return { url: null, error: 'File phải là hình ảnh' };
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { url: null, error: 'Kích thước ảnh không được vượt quá 5MB' };
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        console.log('🔵 [ImageUpload] Uploading to:', bucket, fileName);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('🔴 [ImageUpload] Upload error:', error);
            return { url: null, error: `Lỗi tải ảnh: ${error.message}` };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        console.log('✅ [ImageUpload] Image uploaded:', publicUrl);
        return { url: publicUrl, error: null };
    } catch (err) {
        console.error('🔴 [ImageUpload] Unexpected error:', err);
        return {
            url: null,
            error: `Đã xảy ra lỗi không mong muốn: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

/**
 * Delete image from Supabase Storage
 * @param imageUrl Full URL of the image
 * @param bucket Storage bucket name
 */
export async function deleteImage(
    imageUrl: string,
    bucket: 'post-images' | 'product-images' | 'project-images'
): Promise<{ success: boolean; error: string | null }> {
    try {
        // Extract path from URL
        const urlParts = imageUrl.split(`/${bucket}/`);
        if (urlParts.length < 2) {
            return { success: false, error: 'URL không hợp lệ' };
        }

        const filePath = urlParts[1];

        console.log('🔵 [ImageUpload] Deleting:', bucket, filePath);

        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error('🔴 [ImageUpload] Delete error:', error);
            return { success: false, error: `Lỗi xóa ảnh: ${error.message}` };
        }

        console.log('✅ [ImageUpload] Image deleted');
        return { success: true, error: null };
    } catch (err) {
        console.error('🔴 [ImageUpload] Unexpected error:', err);
        return {
            success: false,
            error: `Đã xảy ra lỗi không mong muốn: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error: string | null } {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'File phải là hình ảnh' };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return { valid: false, error: 'Kích thước ảnh không được vượt quá 5MB' };
    }

    // Check file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
        return { valid: false, error: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận: JPG, PNG, GIF, WebP' };
    }

    return { valid: true, error: null };
}
