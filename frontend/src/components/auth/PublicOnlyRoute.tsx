import { useAuth } from '@/contexts/AuthContext';
import JuriqLoader from '../ui/JuriqLoader';

/**
 * PublicOnlyRoute — wraps public auth pages (/login, /signup, /forgot-password, etc.)
 */
export default function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <JuriqLoader size="lg" />
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
