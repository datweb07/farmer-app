// ============================================
// Protected Route Component
// ============================================
// Guards routes that require authentication
// Redirects to login if not authenticated
// ============================================

import { type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Đang kiểm tra đăng nhập...</p>
                </div>
            </div>
        );
    }

    // If not authenticated, show fallback (login prompt)
    if (!user) {
        return fallback || null;
    }

    // User is authenticated, render protected content
    return <>{children}</>;
}
