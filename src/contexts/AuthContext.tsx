// ============================================
// Authentication Context
// ============================================
// Global authentication state management
// Provides auth state and methods to entire app
// ============================================

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/supabase';
import type { UserProfile, UpdateProfileData } from '../lib/auth/auth.types';
import * as authService from '../lib/auth/auth.service';

// ============================================
// Context Types
// ============================================

interface AuthContextType {
    // State
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;

    // Methods
    signUp: (username: string, password: string, phoneNumber: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    signIn: (username: string, password: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    signOut: () => Promise<void>;
    updateProfile: (data: UpdateProfileData) => Promise<{
        success: boolean;
        error?: string;
    }>;
    refreshProfile: () => Promise<void>;
}

// ============================================
// Create Context
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Auth Provider Component
// ============================================

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * Fetch and set user profile
     */
    const fetchProfile = useCallback(async (userId: string) => {
        try {
            console.log('🔵 [fetchProfile] Fetching profile for user:', userId);
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('🔴 [fetchProfile] Error:', error);
                setProfile(null);
                return;
            }

            if (profileData) {
                console.log('✅ [fetchProfile] Profile loaded:', (profileData as UserProfile).username);
                setProfile(profileData as UserProfile);
            } else {
                console.warn('🟡 [fetchProfile] No profile data returned');
                setProfile(null);
            }
        } catch (error) {
            console.error('🔴 [fetchProfile] Unexpected error:', error);
            setProfile(null);
        }
    }, []);

    /**
     * Initialize auth state on mount
     */
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                console.log('🔵 [AuthContext] Initializing auth...');

                // Get initial session with timeout
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session timeout')), 30000)
                );

                const { data: { session: initialSession }, error } = await Promise.race([
                    sessionPromise,
                    timeoutPromise
                ]) as any;

                if (error) {
                    console.error('🔴 [AuthContext] Session error:', error);
                    if (mounted) {
                        setLoading(false);
                    }
                    return;
                }

                console.log('🔵 [AuthContext] Session loaded:', initialSession ? 'authenticated' : 'not authenticated');

                if (mounted) {
                    setSession(initialSession);
                    setUser(initialSession?.user ?? null);

                    if (initialSession?.user) {
                        console.log('🔵 [AuthContext] Fetching profile...');
                        await fetchProfile(initialSession.user.id);
                    }

                    setLoading(false);
                    console.log('✅ [AuthContext] Auth initialized successfully');
                }
            } catch (err) {
                console.error('🔴 [AuthContext] Init error:', err);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, currentSession: Session | null) => {
                console.log('🔵 [AuthContext] Auth state changed:', event);

                if (!mounted) return;

                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    await fetchProfile(currentSession.user.id);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        // Cleanup subscription on unmount
        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    /**
     * Sign up new user
     */
    const signUp = async (username: string, password: string, phoneNumber: string) => {
        try {
            const result = await authService.signUp({ username, password, phoneNumber });

            if (result.error) {
                return { success: false, error: result.error.message };
            }

            // Auth state will be updated via onAuthStateChange
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: 'Đã xảy ra lỗi không mong muốn',
            };
        }
    };

    /**
     * Sign in existing user
     */
    const signIn = async (username: string, password: string) => {
        try {
            const result = await authService.signIn({ username, password });

            if (result.error) {
                return { success: false, error: result.error.message };
            }

            // Auth state will be updated via onAuthStateChange
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: 'Đã xảy ra lỗi không mong muốn',
            };
        }
    };

    /**
     * Sign out current user
     */
    const signOut = async () => {
        try {
            await authService.signOut();
            // Auth state will be updated via onAuthStateChange
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    /**
     * Update user profile
     */
    const updateProfile = async (data: UpdateProfileData) => {
        try {
            const result = await authService.updateProfile(data);

            if (result.error) {
                return { success: false, error: result.error.message };
            }

            if (result.data) {
                setProfile(result.data);
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: 'Đã xảy ra lỗi không mong muốn',
            };
        }
    };

    /**
     * Refresh profile data
     */
    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    // Context value
    const value: AuthContextType = {
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// useAuth Hook
// ============================================

/**
 * Hook to access authentication context
 * Must be used within AuthProvider
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
