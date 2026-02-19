import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [deletedEmail, setDeletedEmail] = useState('');
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle redirect in useEffect to prevent flicker
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Check for two-factor authentication requirement
      const requiresTwoStep = user?.security?.twoFactorEnabled && user?.emailVerified === false;
      if (requiresTwoStep) {
        navigate('/verification-pending', { replace: true, state: { email: user?.email } });
      } else {
        // Always redirect to dashboard - onboarding overlay will appear if needed
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  // Return null when authenticated to prevent flicker
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast({
          title: "Login Successful",
          description: "Welcome to LegalPro!",
        });
      } else {
        // Check for ACCOUNT_DELETED error code
        if (result.errorCode === 'ACCOUNT_DELETED') {
          setDeletedEmail(email);
          setShowDeletedDialog(true);
        } else {
          toast({
            title: "Login Failed",
            description: result.error || "Please check your credentials and try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewAccount = () => {
    setShowDeletedDialog(false);
    // Navigate to signup with email as query parameter
    navigate(`/signup?email=${encodeURIComponent(deletedEmail)}`);
  };

  return (
    <div className="min-h-screen legal-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-professional">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Scale className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">LegalPro</CardTitle>
          <CardDescription>
            Professional Legal Case Management System for Indian Law Firms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="advocate@lawfirm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm space-y-2">
            <div>
              <Link to="/forgot-password" className="text-primary hover:underline">Forgot your password?</Link>
            </div>
            <div>
              Don't have an account? <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deleted User Dialog */}
      <Dialog open={showDeletedDialog} onOpenChange={setShowDeletedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <DialogTitle>Account Deleted</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              This account was deleted previously.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md text-sm">
            <p className="text-muted-foreground">
              You can create a new account using the same email address if you'd like to continue using LawGPT.
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
            >
              OK
            </Button>
            <Button
              onClick={handleCreateNewAccount}
              className="w-full sm:w-auto"
            >
              Create New Account Using Same Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;