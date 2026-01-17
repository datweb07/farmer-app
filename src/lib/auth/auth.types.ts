// ============================================
// Authentication TypeScript Types
// ============================================
// Type definitions for authentication system
// ============================================

import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

// User Profile type from database
export type UserProfile = Database['public']['Tables']['profiles']['Row'];

// User role types
export type UserRole = 'farmer' | 'business';

// Role display names
export const UserRoleNames: Record<UserRole, string> = {
    farmer: 'Nông dân',
    business: 'Doanh nghiệp',
};

// Organization type from database
export type Organization = Database['public']['Tables']['organizations']['Row'];

// Sign up data required from user
export interface SignUpData {
    username: string;
    password: string;
    phoneNumber: string;
    role?: UserRole; // Optional, defaults to 'farmer'
}

// Sign in data required from user
export interface SignInData {
    username: string;
    password: string;
}

// Password reset - request reset code
export interface RequestPasswordResetData {
    phoneNumber: string;
}

// Password reset - verify code
export interface VerifyResetCodeData {
    phoneNumber: string;
    code: string;
}

// Password reset - reset with code
export interface ResetPasswordData {
    phoneNumber: string;
    code: string;
    newPassword: string;
}

// Update profile data
export interface UpdateProfileData {
    phone_number?: string;
    organization_id?: string | null;
}

// Authentication state
export interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
}

// Auth error types
export interface AuthError {
    message: string;
    code?: string;
}

// Auth response types
export interface AuthResponse<T = void> {
    data: T | null;
    error: AuthError | null;
}

// Validation error
export interface ValidationError {
    field: string;
    message: string;
}
