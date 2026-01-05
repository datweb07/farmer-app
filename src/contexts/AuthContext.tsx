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
    useRef,
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

    // Track if profile fetch is in progress to avoid duplicate calls
    const fetchingProfileRef = useRef(false);

    /**
     * Fetch and set user profile
     */
    const fetchProfile = useCallback(async (userId: string) => {
        // Skip if already fetching
        if (fetchingProfileRef.current) {
            console.log('🟡 [fetchProfile] Already fetching, skipping duplicate call');
            return;
        }

        fetchingProfileRef.current = true;

        try {
            console.log('🔵 [fetchProfile] Starting fetch for user:', userId);

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            const { data: profileData, error } = await Promise.race([
                fetchPromise,
                timeoutPromise
            ]) as any;

            console.log('🔵 [fetchProfile] Query completed');

            if (error) {
                console.error('🔴 [fetchProfile] Error details:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                });

                // If RLS policy error, show helpful message
                if (error.code === '42501' || error.message?.includes('policy')) {
                    console.error('🔴 [fetchProfile] RLS POLICY ERROR - Run migration 004_fix_profiles_rls.sql!');
                }

                setProfile(null);
                return;
            }

            if (profileData) {
                console.log('✅ [fetchProfile] Profile loaded:', (profileData as UserProfile).username);
                setProfile(profileData as UserProfile);
            } else {
                console.warn('🟡 [fetchProfile] No profile data returned - user may not have profile yet');
                setProfile(null);
            }
        } catch (error: any) {
            console.error('🔴 [fetchProfile] Unexpected error:', error);
            console.error('🔴 [fetchProfile] Error message:', error?.message);

            if (error.message === 'Profile fetch timeout') {
                console.error('🔴 [fetchProfile] TIMEOUT - Check RLS policies and network connection!');
            }

            setProfile(null);
        } finally {
            fetchingProfileRef.current = false;
            console.log('✅ [fetchProfile] Fetch completed, ref reset');
        }
    }, []);

    // Track last user ID to prevent duplicate profile fetches
    const lastUserIdRef = useRef<string | null>(null);

    /**
     * Initialize auth state on mount
     */
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                console.log('🔵 [AuthContext] Initializing auth...');

                // Get initial session
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();

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
                        lastUserIdRef.current = initialSession.user.id;
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

                // Skip INITIAL_SESSION as it's already handled in initAuth
                if (event === 'INITIAL_SESSION') {
                    console.log('🟡 [AuthContext] Skipping INITIAL_SESSION - already handled');
                    return;
                }

                // Prevent duplicate profile fetches for the same user
                if (currentSession?.user && currentSession.user.id === lastUserIdRef.current && event === 'SIGNED_IN') {
                    console.log('🟡 [AuthContext] Skipping duplicate SIGNED_IN for same user');
                    return;
                }

                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    lastUserIdRef.current = currentSession.user.id;
                    await fetchProfile(currentSession.user.id);
                } else {
                    lastUserIdRef.current = null;
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
