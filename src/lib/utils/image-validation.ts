/**
 * Image validation utilities
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export interface ImageValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate image file for upload
 */
export function validateImageFile(file: File): ImageValidationResult {
    // Check file exists
    if (!file) {
        return { valid: false, error: 'Vui lòng chọn file' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
        return { valid: false, error: `File quá lớn. Tối đa ${sizeMB}MB` };
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Chỉ chấp nhận file JPG, PNG, WebP' };
    }

    return { valid: true };
}

/**
 * Generate unique filename for upload
 */
export function generateAvatarFilename(userId: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop() || 'jpg';
    return `${userId}/${timestamp}.${extension}`;
}

/**
 * Get public URL for avatar from storage path
 */
export function getAvatarUrl(supabaseUrl: string, path: string): string {
    return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
}

/**
 * Extract storage path from public URL
 */
export function getStoragePathFromUrl(url: string): string | null {
    const match = url.match(/\/avatars\/(.+)$/);
    return match ? match[1] : null;
}
