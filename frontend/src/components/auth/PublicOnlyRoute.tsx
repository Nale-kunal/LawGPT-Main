import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * PublicOnlyRoute — wraps public auth pages (/login, /signup, /forgot-password, etc.)
 */
export default function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

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

    if (isAuthenticated) {
        // Enforce hard redirects (History Stack Elimination via Browser API)
        window.location.replace('/dashboard');
        return null;
    }

    return <>{children}</>;
}
