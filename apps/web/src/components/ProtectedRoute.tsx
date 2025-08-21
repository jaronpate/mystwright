import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../context/user-context';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, tokenSet, loading } = useUserContext();
    const location = useLocation();

    // Show loading while checking authentication
    if (loading) {
        return <div>Loading...</div>;
    }

    // Check if user is authenticated
    const isAuthenticated = user && tokenSet && tokenSet.expires_at > new Date();

    if (!isAuthenticated) {
        // Redirect to login with the current path as state
        // so we can redirect back after successful login
        return <Navigate 
            to="/login" 
            state={{ from: location.pathname }} 
            replace 
        />;
    }

    return <>{children}</>;
}
