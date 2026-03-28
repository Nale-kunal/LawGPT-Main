import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * PublicOnlyRoute — wraps public auth pages (/login, /signup, /forgot-password, etc.)
 */
export default function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const [timedOut, setTimedOut] = useState(false);

    // Safety timeout: if auth takes too long, stop showing the loader
    // to prevent the app from appearing completely frozen. 
    useEffect(() => {
        if (!isLoading) return;
        const timer = setTimeout(() => {
            setTimedOut(true);
        }, 8000); 
        return () => clearTimeout(timer);
    }, [isLoading]);

    if (isLoading && !timedOut) {
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
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
