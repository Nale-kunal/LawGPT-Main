import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getApiUrl, apiFetch } from '@/lib/api';

// Minimal Google "G" logo SVG — no external dependency
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Signup = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryEmail = searchParams.get('email') || '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateEmail = (location.state as any)?.email || '';
  const preFilledEmail = queryEmail || stateEmail;

  const [name, setName] = useState('');
  const [email, setEmail] = useState(preFilledEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<{ name: string; email: string; password: string } | null>(null);
  const { register, isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        name,
        email,
        password,
        role: 'lawyer'
      });

      if (result.success) {
        toast({
          title: "Registration Successful",
          description: "Welcome! Redirecting to dashboard...",
        });
        navigate('/dashboard', { replace: true });
      } else if (result.errorCode === 'ACCOUNT_DELETED') {
        // Show deleted account confirmation dialog
        setPendingFormData({ name, email, password });
        setShowDeletedDialog(true);
      } else {
        toast({
          title: "Registration Failed",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Error",
        description: "An error occurred during registration.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateAccount = async () => {
    if (!pendingFormData) return;
    setIsReactivating(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/reactivate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pendingFormData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reactivate account');
      }

      await refreshUser();
      setShowDeletedDialog(false);
      toast({
        title: "Account Reactivated",
        description: "Welcome back! Your account has been reactivated.",
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast({
        title: "Reactivation Failed",
        description: error instanceof Error ? error.message : "Unable to reactivate account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await fetch(getApiUrl('/api/v1/health'));
    } catch {
      // proceed anyway
    }
    window.location.href = getApiUrl('/api/v1/auth/google?action=signup');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Scale className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join Juriq to manage your legal practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Raj Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="advocate@lawfirm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isGoogleLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>
          {/* ── Google OAuth ─────────────────────────────────────────── */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || isGoogleLoading}
          >
            {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          <div className="mt-4 text-center text-sm">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </div>
        </CardContent>
      </Card>

      {/* Deleted Account Dialog */}
      <Dialog open={showDeletedDialog} onOpenChange={setShowDeletedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <DialogTitle>Account Previously Deleted</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              This email address belongs to a previously deleted account.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md text-sm">
            <p className="text-muted-foreground">
              Would you like to reactivate your old account using the new details you just entered? Your previous data will be cleared and you'll go through onboarding again.
            </p>
          </div>
          <div className="bg-destructive/10 border border-destructive rounded-md p-4 text-sm flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">⚠️ All previous data has been permanently deleted</p>
              <p className="text-destructive/80 mt-1">
                All cases, clients, documents, invoices, and profile data from this account have been wiped and cannot be recovered.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeletedDialog(false)}
              className="w-full sm:w-auto"
              disabled={isReactivating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReactivateAccount}
              className="w-full sm:w-auto"
              disabled={isReactivating}
            >
              {isReactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Signup;
