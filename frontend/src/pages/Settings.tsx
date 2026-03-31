import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Download,
  Upload,
  AlertTriangle,
  Lock
} from 'lucide-react';
import JuriqLoader from '@/components/ui/JuriqLoader';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl, getOAuthUrl, apiFetch } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Inline Google "G" logo — no external dependency
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const defaultNotificationSettings = {
  emailAlerts: true,
  smsAlerts: true,
  pushNotifications: true,
  hearingReminders: true,
  clientUpdates: true,
  billingAlerts: false,
  weeklyReports: true
};

const defaultPreferenceSettings = {
  theme: 'light',
  language: 'en-IN',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR'
};

const defaultSecuritySettings = {
  twoFactorEnabled: false,
  sessionTimeout: '30',
  loginNotifications: true
};

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const { setThemeAndSave } = useTheme();
  const { toast } = useToast();

  // Loading states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isRelinking, setIsRelinking] = useState(false);

  // Dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRelinkDialog, setShowRelinkDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [linkingError, setLinkingError] = useState<{ title: string; message: string } | null>(null);
  const [importData, setImportData] = useState<any>(null);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [deleteData, setDeleteData] = useState({
    password: '',
    confirmation: ''
  });
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    recoveryEmail: '',
    fullName: '',
    barCouncilNumber: '',
    lawFirmName: '',
    practiceAreas: [] as string[],
    courtLevels: [] as string[],
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    country: ''
  });

  // Notification settings
  const [notifications, setNotifications] = useState(defaultNotificationSettings);

  // System preferences
  const [preferences, setPreferences] = useState(defaultPreferenceSettings);

  // Security settings
  const [security, setSecurity] = useState(defaultSecuritySettings);

  // Load user data on mount
  useEffect(() => {
    if (!user) return;
    setProfileData({
      name: user.name || '',
      email: user.email || '',
      recoveryEmail: user.recoveryEmail || '',
      fullName: user.profile?.fullName || '',
      barCouncilNumber: user.profile?.barCouncilNumber || '',
      lawFirmName: user.profile?.lawFirmName || '',
      practiceAreas: user.profile?.practiceAreas || [],
      courtLevels: user.profile?.courtLevels || [],
      phoneNumber: user.profile?.phoneNumber || '',
      address: user.profile?.address || '',
      city: user.profile?.city || '',
      state: user.profile?.state || '',
      country: user.profile?.country || ''
    });
    setNotifications({
      ...defaultNotificationSettings,
      ...(user.notifications || {})
    });

    // Load preferences from user data
    // IMPORTANT: for theme, use localStorage as source of truth (reflects navbar toggle)
    // so we never overwrite a theme the user just set via the header toggle.
    const lsTheme = localStorage.getItem('juriq-theme') as 'light' | 'dark' | 'system' | null;
    const userPreferences = {
      ...defaultPreferenceSettings,
      ...(user.preferences || {}),
      // Theme: prefer localStorage (live) over DB value to avoid overwriting navbar toggle
      theme: lsTheme || user.preferences?.theme || defaultPreferenceSettings.theme,
      // Fallback: if preferences.timezone not set, use profile.timezone
      timezone: user.preferences?.timezone || user.profile?.timezone || defaultPreferenceSettings.timezone,
      // Fallback: if preferences.currency not set, use profile.currency
      currency: user.preferences?.currency || user.profile?.currency || defaultPreferenceSettings.currency,
    };
    setPreferences(userPreferences);
    // Do NOT call setTheme here — ThemeContext already reads localStorage on init.
    // Calling setTheme would overwrite the theme the navbar toggle just set.

    setSecurity({
      ...defaultSecuritySettings,
      ...(user.security || {})
    });
  }, [user]);

  // Handle Google linking redirect results (?linkSuccess=true or ?linkError=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkSuccess = params.get('linkSuccess');
    const linkError = params.get('linkError') || params.get('link_error');
    if (!linkSuccess && !linkError) return;

    window.history.replaceState(null, '', window.location.pathname);

    if (linkSuccess === 'true') {
      const verifySuccess = async () => {
        try {
          // Always refresh user state from server — let the DB state determine linked status.
          // Do not gate this on a condition; if linking succeeded the user object will reflect it.
          await refreshUser();
          toast({ title: 'Google account linked successfully', description: 'You can now sign in with this Google account or your primary email.' });
        } catch {
          toast({ title: 'Link failed', description: 'Google linking verification failed.', variant: 'destructive' });
        }
      };
      verifySuccess();
    } else if (linkError) {
      const msgs: Record<string, string> = {
        SAME_AS_PRIMARY_EMAIL: 'Same as primary email',
        RECOVERY_EMAIL_EXISTS: 'RECOVERY_EMAIL_EXISTS',
        EMAIL_ALREADY_USED: 'Email already used',
        EMAIL_ALREADY_IN_USE: 'This email is already used in another account',
        GOOGLE_ALREADY_LINKED: 'A Google account is already linked to your account.',
        GOOGLE_ACCOUNT_ALREADY_IN_USE: 'This Google account is already linked to a different Juriq account.',
        EMAIL_MISMATCH: 'The Google account email must match your Juriq account email.',
        STATE_MISMATCH: 'Security check failed. Please try again.',
        SESSION_EXPIRED: 'Your session expired. Please log in and try again.',
        ACCESS_DENIED: 'Google account linking was cancelled.',
        OAUTH_CANCELLED: 'Google login was cancelled.',
        SERVER_ERROR: 'An unexpected error occurred. Please try again.',
        OAUTH_ERROR: 'OAuth failed'
      };
      
      if (linkError === 'RECOVERY_EMAIL_EXISTS') {
        setShowRelinkDialog(true);
      } else {
        toast({
          title: 'Google linking failed',
          description: msgs[linkError] ?? 'Unknown error',
          variant: 'destructive',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    if (!phone.trim()) return true; // Optional field
    const phoneRegex = /^[\d\s+\-()]+$/;
    return phoneRegex.test(phone);
  };

  // Save settings helper
  const saveSettings = async (updates: Record<string, unknown>, successMessage: string, setLoading: (loading: boolean) => void) => {
    setLoading(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/me'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to update settings' }));
        throw new Error(data.error || 'Failed to update settings');
      }

      // Use the response from PUT directly to update user state
      const data = await res.json();
      if (data.user) {
        // Update local state immediately from the response
        setProfileData(prev => ({
          ...prev,
          name: data.user.name || prev.name,
          recoveryEmail: data.user.recoveryEmail !== undefined ? (data.user.recoveryEmail || '') : prev.recoveryEmail,
          lawFirmName: data.user.profile?.lawFirmName || prev.lawFirmName,
          practiceAreas: data.user.profile?.practiceAreas || prev.practiceAreas,
          courtLevels: data.user.profile?.courtLevels || prev.courtLevels,
          phoneNumber: data.user.profile?.phoneNumber || prev.phoneNumber,
          address: data.user.profile?.address || prev.address,
          city: data.user.profile?.city || prev.city,
          state: data.user.profile?.state || prev.state,
          country: data.user.profile?.country || prev.country,
        }));
      }

      // Also refresh from server to sync all state
      await refreshUser();

      toast({
        title: successMessage
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to save settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = () => {
    // Validate email
    if (profileData.email && !validateEmail(profileData.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    // Validate recovery email
    if (profileData.recoveryEmail) {
      if (profileData.recoveryEmail.trim().toLowerCase() === profileData.email.trim().toLowerCase()) {
        toast({
          title: 'Invalid recovery email',
          description: 'Recovery email cannot be the same as your primary email',
          variant: 'destructive'
        });
        return;
      }
      if (!validateEmail(profileData.recoveryEmail)) {
        toast({
          title: 'Invalid recovery email',
          description: 'Please enter a valid recovery email address',
          variant: 'destructive'
        });
        return;
      }
    }

    // Validate phone
    if (profileData.phoneNumber && !validatePhone(profileData.phoneNumber)) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number',
        variant: 'destructive'
      });
      return;
    }

    // Validate required fields
    if (!profileData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your full name',
        variant: 'destructive'
      });
      return;
    }

    const updates: Record<string, unknown> = {
      name: profileData.name.trim(),
      profile: {
        lawFirmName: profileData.lawFirmName.trim(),
        practiceAreas: profileData.practiceAreas,
        courtLevels: profileData.courtLevels,
        phoneNumber: profileData.phoneNumber.trim(),
        address: profileData.address.trim(),
        city: profileData.city.trim(),
        state: profileData.state.trim(),
        country: profileData.country.trim()
      }
    };

    // Only update recovery email if NOT currently linked via Google
    // Use authProviders as the source of truth (same signal as the disabled-field condition)
    if (!user?.authProviders?.includes('google')) {
      updates.recoveryEmail = profileData.recoveryEmail.trim();
    }

    saveSettings(updates, "Profile updated successfully", setIsSavingProfile);
  };

  const handleSaveNotifications = () => {
    saveSettings({ notifications }, "Notification settings updated", setIsSavingNotifications);
  };

  const handleSavePreferences = () => {
    // Apply theme change immediately via ThemeContext AND save to DB
    setThemeAndSave(preferences.theme as 'light' | 'dark' | 'system');
    // Also save all other preferences (language, timezone, dateFormat, currency) to DB
    saveSettings({ preferences }, "Preferences updated", setIsSavingPreferences);
  };

  const handleSaveSecurity = () => {
    saveSettings({ security }, "Security settings updated", setIsSavingSecurity);
  };

  const handleChangePassword = async () => {
    // Validate inputs
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'All fields required',
        description: 'Please fill in all password fields',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 6 characters long',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match',
        variant: 'destructive'
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/change-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to change password' }));
        throw new Error(data.error || 'Failed to change password');
      }

      toast({
        title: 'Password changed successfully'
      });

      // Reset form and close dialog
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordDialog(false);
    } catch (error) {
      toast({
        title: 'Password change failed',
        description: error instanceof Error ? error.message : 'Unable to change password',
        variant: 'destructive'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/export-data'), {
        method: 'GET',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `juriq-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export successful',
        description: 'Your data has been downloaded'
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast({
        title: 'Export failed',
        description: 'Unable to export data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    setShowImportDialog(true);
  };

  const handleProcessImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Validate data structure
        if (!parsed.user || !parsed.data) {
          throw new Error('Invalid backup file format');
        }

        setImportData(parsed);
        setShowImportDialog(true);
      } catch (error) {
        toast({
          title: 'Import failed',
          description: error instanceof Error ? error.message : 'Invalid backup file',
          variant: 'destructive'
        });
      }
    };
    input.click();
  };

  const handleConfirmImport = async () => {
    if (!importData) return;

    setIsImporting(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/import-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Import failed' }));
        throw new Error(data.error || 'Failed to restore data');
      }

      toast({
        title: 'Restoration successful',
        description: 'All backup data has been restored. Refreshing app...',
      });

      // Clear state and close dialog
      setShowImportDialog(false);
      setImportData(null);

      // Force a full page reload to ensure all contexts/states reflect the new data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unable to restore data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Validate inputs
    if (!deleteData.password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password to confirm deletion',
        variant: 'destructive'
      });
      return;
    }

    if (deleteData.confirmation !== 'DELETE') {
      toast({
        title: 'Confirmation required',
        description: 'Please type DELETE to confirm account deletion',
        variant: 'destructive'
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/delete-account'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete account' }));
        throw new Error(data.error || 'Failed to delete account');
      }

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted'
      });

      // Redirect to login after short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      toast({
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'Unable to delete account',
        variant: 'destructive'
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    try {
      await fetch(getApiUrl('/api/v1/health'));
    } catch {
      // ignore
    }
    // Use replace() so the OAuth initiation URL is NOT added to browser history.
    // This ensures that hitting 'Back' from Google's screen returns to Settings,
    // rather than hitting the link-initiation endpoint again.
    window.location.replace(getOAuthUrl('/api/v1/auth/google/link'));
  };

  const handleRelinkGoogle = async () => {
    setIsRelinking(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/google/relink'), { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to replace recovery email');
      }
      setShowRelinkDialog(false);
      await refreshUser();
      toast({ title: 'Recovery email updated', description: 'Your new recovery email has been set.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update recovery email.',
        variant: 'destructive',
      });
    } finally {
      setIsRelinking(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setIsUnlinking(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/google/unlink'), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to unlink Google account');
      }
      // Immediately clear local state so the field goes blank right away
      // without waiting for the full refreshUser → useEffect → re-render cycle
      setProfileData(prev => ({ ...prev, recoveryEmail: '' }));
      await refreshUser();
      toast({ title: 'Recovery email unlinked', description: 'Your Google recovery email has been removed.' });
    } catch (error) {
      toast({
        title: 'Unlink failed',
        description: error instanceof Error ? error.message : 'Unable to unlink Google account.',
        variant: 'destructive',
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </div>

      {/* Profile Settings */}
      <Card className="shadow-card-custom">
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <User className="h-4 w-4 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-[10px]">Update your personal and professional details</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 space-y-2">
          {user?.immutableFieldsLocked && (
            <div className="p-2 border rounded-lg bg-muted/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Immutable Fields (Set During Onboarding)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Full Name</Label>
                  <p className="text-xs font-medium">{profileData.fullName || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Bar Council Number</Label>
                  <p className="text-xs font-medium">{profileData.barCouncilNumber || 'Not set'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="name" className="text-xs">Display Name *</Label>
              <Input id="name" value={profileData.name || ''} onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))} placeholder="Your display name" disabled={isSavingProfile} className="h-7 text-xs mt-0.5" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Primary Email Address</Label>
              <Input id="email" type="email" value={profileData.email || ''} disabled placeholder="your@email.com" className="bg-muted h-7 text-xs mt-0.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="recoveryEmail" className="text-xs">
                Recovery Email (Optional) {user?.authProviders?.includes('google') && <span className="text-[10px] text-green-500 ml-1 font-semibold flex items-center gap-0.5 inline-flex"><Shield className="h-2.5 w-2.5" /> Google Verified</span>}
              </Label>
              <Input
                id="recoveryEmail"
                type="email"
                value={profileData.recoveryEmail || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, recoveryEmail: e.target.value }))}
                placeholder="backup@email.com"
                disabled={isSavingProfile || !!user?.authProviders?.includes('google')}
                className={`h-7 text-xs mt-0.5 ${user?.authProviders?.includes('google') ? 'bg-muted/50 cursor-not-allowed font-medium' : ''}`}
              />
              {user?.authProviders?.includes('google') && (
                <p className="text-[9px] text-muted-foreground mt-0.5">Managed via Security & Privacy settings</p>
              )}
            </div>
            <div>
              <Label htmlFor="phoneNumber" className="text-xs">Phone Number</Label>
              <Input id="phoneNumber" value={profileData.phoneNumber || ''} onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))} placeholder="+91 98765 43210" disabled={isSavingProfile} className="h-7 text-xs mt-0.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="lawFirmName" className="text-xs">Law Firm/Organization</Label>
              <Input id="lawFirmName" value={profileData.lawFirmName || ''} onChange={(e) => setProfileData(prev => ({ ...prev, lawFirmName: e.target.value }))} placeholder="Your law firm name" disabled={isSavingProfile} className="h-7 text-xs mt-0.5" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Practice Areas</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {['Civil', 'Criminal', 'Corporate', 'Family', 'Tax', 'Property'].map(area => (
                <Button key={area} type="button" variant={profileData.practiceAreas.includes(area) ? 'default' : 'outline'} size="sm" className="h-6 text-xs px-2"
                  onClick={() => setProfileData(prev => ({ ...prev, practiceAreas: prev.practiceAreas.includes(area) ? prev.practiceAreas.filter(a => a !== area) : [...prev.practiceAreas, area] }))}
                  disabled={isSavingProfile}>{area}</Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Court Levels</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {['District Court', 'High Court', 'Supreme Court'].map(level => (
                <Button key={level} type="button" variant={profileData.courtLevels.includes(level) ? 'default' : 'outline'} size="sm" className="h-6 text-xs px-2"
                  onClick={() => setProfileData(prev => ({ ...prev, courtLevels: prev.courtLevels.includes(level) ? prev.courtLevels.filter(l => l !== level) : [...prev.courtLevels, level] }))}
                  disabled={isSavingProfile}>{level}</Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="address" className="text-xs">Office Address</Label>
            <Textarea id="address" value={profileData.address || ''} onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))} placeholder="Street address" rows={2} disabled={isSavingProfile} className="text-xs mt-0.5" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="city" className="text-xs">City</Label>
              <Input id="city" value={profileData.city || ''} onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))} placeholder="City" disabled={isSavingProfile} className="h-7 text-xs mt-0.5" />
            </div>
            <div>
              <Label htmlFor="state" className="text-xs">State</Label>
              <Input id="state" value={profileData.state || ''} onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))} placeholder="State" disabled={isSavingProfile} className="h-7 text-xs mt-0.5" />
            </div>
            <div>
              <Label htmlFor="country" className="text-xs">Country</Label>
              <Input id="country" value={profileData.country || ''} onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))} placeholder="Country" disabled={isSavingProfile} className="h-7 text-xs mt-0.5" />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={isSavingProfile} size="sm" className="h-7 text-xs">
            {isSavingProfile && <JuriqLoader size="sm" className="mr-1.5" />}
            Save Profile Changes
          </Button>
        </CardContent>
      </Card>

      {/* 3-column grid: Notifications | Preferences | Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3">

        {/* Notification Settings */}
        <Card className="shadow-card-custom">
          <CardHeader className="p-3 pb-1.5">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription className="text-[10px]">Configure alerts and updates</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailAlerts" className="text-xs font-medium">Email Alerts</Label>
                <p className="text-[10px] text-muted-foreground">Notifications via email</p>
              </div>
              <Switch id="emailAlerts" checked={!!notifications.emailAlerts} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailAlerts: checked }))} disabled={isSavingNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smsAlerts" className="text-xs font-medium">SMS Alerts</Label>
                <p className="text-[10px] text-muted-foreground">Notifications via SMS</p>
              </div>
              <Switch id="smsAlerts" checked={!!notifications.smsAlerts} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, smsAlerts: checked }))} disabled={isSavingNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushNotifications" className="text-xs font-medium">Push Notifications</Label>
                <p className="text-[10px] text-muted-foreground">Browser push notifications</p>
              </div>
              <Switch id="pushNotifications" checked={!!notifications.pushNotifications} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushNotifications: checked }))} disabled={isSavingNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="hearingReminders" className="text-xs font-medium">Hearing Reminders</Label>
                <p className="text-[10px] text-muted-foreground">Court hearing reminders</p>
              </div>
              <Switch id="hearingReminders" checked={!!notifications.hearingReminders} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, hearingReminders: checked }))} disabled={isSavingNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="clientUpdates" className="text-xs font-medium">Client Updates</Label>
                <p className="text-[10px] text-muted-foreground">Client case updates</p>
              </div>
              <Switch id="clientUpdates" checked={!!notifications.clientUpdates} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, clientUpdates: checked }))} disabled={isSavingNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="billingAlerts" className="text-xs font-medium">Billing Alerts</Label>
                <p className="text-[10px] text-muted-foreground">Payment & invoice alerts</p>
              </div>
              <Switch id="billingAlerts" checked={!!notifications.billingAlerts} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, billingAlerts: checked }))} disabled={isSavingNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weeklyReports" className="text-xs font-medium">Weekly Reports</Label>
                <p className="text-[10px] text-muted-foreground">Weekly activity summary</p>
              </div>
              <Switch id="weeklyReports" checked={!!notifications.weeklyReports} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyReports: checked }))} disabled={isSavingNotifications} />
            </div>
            <Button onClick={handleSaveNotifications} disabled={isSavingNotifications} size="sm" className="h-7 text-xs w-full">
              {isSavingNotifications && <JuriqLoader size="sm" className="mr-1.5" />}
              Save Notifications
            </Button>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card className="shadow-card-custom">
          <CardHeader className="p-3 pb-1.5">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Palette className="h-4 w-4 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription className="text-[10px]">Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 space-y-2">
            <div>
              <Label htmlFor="theme" className="text-xs">Theme</Label>
              <Select value={String(preferences.theme || "light")} onValueChange={(value) => setPreferences(prev => ({ ...prev, theme: value }))} disabled={isSavingPreferences}>
                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language" className="text-xs">Language</Label>
              <Select value={String(preferences.language || "en-IN")} onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))} disabled={isSavingPreferences}>
                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                  <SelectItem value="hi-IN">हिन्दी</SelectItem>
                  <SelectItem value="bn-IN">বাংলা</SelectItem>
                  <SelectItem value="ta-IN">தமிழ்</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timezone" className="text-xs">Timezone</Label>
              <Select value={String(preferences.timezone || "Asia/Kolkata")} onValueChange={(value) => setPreferences(prev => ({ ...prev, timezone: value }))} disabled={isSavingPreferences}>
                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="Asia/Mumbai">Asia/Mumbai (IST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFormat" className="text-xs">Date Format</Label>
              <Select value={String(preferences.dateFormat || "DD/MM/YYYY")} onValueChange={(value) => setPreferences(prev => ({ ...prev, dateFormat: value }))} disabled={isSavingPreferences}>
                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency" className="text-xs">Currency</Label>
              {user?.immutableFieldsLocked ? (
                <div className="space-y-1 mt-0.5">
                  <div className="flex items-center gap-2 p-1.5 border rounded-md bg-muted/50">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">
                      {user.profile?.currency === 'INR' && '₹ Indian Rupee (INR)'}
                      {user.profile?.currency === 'USD' && '$ US Dollar (USD)'}
                      {user.profile?.currency === 'EUR' && '€ Euro (EUR)'}
                      {user.profile?.currency === 'GBP' && '£ British Pound (GBP)'}
                      {user.profile?.currency === 'AED' && 'د.إ UAE Dirham (AED)'}
                      {!user.profile?.currency && preferences.currency}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">🔒 Set during onboarding, cannot be changed.</p>
                </div>
              ) : (
                <Select value={String(preferences.currency || "INR")} onValueChange={(value) => setPreferences(prev => ({ ...prev, currency: value }))} disabled={isSavingPreferences}>
                  <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                    <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                    <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                    <SelectItem value="AED">د.إ UAE Dirham (AED)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button onClick={handleSavePreferences} disabled={isSavingPreferences} size="sm" className="h-7 text-xs w-full">
              {isSavingPreferences && <JuriqLoader size="sm" className="mr-1.5" />}
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-card-custom">
          <CardHeader className="p-3 pb-1.5">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Security & Privacy
            </CardTitle>
            <CardDescription className="text-[10px]">Manage account security</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="twoFactor" className="text-xs font-medium">Two-Factor Auth</Label>
                <p className="text-[10px] text-muted-foreground">Extra layer of security</p>
              </div>
              <Switch id="twoFactor" checked={!!security.twoFactorEnabled} onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, twoFactorEnabled: checked }))} disabled={isSavingSecurity} />
            </div>
            <div>
              <Label htmlFor="sessionTimeout" className="text-xs">Session Timeout</Label>
              <Select value={String(security.sessionTimeout || "30")} onValueChange={(value) => setSecurity(prev => ({ ...prev, sessionTimeout: value }))} disabled={isSavingSecurity}>
                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="loginNotifications" className="text-xs font-medium">Login Notifications</Label>
                <p className="text-[10px] text-muted-foreground">Notified on account logins</p>
              </div>
              <Switch id="loginNotifications" checked={!!security.loginNotifications} onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, loginNotifications: checked }))} disabled={isSavingSecurity} />
            </div>
            <Button onClick={handleSaveSecurity} disabled={isSavingSecurity} size="sm" className="h-7 text-xs w-full">
              {isSavingSecurity && <JuriqLoader size="sm" className="mr-1.5" />}
              Save Security Settings
            </Button>
            <Separator />

            <div className="space-y-1">
              <Label className="text-xs font-medium">Google Recovery Email</Label>
              {/* Check both authProviders and recoveryGoogleId — either confirms a linked Google account */}
              {(user?.authProviders?.includes('google') || !!user?.recoveryGoogleId) ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                    ✅ Google Linked
                  </p>
                  {user.recoveryEmail && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      Recovery Email: <span className="font-semibold">{user.recoveryEmail}</span>
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs w-full flex items-center justify-center gap-1.5"
                    onClick={handleLinkGoogle}
                    disabled={true}
                  >
                    <GoogleIcon /> Linked
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs w-full text-muted-foreground"
                    onClick={handleUnlinkGoogle}
                    disabled={isUnlinking}
                  >
                    {isUnlinking && <JuriqLoader size="sm" className="mr-1.5" />}
                    Unlink Recovery Email
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    ❌ Not Linked
                  </p>
                  <p className="text-[10px] text-muted-foreground">Link a Google account for faster login and recovery</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs w-full flex items-center justify-center gap-1.5"
                    onClick={handleLinkGoogle}
                    disabled={isLinking}
                  >
                    {isLinking ? '🔄 Linking...' : <><GoogleIcon /> Link Google Account</>}
                  </Button>
                </div>
              )}
            </div>

            <Separator />
            <div className="space-y-1.5">
              <Button variant="outline" className="w-full h-7 text-xs" onClick={() => setShowPasswordDialog(true)}>Change Password</Button>
              <Button variant="outline" className="w-full h-7 text-xs" onClick={handleExportData} disabled={isExporting}>
                {isExporting && <JuriqLoader size="sm" className="mr-1.5" />}
                Download Account Data
              </Button>
              <Button variant="destructive" className="w-full h-7 text-xs" onClick={() => setShowDeleteDialog(true)}>
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Management */}
      <Card className="shadow-card-custom">
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Database className="h-4 w-4 text-primary" />
            Data Management
          </CardTitle>
          <CardDescription className="text-[10px]">Backup and restore your legal data</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium">Export Data</h4>
              <p className="text-[10px] text-muted-foreground">Download a complete backup of your cases, clients, and documents</p>
              <Button onClick={handleExportData} className="w-full h-7 text-xs" disabled={isExporting}>
                {isExporting ? <JuriqLoader size="sm" className="mr-1.5" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                Export All Data
              </Button>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium">Import Data</h4>
              <p className="text-[10px] text-muted-foreground">Restore your data from a previous backup</p>
              <Button onClick={handleImportData} variant="outline" className="w-full h-7 text-xs">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import Backup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                disabled={isChangingPassword}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                disabled={isChangingPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                disabled={isChangingPassword}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword && <JuriqLoader size="sm" className="mr-2" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: All your cases, clients, documents, and other data will be permanently deleted.
              </p>
            </div>
            <div>
              <Label htmlFor="deletePassword">Password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deleteData.password}
                onChange={(e) => setDeleteData(prev => ({ ...prev, password: e.target.value }))}
                disabled={isDeletingAccount}
                placeholder="Enter your password"
              />
            </div>
            <div>
              <Label htmlFor="deleteConfirmation">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirmation"
                value={deleteData.confirmation}
                onChange={(e) => setDeleteData(prev => ({ ...prev, confirmation: e.target.value }))}
                disabled={isDeletingAccount}
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount && <JuriqLoader size="sm" className="mr-2" />}
              Delete Account Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Relink Confirmation Dialog */}
      <Dialog open={showRelinkDialog} onOpenChange={setShowRelinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Recovery Email?</DialogTitle>
            <DialogDescription>
              A recovery email is already linked to this account. Would you like to replace it with the Google account you just verified?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRelinkDialog(false)}
              disabled={isRelinking}
            >
              Cancel
            </Button>
            <Button onClick={handleRelinkGoogle} disabled={isRelinking}>
              {isRelinking && <JuriqLoader size="sm" className="mr-2" />}
              Replace Recovery Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Import Data Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              {importData ? 'Confirm Data Restoration' : 'Import Data Repository'}
            </DialogTitle>
            <DialogDescription>
              {importData 
                ? `Ready to restore ${importData.statistics?.totalCases || 0} cases and ${importData.statistics?.totalClients || 0} clients from backup.`
                : 'Select a valid Juriq JSON backup file to restore your account data.'
              }
            </DialogDescription>
          </DialogHeader>

          {importData ? (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  CRITICAL WARNING
                </p>
                <p className="text-xs text-destructive/80 mt-1">
                  This operation will **PERMANENTLY DELETE** your existing Cases, Clients, Hearings, and Invoices and replace them with the data from the backup. This cannot be undone.
                </p>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
                <p>• Cases: {importData.statistics?.totalCases || 0}</p>
                <p>• Clients: {importData.statistics?.totalClients || 0}</p>
                <p>• Backup Date: {importData.exportDate ? new Date(importData.exportDate).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border p-4 rounded-md space-y-2">
              <h4 className="text-sm font-semibold">Note before importing:</h4>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                <li>You must use a <code>.json</code> backup file generated by Juriq.</li>
                <li>This will restore your profile, preferences, and all business data.</li>
                <li>Existing data will be replaced to ensure system integrity.</li>
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button 
                variant="outline" 
                onClick={() => { setShowImportDialog(false); setImportData(null); }}
                disabled={isImporting}
            >
              Cancel
            </Button>
            {importData ? (
              <Button 
                variant="destructive" 
                onClick={handleConfirmImport}
                disabled={isImporting}
              >
                {isImporting && <JuriqLoader size="sm" className="mr-2" />}
                Restore Now
              </Button>
            ) : (
              <Button onClick={handleProcessImport} disabled={isImporting}>
                Choose JSON Backup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linking Error Dialog */}
      <Dialog open={!!linkingError} onOpenChange={(open) => !open && setLinkingError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {linkingError?.title}
            </DialogTitle>
            <DialogDescription>
              {linkingError?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setLinkingError(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;