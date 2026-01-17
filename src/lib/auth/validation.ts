// ============================================
// Input Validation Utilities
// ============================================
// Client-side validation for authentication forms
// ============================================

import type { ValidationError } from './auth.types';

/**
 * Validates username format
 * Rules:
 * - 3-20 characters
 * - Alphanumeric and underscore only
 * - Cannot start with number
 */
export function validateUsername(username: string): ValidationError | null {
    if (!username || username.trim().length === 0) {
        return { field: 'username', message: 'Tên đăng nhập không được để trống' };
    }

    if (username.length < 3) {
        return { field: 'username', message: 'Tên đăng nhập phải có ít nhất 3 ký tự' };
    }

    if (username.length > 20) {
        return { field: 'username', message: 'Tên đăng nhập không được quá 20 ký tự' };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
        return {
            field: 'username',
            message: 'Tên đăng nhập chỉ được chứa chữ cái, số và gạch dưới, phải bắt đầu bằng chữ cái',
        };
    }

    return null;
}

/**
 * Validates password strength
 * Rules:
 * - Minimum 8 characters
 * - Must contain at least one letter
 * - Must contain at least one number
 */
export function validatePassword(password: string): ValidationError | null {
    if (!password || password.length === 0) {
        return { field: 'password', message: 'Mật khẩu không được để trống' };
    }

    if (password.length < 8) {
        return { field: 'password', message: 'Mật khẩu phải có ít nhất 8 ký tự' };
    }

    if (!/[a-zA-Z]/.test(password)) {
        return { field: 'password', message: 'Mật khẩu phải chứa ít nhất một chữ cái' };
    }

    if (!/[0-9]/.test(password)) {
        return { field: 'password', message: 'Mật khẩu phải chứa ít nhất một chữ số' };
    }

    return null;
}

/**
 * Validates confirmation password
 * Rules:
 * - Must not be empty
 * - Must match the original password
 */
export function validateConfirmPassword(password: string, confirmPassword: string): ValidationError | null {
    if (!confirmPassword || confirmPassword.length === 0) {
        return { field: 'confirmPassword', message: 'Xác nhận mật khẩu không được để trống' };
    }

    if (password !== confirmPassword) {
        return { field: 'confirmPassword', message: 'Mật khẩu xác nhận không khớp' };
    }

    return null;
}

/**
 * Validates phone number format
 * Supports Vietnamese phone numbers
 * Format: +84xxxxxxxxx hoặc 0xxxxxxxxx
 */
export function validatePhoneNumber(phoneNumber: string): ValidationError | null {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
        return { field: 'phoneNumber', message: 'Số điện thoại không được để trống' };
    }

    // Remove spaces and dashes
    const cleaned = phoneNumber.replace(/[\s-]/g, '');

    // Check Vietnamese phone number format
    const vnPhoneRegex = /^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/;

    if (!vnPhoneRegex.test(cleaned)) {
        return {
            field: 'phoneNumber',
            message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam',
        };
    }

    return null;
}

/**
 * Normalize Vietnamese phone number to international format
 * Converts 0xxxxxxxxx to +84xxxxxxxxx
 */
export function normalizePhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[\s-]/g, '');

    if (cleaned.startsWith('0')) {
        return '+84' + cleaned.substring(1);
    }

    if (cleaned.startsWith('84')) {
        return '+' + cleaned;
    }

    if (cleaned.startsWith('+84')) {
        return cleaned;
    }

    return phoneNumber;
}

/**
 * Get password strength level
 */
export function getPasswordStrength(password: string): {
    level: 'weak' | 'medium' | 'strong';
    score: number;
} {
    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) return { level: 'weak', score };
    if (score <= 4) return { level: 'medium', score };
    return { level: 'strong', score };
}

/**
 * Validate all sign up data
 */
export function validateSignUpData(data: {
    username: string;
    password: string;
    phoneNumber: string;
}): ValidationError[] {
    const errors: ValidationError[] = [];

    const usernameError = validateUsername(data.username);
    if (usernameError) errors.push(usernameError);

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.push(passwordError);

    const phoneError = validatePhoneNumber(data.phoneNumber);
    if (phoneError) errors.push(phoneError);

    return errors;
}

/**
 * Validate all sign up data with confirmation password
 */
export function validateSignUpDataWithConfirmation(data: {
    username: string;
    password: string;
    confirmPassword: string;
    phoneNumber: string;
}): ValidationError[] {
    const errors: ValidationError[] = [];

    const usernameError = validateUsername(data.username);
    if (usernameError) errors.push(usernameError);

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.push(passwordError);

    const confirmPasswordError = validateConfirmPassword(data.password, data.confirmPassword);
    if (confirmPasswordError) errors.push(confirmPasswordError);

    const phoneError = validatePhoneNumber(data.phoneNumber);
    if (phoneError) errors.push(phoneError);

    return errors;
}

/**
 * Validate sign in data
 */
export function validateSignInData(data: {
    username: string;
    password: string;
}): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.username || data.username.trim().length === 0) {
        errors.push({ field: 'username', message: 'Tên đăng nhập không được để trống' });
    }

    if (!data.password || data.password.length === 0) {
        errors.push({ field: 'password', message: 'Mật khẩu không được để trống' });
    }

    return errors;
}

/**
 * Validate reset code format
 * Must be exactly 6 digits
 */
export function validateResetCode(code: string): ValidationError | null {
    if (!code || code.trim().length === 0) {
        return { field: 'code', message: 'Mã xác nhận không được để trống' };
    }

    if (!/^\d{6}$/.test(code)) {
        return {
            field: 'code',
            message: 'Mã xác nhận phải là 6 chữ số',
        };
    }

    return null;
}