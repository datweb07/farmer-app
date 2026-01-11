// ============================================
// Authentication Service
// ============================================
// Complete auth service for Supabase authentication
// Handles signup, signin, signout, profile management
// ============================================

import { supabase } from '../supabase/supabase';
import type {
    SignUpData,
    SignInData,
    UpdateProfileData,
    UserProfile,
    AuthResponse,
} from './auth.types';
import { normalizePhoneNumber } from './validation';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Sign up a new user with username, password, and phone
 * Creates auth user and profile in one transaction
 */
export async function signUp(data: SignUpData): Promise<
    AuthResponse<{
        user: User;
        session: Session;
        profile: UserProfile;
    }>
> {
    try {
        console.log('🔵 [SignUp] Starting signup process for username:', data.username);

        // First check if username is available
        console.log('🔵 [SignUp] Checking username availability...');
        const { data: isAvailable, error: checkError } = await supabase
            .rpc('is_username_available', { check_username: data.username } as never);

        if (checkError) {
            console.error('🔴 [SignUp] Username check error:', checkError);
            return {
                data: null,
                error: {
                    message: `Không thể kiểm tra tên đăng nhập: ${checkError.message}`,
                    code: checkError.code,
                },
            };
        }

        console.log('🔵 [SignUp] Username available:', isAvailable);

        if (!isAvailable) {
            console.warn('🟡 [SignUp] Username already taken');
            return {
                data: null,
                error: {
                    message: 'Tên đăng nhập đã tồn tại',
                    code: 'username_taken',
                },
            };
        }

        // Normalize phone number
        const normalizedPhone = normalizePhoneNumber(data.phoneNumber);
        console.log('🔵 [SignUp] Normalized phone:', normalizedPhone);

        // Create auth user with pseudo-email (username@example.com)
        console.log('🔵 [SignUp] Creating auth user...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: `${data.username}@example.com`,
            password: data.password,
            options: {
                data: {
                    username: data.username,
                    phone_number: normalizedPhone,
                    role: data.role || 'farmer', // Default to farmer if not specified
                },
            },
        });

        if (authError) {
            console.error('🔴 [SignUp] Auth error:', authError);
            return {
                data: null,
                error: {
                    message: getAuthErrorMessage(authError.message),
                    code: authError.code,
                },
            };
        }

        if (!authData.user || !authData.session) {
            console.error('🔴 [SignUp] No user or session returned');
            return {
                data: null,
                error: {
                    message: 'Đăng ký thất bại. Vui lòng thử lại',
                    code: 'signup_failed',
                },
            };
        }

        console.log('🔵 [SignUp] Auth user created, fetching profile...');

        // Fetch the created profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            console.error('🔴 [SignUp] Profile error:', profileError);
            // Auth user created but profile failed - this shouldn't happen with trigger
            return {
                data: null,
                error: {
                    message: `Đăng ký thành công nhưng không thể tạo hồ sơ: ${profileError?.message || 'Unknown error'}`,
                    code: 'profile_creation_failed',
                },
            };
        }

        console.log('✅ [SignUp] Signup successful for user:', authData.user.id);

        return {
            data: {
                user: authData.user,
                session: authData.session,
                profile,
            },
            error: null,
        };
    } catch (err) {
        console.error('🔴 [SignUp] Unexpected error:', err);
        return {
            data: null,
            error: {
                message: `Đã xảy ra lỗi không mong muốn: ${err instanceof Error ? err.message : String(err)}`,
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Sign in existing user with username and password
 */
export async function signIn(
    data: SignInData
): Promise<AuthResponse<{ user: User; session: Session; profile: UserProfile }>> {
    try {
        // Sign in with pseudo-email
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: `${data.username}@example.com`,
            password: data.password,
        });

        if (authError) {
            return {
                data: null,
                error: {
                    message: getAuthErrorMessage(authError.message),
                    code: authError.code,
                },
            };
        }

        if (!authData.user || !authData.session) {
            return {
                data: null,
                error: {
                    message: 'Đăng nhập thất bại',
                    code: 'signin_failed',
                },
            };
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            return {
                data: null,
                error: {
                    message: 'Không tìm thấy thông tin người dùng',
                    code: 'profile_not_found',
                },
            };
        }

        return {
            data: {
                user: authData.user,
                session: authData.session,
                profile,
            },
            error: null,
        };
    } catch (err) {
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResponse<void>> {
    try {
        console.log('🔵 [SignOut] Starting sign out process...');
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('🔴 [SignOut] Sign out error:', error);
            return {
                data: null,
                error: {
                    message: `Đăng xuất thất bại: ${error.message}`,
                    code: error.code,
                },
            };
        }

        console.log('✅ [SignOut] Sign out successful');
        return { data: null, error: null };
    } catch (err) {
        console.error('🔴 [SignOut] Unexpected error:', err);
        return {
            data: null,
            error: {
                message: `Đã xảy ra lỗi không mong muốn: ${err instanceof Error ? err.message : String(err)}`,
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthResponse<User>> {
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            return {
                data: null,
                error: {
                    message: 'Không thể lấy thông tin người dùng',
                    code: error.code,
                },
            };
        }

        return { data: user, error: null };
    } catch (err) {
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<AuthResponse<UserProfile>> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                data: null,
                error: {
                    message: 'Chưa đăng nhập',
                    code: 'not_authenticated',
                },
            };
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return {
                data: null,
                error: {
                    message: 'Không tìm thấy thông tin người dùng',
                    code: 'profile_not_found',
                },
            };
        }

        return { data: profile, error: null };
    } catch (err) {
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Update current user's profile
 */
export async function updateProfile(
    updates: UpdateProfileData
): Promise<AuthResponse<UserProfile>> {
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return {
                data: null,
                error: {
                    message: 'Chưa đăng nhập',
                    code: 'not_authenticated',
                },
            };
        }

        // Normalize phone if provided
        const normalizedUpdates = { ...updates };
        if (updates.phone_number) {
            normalizedUpdates.phone_number = normalizePhoneNumber(updates.phone_number);
        }

        const { data: profile, error: updateError } = await supabase
            .from('profiles')
            .update(normalizedUpdates as never)
            .eq('id', user.id)
            .select()
            .single();

        if (updateError || !profile) {
            return {
                data: null,
                error: {
                    message: 'Không thể cập nhật thông tin',
                    code: updateError?.code || 'update_failed',
                },
            };
        }

        return { data: profile, error: null };
    } catch (err) {
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Get current session
 */
export async function getSession(): Promise<AuthResponse<Session>> {
    try {
        const {
            data: { session },
            error,
        } = await supabase.auth.getSession();

        if (error) {
            return {
                data: null,
                error: {
                    message: 'Không thể lấy phiên đăng nhập',
                    code: error.code,
                },
            };
        }

        return { data: session, error: null };
    } catch (err) {
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Helper: Convert Supabase error to user-friendly Vietnamese message
 */
function getAuthErrorMessage(error: string): string {
    const errorMap: Record<string, string> = {
        'Invalid login credentials': 'Tên đăng nhập hoặc mật khẩu không đúng',
        'Email not confirmed': 'Email chưa được xác nhận',
        'User already registered': 'Tài khoản đã tồn tại',
        'Password should be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự',
        'Unable to validate email address': 'Email không hợp lệ',
        'Signup requires a valid password': 'Mật khẩu không hợp lệ',
    };

    return errorMap[error] || 'Đã xảy ra lỗi. Vui lòng thử lại';
}

// ============================================
// Password Reset Functions
// ============================================

/**
 * Request password reset - generates and stores a verification code
 * In development, the code is logged to console
 * In production, this should trigger an SMS to the user's phone
 */
export async function requestPasswordReset(
    phoneNumber: string
): Promise<AuthResponse<{ message: string; code?: string }>> {
    try {
        console.log('🔵 [ResetPassword] Requesting password reset for phone:', phoneNumber);

        // Normalize phone number
        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        // Call database function to find user and generate code
        const { data, error } = await supabase
            .rpc('request_password_reset', {
                reset_phone_number: normalizedPhone
            } as never) as { data: Array<{ code: string; expires_at: string }> | null; error: any };

        if (error) {
            console.error('🔴 [ResetPassword] Database error:', error);
            return {
                data: null,
                error: {
                    message: 'Đã xảy ra lỗi. Vui lòng thử lại',
                    code: 'database_error',
                },
            };
        }

        // If no data returned, user not found
        if (!data || data.length === 0) {
            console.error('🔴 [ResetPassword] User not found');
            return {
                data: null,
                error: {
                    message: 'Không tìm thấy tài khoản với số điện thoại này',
                    code: 'user_not_found',
                },
            };
        }

        const resetData = data[0];
        console.log('✅ [ResetPassword] Reset code generated:', resetData.code);
        console.log('🔵 [ResetPassword] Code expires at:', resetData.expires_at);

        // In development, return the code for testing
        // In production, send SMS and don't return code
        const isDevelopment = import.meta.env.DEV;

        return {
            data: {
                message: 'Mã xác nhận đã được gửi đến số điện thoại của bạn',
                ...(isDevelopment && { code: resetData.code }), // Only include code in development
            },
            error: null,
        };
    } catch (err) {
        console.error('🔴 [ResetPassword] Unexpected error:', err);
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Verify reset code - checks if code is valid, not expired, and not used
 */
export async function verifyResetCode(
    phoneNumber: string,
    code: string
): Promise<AuthResponse<{ userId: string }>> {
    try {
        console.log('🔵 [VerifyCode] Verifying reset code for phone:', phoneNumber);

        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        // Call database function to verify code
        const { data, error } = await supabase
            .rpc('verify_password_reset_code', {
                reset_phone_number: normalizedPhone,
                reset_code: code,
            } as never) as { data: Array<{ valid: boolean; user_id: string }> | null; error: any };

        if (error) {
            console.error('🔴 [VerifyCode] Database error:', error);
            return {
                data: null,
                error: {
                    message: 'Đã xảy ra lỗi. Vui lòng thử lại',
                    code: 'database_error',
                },
            };
        }

        // Check if code is valid
        if (!data || data.length === 0 || !data[0].valid) {
            console.error('🔴 [VerifyCode] Invalid or expired code');
            return {
                data: null,
                error: {
                    message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn',
                    code: 'invalid_code',
                },
            };
        }

        console.log('✅ [VerifyCode] Code verified successfully');

        return {
            data: { userId: data[0].user_id! },
            error: null,
        };
    } catch (err) {
        console.error('🔴 [VerifyCode] Unexpected error:', err);
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

/**
 * Reset password with verified code
 */
export async function resetPasswordWithCode(
    phoneNumber: string,
    code: string,
    newPassword: string
): Promise<AuthResponse<{ message: string }>> {
    try {
        console.log('🔵 [ResetPassword] Resetting password with code');

        // First verify the code
        const verifyResult = await verifyResetCode(phoneNumber, code);
        if (verifyResult.error || !verifyResult.data) {
            return {
                data: null,
                error: verifyResult.error,
            };
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        // Call database function to verify and get username
        const { data: verifyData } = await supabase
            .rpc('verify_password_reset_code', {
                reset_phone_number: normalizedPhone,
                reset_code: code,
            } as never) as { data: Array<{ valid: boolean; user_id: string; username: string }> | null };

        if (!verifyData || verifyData.length === 0 || !verifyData[0].username) {
            return {
                data: null,
                error: {
                    message: 'Không tìm thấy thông tin người dùng',
                    code: 'user_not_found',
                },
            };
        }

        // For now, we'll use a workaround: update via SQL using the database function

        // Update password via auth.users table (requires SECURITY DEFINER function)
        const { error: updateError } = await supabase.rpc('update_user_password' as any, {
            p_user_id: verifyResult.data.userId,
            p_new_password: newPassword,
        } as any);

        if (updateError) {
            console.error('🔴 [ResetPassword] Failed to update password:', updateError);
            // Fallback: Try to update using updateUser (won't work without session)
            // This is a limitation - in production, you'd need Supabase admin API
            return {
                data: null,
                error: {
                    message: 'Lỗi cập nhật mật khẩu. Vui lòng liên hệ hỗ trợ.',
                    code: 'update_failed',
                },
            };
        }

        // Mark code as used using database function
        await supabase.rpc('mark_reset_code_used', {
            reset_phone_number: normalizedPhone,
            reset_code: code,
        } as never);

        console.log('✅ [ResetPassword] Password reset successfully');

        return {
            data: {
                message: 'Mật khẩu đã được cập nhật thành công',
            },
            error: null,
        };
    } catch (err) {
        console.error('🔴 [ResetPassword] Unexpected error:', err);
        return {
            data: null,
            error: {
                message: 'Đã xảy ra lỗi không mong muốn',
                code: 'unknown_error',
            },
        };
    }
}

// ============================================
// Avatar Management Functions
// ============================================

/**
 * Upload user avatar
 */
export async function uploadAvatar(file: File): Promise<{
    success: boolean;
    avatarUrl?: string;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${timestamp}.${fileExt}`;

        // Delete old avatar if exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single() as { data: { avatar_url: string | null } | null };

        if (profile?.avatar_url) {
            const oldPath = profile.avatar_url.split('/avatars/')[1];
            if (oldPath) {
                await supabase.storage.from('avatars').remove([oldPath]);
            }
        }

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { success: false, error: 'Không thể tải ảnh lên' };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl } as never)
            .eq('id', user.id);

        if (updateError) {
            console.error('Profile update error:', updateError);
            return { success: false, error: 'Không thể cập nhật profile' };
        }

        return { success: true, avatarUrl: publicUrl };
    } catch (error: any) {
        console.error('Unexpected error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete user avatar
 */
export async function deleteAvatar(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        // Get current avatar
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single() as { data: { avatar_url: string | null } | null };

        if (!profile?.avatar_url) {
            return { success: true }; // No avatar to delete
        }

        // Extract path from URL
        const path = profile.avatar_url.split('/avatars/')[1];
        if (path) {
            await supabase.storage.from('avatars').remove([path]);
        }

        // Update profile to remove avatar URL
        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null } as never)
            .eq('id', user.id);

        if (error) {
            console.error('Profile update error:', error);
            return { success: false, error: 'Không thể cập nhật profile' };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error:', error);
        return { success: false, error: error.message };
    }
}
