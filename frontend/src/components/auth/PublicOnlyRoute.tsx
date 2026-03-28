import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * PublicOnlyRoute — wraps public auth pages (/login, /signup, /forgot-password, etc.)
 *
 * Behaviour:
 *  - While auth state is loading  → show full-screen spinner (hides any stale page flash)
 *  - If user IS authenticated     → immediately redirect to /dashboard (replace, removes this page from history)
 *  - If user is NOT authenticated → render children as normal
 *
 * This is the symmetrical counterpart to RequireAuth.
 * It ensures that once a user is authenticated they can NEVER reach a public auth page
 * via back-button, direct URL, or any other mechanism without explicitly logging out first.
 */
export default function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    // While we are still determining auth state, always show a blank loader.
    // This prevents any flash of the login page (or landing page) for authenticated users.
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Loading…</p>
                </div>
            </div>
        );
    }

    // User is authenticated — send them to the dashboard and replace this history entry
    // so the back button does NOT bring them back here.
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    // Not authenticated — render the public page normally.
    return <>{children}</>;
}
