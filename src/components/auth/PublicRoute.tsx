// ============================================
// Public Route Component
// ============================================
// Guards routes that should only be accessible when NOT authenticated
// Redirects to dashboard if already authenticated
// ============================================

import { type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PublicRouteProps {
    children: ReactNode;
    redirectTo?: ReactNode;
}

export function PublicRoute({ children, redirectTo }: PublicRouteProps) {
    const { user, loading } = useAuth();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
                </div>
            </div>
        );
    }

    // If already authenticated, show redirect component (e.g., dashboard)
    if (user && redirectTo) {
        return <>{redirectTo}</>;
    }

    // Not authenticated, render public content (login/register)
    return <>{children}</>;
}
