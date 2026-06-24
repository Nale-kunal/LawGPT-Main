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
  Lock,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  FileText,
  ExternalLink,
  Cookie,
  Scale,
} from 'lucide-react';
import JuriqLoader from '@/components/ui/JuriqLoader';
import OnboardingOverlay from '@/components/onboarding/OnboardingOverlay';
import { calculateOnboardingProgress } from '@/lib/onboardingUtils';

import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const defaultNotificationSettings = {
  emailAlerts: true,
  smsAlerts: true,
  pushNotifications: true,
  hearingReminders: true,
  clientUpdates: true,
  weeklyReports: true,
};

const defaultPreferenceSettings = {
  theme: 'light',
  language: 'en-IN',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR',
};

const defaultSecuritySettings = {
  twoFactorEnabled: false,
  sessionTimeout: '30',
  loginNotifications: true,
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
  const [showDeleteWarningDialog, setShowDeleteWarningDialog] = useState(false); // Step 1 pre-warning
  const [showRelinkDialog, setShowRelinkDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  // Onboarding wizard — user-initiated from Settings
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [linkingError, setLinkingError] = useState<{ title: string; message: string } | null>(null);
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);

  // Privacy & Legal state
  const [myConsents, setMyConsents] = useState<Array<{ policyType: string; version: string; policyHash?: string; acceptedAt: string; method: string }>>([]);
  const [isLoadingConsents, setIsLoadingConsents] = useState(false);
  const [currentPolicyVersions, setCurrentPolicyVersions] = useState<Record<string, any>>({});
  const getPolicyVersion = (key: string): string => {
    const val = currentPolicyVersions[key];
    if (!val) return '1.0';
    if (typeof val === 'object' && val !== null) {
      return val.version || '1.0';
    }
    return String(val);
  };
  const [cookiePrefs, setCookiePrefs] = useState({
    analytics: false,
    preferences: true,
  });
  const [commPrefs, setCommPrefs] = useState({
    productAnnouncements: false,
    newsletters: false,
    featureUpdates: false,
  });
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [isSavingComm, setIsSavingComm] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [deleteData, setDeleteData] = useState({
    password: '',
    confirmation: '',
    securityAnswer: '',
  });
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [userSecurityQuestion, setUserSecurityQuestion] = useState('');
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  // Derived state for legacy account deletion support
  const hasSecurityQuestion =
    userSecurityQuestion &&
    userSecurityQuestion !== 'Security question not found' &&
    userSecurityQuestion !== 'Failed to load security question' &&
    userSecurityQuestion !== 'No security question set';

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
    country: '',
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
      country: user.profile?.country || '',
    });
    setNotifications({
      ...defaultNotificationSettings,
      ...(user.notifications || {}),
    });

    const lsTheme = localStorage.getItem('juriq-theme') as 'light' | 'dark' | 'system' | null;
    const userPreferences = {
      ...defaultPreferenceSettings,
      ...(user.preferences || {}),
      theme: lsTheme || user.preferences?.theme || defaultPreferenceSettings.theme,
      timezone:
        user.preferences?.timezone || user.profile?.timezone || defaultPreferenceSettings.timezone,
      currency:
        user.preferences?.currency || user.profile?.currency || defaultPreferenceSettings.currency,
    };
    setPreferences(userPreferences);

    setSecurity({
      ...defaultSecuritySettings,
      ...(user.security || {}),
    });

    if (user.cookieConsent) {
      setCookiePrefs({
        analytics: user.cookieConsent.analytics || false,
        preferences: user.cookieConsent.preferences || false,
      });
    }
    if (user.communicationConsent) {
      setCommPrefs({
        productAnnouncements: user.communicationConsent.productAnnouncements || false,
        newsletters: user.communicationConsent.newsletters || false,
        featureUpdates: user.communicationConsent.featureUpdates || false,
      });
    }
  }, [user]);

  // Load consent records when component mounts
  useEffect(() => {
    const fetchConsents = async () => {
      setIsLoadingConsents(true);
      try {
        const res = await apiFetch(getApiUrl('/api/v1/legal/my-consents'));
        if (res.ok) {
          const data = await res.json();
          setMyConsents(data.consents ?? []);
          setCurrentPolicyVersions(data.currentVersions ?? {});
        }
      } catch {
        // Silent — consents are informational, not critical
      } finally {
        setIsLoadingConsents(false);
      }
    };
    fetchConsents();
  }, []);

  const handleSaveCookiePrefs = async () => {
    setIsSavingCookies(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/legal/cookie-consent'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cookiePrefs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update cookie preferences');
      
      localStorage.setItem('juriq_cookie_consent', JSON.stringify({
        version: '1.0',
        timestamp: new Date().toISOString(),
        preferences: {
          functional: true,
          analytics: cookiePrefs.analytics,
          preferences: cookiePrefs.preferences,
        }
      }));

      toast({
        title: '✓ Preferences Updated',
        description: 'Your cookie settings have been saved.',
      });
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update cookie preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCookies(false);
    }
  };

  const handleSaveCommPrefs = async () => {
    setIsSavingComm(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/legal/communication-consent'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(commPrefs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update communication preferences');

      toast({
        title: '✓ Preferences Updated',
        description: 'Your communication preferences have been saved.',
      });
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update communication preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSavingComm(false);
    }
  };

  const { reopenBanner } = useCookieConsent();

  const handleResetCookiePreferences = () => {
    localStorage.removeItem('juriq_cookie_consent');
    reopenBanner(); // fires CustomEvent — CookieBanner re-appears without page reload
  };

  // Load security question when delete dialog opens
  useEffect(() => {
    if (showDeleteDialog) {
      const fetchQuestion = async () => {
        setIsLoadingQuestion(true);
        try {
          const res = await apiFetch(getApiUrl('/api/v1/auth/security-question'), {
            method: 'GET',
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            setUserSecurityQuestion(data.question);
          } else {
            setUserSecurityQuestion('Security question not found');
          }
        } catch (_err) {
          setUserSecurityQuestion('Failed to load security question');
        } finally {
          setIsLoadingQuestion(false);
        }
      };
      fetchQuestion();
    } else {
      setDeleteData((prev) => ({ ...prev, securityAnswer: '' }));
    }
  }, [showDeleteDialog]);

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
          toast({
            title: 'Google account linked successfully',
            description: 'You can now sign in with this Google account or your primary email.',
          });
        } catch {
          toast({
            title: 'Link failed',
            description: 'Google linking verification failed.',
            variant: 'destructive',
          });
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
        GOOGLE_ACCOUNT_ALREADY_IN_USE:
          'This Google account is already linked to a different Juriq account.',
        EMAIL_MISMATCH: 'The Google account email must match your Juriq account email.',
        STATE_MISMATCH: 'Security check failed. Please try again.',
        SESSION_EXPIRED: 'Your session expired. Please log in and try again.',
        ACCESS_DENIED: 'Google account linking was cancelled.',
        OAUTH_CANCELLED: 'Google login was cancelled.',
        SERVER_ERROR: 'An unexpected error occurred. Please try again.',
        OAUTH_ERROR: 'OAuth failed',
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
  const saveSettings = async (
    updates: Record<string, unknown>,
    successMessage: string,
    setLoading: (loading: boolean) => void
  ) => {
    setLoading(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/auth/me'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to update settings' }));
        throw new Error(data.error || 'Failed to update settings');
      }

      // Use the response from PUT directly to update user state
      const data = await res.json();
      if (data.user) {
        // Update local state immediately from the response
        setProfileData((prev) => ({
          ...prev,
          name: data.user.name || prev.name,
          recoveryEmail:
            data.user.recoveryEmail !== undefined
              ? data.user.recoveryEmail || ''
              : prev.recoveryEmail,
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
        title: successMessage,
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description:
          error instanceof Error ? error.message : 'Unable to save settings. Please try again.',
        variant: 'destructive',
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
        variant: 'destructive',
      });
      return;
    }

    // Validate recovery email
    if (profileData.recoveryEmail) {
      if (
        profileData.recoveryEmail.trim().toLowerCase() === profileData.email.trim().toLowerCase()
      ) {
        toast({
          title: 'Invalid recovery email',
          description: 'Recovery email cannot be the same as your primary email',
          variant: 'destructive',
        });
        return;
      }
      if (!validateEmail(profileData.recoveryEmail)) {
        toast({
          title: 'Invalid recovery email',
          description: 'Please enter a valid recovery email address',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate phone
    if (profileData.phoneNumber && !validatePhone(profileData.phoneNumber)) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    if (!profileData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your full name',
        variant: 'destructive',
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
        country: profileData.country.trim(),
      },
    };

    // Only update recovery email if NOT currently linked via Google
    // Use recoveryGoogleId as the source of truth for recovery link state
    if (!user?.recoveryGoogleId) {
      updates.recoveryEmail = profileData.recoveryEmail.trim();
    }

    saveSettings(updates, 'Profile updated successfully', setIsSavingProfile);
  };

  const handleSaveNotifications = () => {
    saveSettings({ notifications }, 'Notification settings updated', setIsSavingNotifications);
  };

  const handleSavePreferences = () => {
    // Apply theme change immediately via ThemeContext AND save to DB
    setThemeAndSave(preferences.theme as 'light' | 'dark' | 'system');
    // Also save all other preferences (language, timezone, dateFormat, currency) to DB
    saveSettings({ preferences }, 'Preferences updated', setIsSavingPreferences);
  };

  const handleSaveSecurity = () => {
    saveSettings({ security }, 'Security settings updated', setIsSavingSecurity);
  };

  const handleChangePassword = async () => {
    // Validate inputs
    const needsCurrentPassword = user?.hasPassword !== false;

    if (
      (needsCurrentPassword && !passwordData.currentPassword) ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast({
        title: 'All fields required',
        description: needsCurrentPassword
          ? 'Please fill in all password fields'
          : 'Please provide and confirm your new password',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const payload: Record<string, unknown> = {
        newPassword: passwordData.newPassword,
      };

      if (needsCurrentPassword) {
        payload.currentPassword = passwordData.currentPassword;
      }

      const res = await apiFetch(getApiUrl('/api/v1/auth/change-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to set password' }));
        throw new Error(data.error || 'Failed to set password');
      }

      toast({
        title: needsCurrentPassword ? 'Password changed successfully' : 'Password set successfully',
      });

      // Reset form and close dialog
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordDialog(false);

      // Refresh user to update the hasPassword flag in context
      await refreshUser();
    } catch (error) {
      toast({
        title: 'Password change failed',
        description: error instanceof Error ? error.message : 'Unable to change password',
        variant: 'destructive',
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
        credentials: 'include',
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
        description: 'Your data has been downloaded',
      });
    } catch (_error) {
      toast({
        title: 'Export failed',
        description: 'Unable to export data. Please try again.',
        variant: 'destructive',
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
          variant: 'destructive',
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
        body: JSON.stringify(importData),
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
        description:
          error instanceof Error ? error.message : 'Unable to restore data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Validate inputs
    const needsPassword = user?.hasPassword !== false;

    if (needsPassword && !deleteData.password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password to confirm deletion',
        variant: 'destructive',
      });
      return;
    }

    if (deleteData.confirmation !== 'DELETE') {
      toast({
        title: 'Confirmation required',
        description: 'Please type DELETE to confirm account deletion',
        variant: 'destructive',
      });
      return;
    }

    // Step 1: Optional Security Answer verification (Legacy Users check)
    if (hasSecurityQuestion && !deleteData.securityAnswer.trim()) {
      toast({
        title: 'Security answer required',
        description: 'Please answer your security question',
        variant: 'destructive',
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Only verify if the user has a question set
      if (hasSecurityQuestion) {
        const verifyRes = await apiFetch(getApiUrl('/api/v1/auth/verify-security-answer'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: deleteData.securityAnswer }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || 'Incorrect security answer');
        }
      }

      // Step 2: Proceed with Deletion
      const payload: Record<string, unknown> = {
        confirmation: deleteData.confirmation,
      };

      if (needsPassword) {
        payload.password = deleteData.password;
      }

      const res = await apiFetch(getApiUrl('/api/v1/auth/delete-account'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete account' }));
        throw new Error(data.error || 'Failed to delete account');
      }

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted',
      });

      // Redirect to login after short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      toast({
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'Unable to delete account',
        variant: 'destructive',
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
      toast({
        title: 'Recovery email updated',
        description: 'Your new recovery email has been set.',
      });
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
      setProfileData((prev) => ({ ...prev, recoveryEmail: '' }));
      await refreshUser();
      toast({
        title: 'Recovery email unlinked',
        description: 'Your Google recovery email has been removed.',
      });
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
          <p className="text-xs text-muted-foreground">
            Manage your account and application preferences
          </p>
        </div>
      </div>

      {/* ── Workspace Setup Status Card ─────────────────────────────────────── */}
      <Card
        id="settings-onboarding-card"
        className="shadow-card-custom border-primary/20 overflow-hidden"
      >
        {/* Progress strip — always visible, animates to 100% when complete */}
        {(() => {
          const prog = calculateOnboardingProgress(user ?? {});
          return (
            <div
              className="h-[3px] bg-primary/10 w-full"
              role="progressbar"
              aria-valuenow={user?.onboardingCompleted ? 100 : prog.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={
                user?.onboardingCompleted
                  ? 'Workspace setup: 100% complete'
                  : `Workspace setup ${prog.completedCount} of ${prog.totalCount} steps completed`
              }
            >
              <div
                className="h-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${user?.onboardingCompleted ? 100 : prog.percentage}%` }}
              />
            </div>
          );
        })()}

        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ClipboardList className="h-4 w-4 text-primary" />
            Workspace Setup
          </CardTitle>
          <CardDescription className="text-[10px]">
            Configure your professional identity to unlock all features
          </CardDescription>
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          {user?.onboardingCompleted ? (
            /* ── COMPLETED state ── */
            <div className="space-y-2">
              {/* Status row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15"
                    aria-hidden="true"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold">Setup Complete</p>
                      <span
                        className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                        aria-label="Workspace setup status: Completed"
                      >
                        ✓ Completed
                      </span>
                      {(user.onboardingVersion ?? 0) > 0 && (
                        <span
                          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          aria-label={`Setup version ${user.onboardingVersion}`}
                        >
                          v{user.onboardingVersion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Setup — scrolls to the Profile section */}
                <Button
                  id="settings-onboarding-review"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const profileCard = document.getElementById('settings-profile-card');
                    profileCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="h-8 shrink-0 gap-1.5 text-xs"
                  aria-label="Review your completed workspace setup in the Profile section"
                >
                  Review Setup
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-10">
                {user.onboardingCompletedAt && (
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-medium">Completed on:</span>{' '}
                    {new Date(user.onboardingCompletedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
                {(() => {
                  const prog = calculateOnboardingProgress(user);
                  return (
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium">Profile:</span> {prog.completedCount}/
                      {prog.totalCount} sections filled
                    </p>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* ── INCOMPLETE state ── */
            <div className="space-y-2">
              {/* Status + CTA row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15"
                    aria-hidden="true"
                  >
                    <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold">Setup Incomplete</p>
                      {(() => {
                        const prog = calculateOnboardingProgress(user);
                        return (
                          <span
                            className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                            aria-label={`Progress: ${prog.completedCount} of ${prog.totalCount} steps completed`}
                          >
                            {prog.completedCount}/{prog.totalCount} Steps
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Provide your Bar Council number, currency, and professional details.
                    </p>
                  </div>
                </div>
                <Button
                  id="settings-onboarding-cta"
                  size="sm"
                  onClick={() => setShowOnboardingWizard(true)}
                  className="h-8 shrink-0 gap-1.5 text-xs font-semibold"
                  aria-label="Open workspace setup wizard to continue setup"
                >
                  Continue Setup
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>

              {/* Last activity row */}
              {(user?.updatedAt || user?.createdAt) && (
                <p className="text-[10px] text-muted-foreground pl-10">
                  <span className="font-medium">Last activity:</span>{' '}
                  {new Date(user.updatedAt || user.createdAt!).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding wizard — user-initiated from Settings */}
      {showOnboardingWizard && (
        <div role="dialog" aria-modal="true" aria-label="Workspace setup wizard">
          <div
            className="fixed inset-0 z-[9997] bg-background/50 backdrop-blur-[6px]"
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="relative z-10 max-w-3xl w-full mx-4 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOnboardingWizard(false)}
                  className="h-8 gap-1.5 text-xs bg-background/80 backdrop-blur-sm"
                  aria-label="Close setup wizard and return to settings"
                >
                  Return to Settings
                </Button>
              </div>
              <div className="max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
                <OnboardingOverlay />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings */}
      <Card id="settings-profile-card" className="shadow-card-custom">
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <User className="h-4 w-4 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-[10px]">
            Update your personal and professional details
          </CardDescription>
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
              <Label htmlFor="name" className="text-xs">
                Display Name *
              </Label>
              <Input
                id="name"
                value={profileData.name || ''}
                onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your display name"
                disabled={isSavingProfile}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">
                Primary Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={profileData.email || ''}
                disabled
                placeholder="your@email.com"
                className="bg-muted h-7 text-xs mt-0.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="recoveryEmail" className="text-xs">
                Recovery Email (Optional){' '}
                {!!user?.recoveryGoogleId && (
                  <span className="text-[10px] text-green-500 ml-1 font-semibold flex items-center gap-0.5 inline-flex">
                    <Shield className="h-2.5 w-2.5" /> Google Verified
                  </span>
                )}
              </Label>
              <Input
                id="recoveryEmail"
                type="email"
                value={profileData.recoveryEmail || ''}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, recoveryEmail: e.target.value }))
                }
                placeholder="backup@email.com"
                disabled={isSavingProfile || !!user?.recoveryGoogleId}
                className={`h-7 text-xs mt-0.5 ${user?.recoveryGoogleId ? 'bg-muted/50 cursor-not-allowed font-medium' : ''}`}
              />
              {!!user?.recoveryGoogleId && (
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Managed via Security & Privacy settings
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phoneNumber" className="text-xs">
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                value={profileData.phoneNumber || ''}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                }
                placeholder="+91 98765 43210"
                disabled={isSavingProfile}
                className="h-7 text-xs mt-0.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="lawFirmName" className="text-xs">
                Law Firm/Organization
              </Label>
              <Input
                id="lawFirmName"
                value={profileData.lawFirmName || ''}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, lawFirmName: e.target.value }))
                }
                placeholder="Your law firm name"
                disabled={isSavingProfile}
                className="h-7 text-xs mt-0.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Practice Areas</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {['Civil', 'Criminal', 'Corporate', 'Family', 'Tax', 'Property'].map((area) => (
                <Button
                  key={area}
                  type="button"
                  variant={profileData.practiceAreas.includes(area) ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() =>
                    setProfileData((prev) => ({
                      ...prev,
                      practiceAreas: prev.practiceAreas.includes(area)
                        ? prev.practiceAreas.filter((a) => a !== area)
                        : [...prev.practiceAreas, area],
                    }))
                  }
                  disabled={isSavingProfile}
                >
                  {area}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Court Levels</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {['District Court', 'High Court', 'Supreme Court'].map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={profileData.courtLevels.includes(level) ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() =>
                    setProfileData((prev) => ({
                      ...prev,
                      courtLevels: prev.courtLevels.includes(level)
                        ? prev.courtLevels.filter((l) => l !== level)
                        : [...prev.courtLevels, level],
                    }))
                  }
                  disabled={isSavingProfile}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="address" className="text-xs">
              Office Address
            </Label>
            <Textarea
              id="address"
              value={profileData.address || ''}
              onChange={(e) => setProfileData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Street address"
              rows={2}
              disabled={isSavingProfile}
              className="text-xs mt-0.5"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="city" className="text-xs">
                City
              </Label>
              <Input
                id="city"
                value={profileData.city || ''}
                onChange={(e) => setProfileData((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="City"
                disabled={isSavingProfile}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-xs">
                State
              </Label>
              <Input
                id="state"
                value={profileData.state || ''}
                onChange={(e) => setProfileData((prev) => ({ ...prev, state: e.target.value }))}
                placeholder="State"
                disabled={isSavingProfile}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label htmlFor="country" className="text-xs">
                Country
              </Label>
              <Input
                id="country"
                value={profileData.country || ''}
                onChange={(e) => setProfileData((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="Country"
                disabled={isSavingProfile}
                className="h-7 text-xs mt-0.5"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            size="sm"
            className="h-7 text-xs"
          >
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
                <Label htmlFor="emailAlerts" className="text-xs font-medium">
                  Email Alerts
                </Label>
                <p className="text-[10px] text-muted-foreground">Notifications via email</p>
              </div>
              <Switch
                id="emailAlerts"
                checked={!!notifications.emailAlerts}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, emailAlerts: checked }))
                }
                disabled={isSavingNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smsAlerts" className="text-xs font-medium">
                  SMS Alerts
                </Label>
                <p className="text-[10px] text-muted-foreground">Notifications via SMS</p>
              </div>
              <Switch
                id="smsAlerts"
                checked={!!notifications.smsAlerts}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, smsAlerts: checked }))
                }
                disabled={isSavingNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushNotifications" className="text-xs font-medium">
                  Push Notifications
                </Label>
                <p className="text-[10px] text-muted-foreground">Browser push notifications</p>
              </div>
              <Switch
                id="pushNotifications"
                checked={!!notifications.pushNotifications}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, pushNotifications: checked }))
                }
                disabled={isSavingNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="hearingReminders" className="text-xs font-medium">
                  Hearing Reminders
                </Label>
                <p className="text-[10px] text-muted-foreground">Court hearing reminders</p>
              </div>
              <Switch
                id="hearingReminders"
                checked={!!notifications.hearingReminders}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, hearingReminders: checked }))
                }
                disabled={isSavingNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="clientUpdates" className="text-xs font-medium">
                  Client Updates
                </Label>
                <p className="text-[10px] text-muted-foreground">Client case updates</p>
              </div>
              <Switch
                id="clientUpdates"
                checked={!!notifications.clientUpdates}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, clientUpdates: checked }))
                }
                disabled={isSavingNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weeklyReports" className="text-xs font-medium">
                  Weekly Reports
                </Label>
                <p className="text-[10px] text-muted-foreground">Weekly activity summary</p>
              </div>
              <Switch
                id="weeklyReports"
                checked={!!notifications.weeklyReports}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, weeklyReports: checked }))
                }
                disabled={isSavingNotifications}
              />
            </div>
            {/* Security notification protection notice */}
            <div className="rounded-md bg-muted/40 border border-border/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground/70">Security emails are always sent</span> — login alerts, password reset, and account verification emails are transactional and cannot be disabled, regardless of the toggle above.
              </p>
            </div>
            <Button
              onClick={handleSaveNotifications}
              disabled={isSavingNotifications}
              size="sm"
              className="h-7 text-xs w-full"
            >
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
              <Label htmlFor="theme" className="text-xs">
                Theme
              </Label>
              <Select
                value={String(preferences.theme || 'light')}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, theme: value }))}
                disabled={isSavingPreferences}
              >
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language" className="text-xs">
                Language
              </Label>
              <Select
                value={String(preferences.language || 'en-IN')}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, language: value }))}
                disabled={isSavingPreferences}
              >
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                  <SelectItem value="hi-IN">हिन्दी</SelectItem>
                  <SelectItem value="bn-IN">বাংলা</SelectItem>
                  <SelectItem value="ta-IN">தமிழ்</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timezone" className="text-xs">
                Timezone
              </Label>
              <Select
                value={String(preferences.timezone || 'Asia/Kolkata')}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, timezone: value }))}
                disabled={isSavingPreferences}
              >
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="Asia/Mumbai">Asia/Mumbai (IST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFormat" className="text-xs">
                Date Format
              </Label>
              <Select
                value={String(preferences.dateFormat || 'DD/MM/YYYY')}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, dateFormat: value }))
                }
                disabled={isSavingPreferences}
              >
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency" className="text-xs">
                Currency
              </Label>
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
                  <p className="text-[10px] text-muted-foreground">
                    🔒 Set during onboarding, cannot be changed.
                  </p>
                </div>
              ) : (
                <Select
                  value={String(preferences.currency || 'INR')}
                  onValueChange={(value) =>
                    setPreferences((prev) => ({ ...prev, currency: value }))
                  }
                  disabled={isSavingPreferences}
                >
                  <SelectTrigger className="h-7 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
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
            <Button
              onClick={handleSavePreferences}
              disabled={isSavingPreferences}
              size="sm"
              className="h-7 text-xs w-full"
            >
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
                <Label htmlFor="twoFactor" className="text-xs font-medium">
                  Two-Factor Auth
                </Label>
                <p className="text-[10px] text-muted-foreground">Extra layer of security</p>
              </div>
              <Switch
                id="twoFactor"
                checked={!!security.twoFactorEnabled}
                onCheckedChange={(checked) =>
                  setSecurity((prev) => ({ ...prev, twoFactorEnabled: checked }))
                }
                disabled={isSavingSecurity}
              />
            </div>
            <div>
              <Label htmlFor="sessionTimeout" className="text-xs">
                Session Timeout
              </Label>
              <Select
                value={String(security.sessionTimeout || '30')}
                onValueChange={(value) =>
                  setSecurity((prev) => ({ ...prev, sessionTimeout: value }))
                }
                disabled={isSavingSecurity}
              >
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
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
                <Label htmlFor="loginNotifications" className="text-xs font-medium">
                  Login Notifications
                </Label>
                <p className="text-[10px] text-muted-foreground">Notified on account logins</p>
              </div>
              <Switch
                id="loginNotifications"
                checked={!!security.loginNotifications}
                onCheckedChange={(checked) =>
                  setSecurity((prev) => ({ ...prev, loginNotifications: checked }))
                }
                disabled={isSavingSecurity}
              />
            </div>
            <Button
              onClick={handleSaveSecurity}
              disabled={isSavingSecurity}
              size="sm"
              className="h-7 text-xs w-full"
            >
              {isSavingSecurity && <JuriqLoader size="sm" className="mr-1.5" />}
              Save Security Settings
            </Button>
            <Separator />

            <div className="space-y-1">
              <Label className="text-xs font-medium">Google Recovery Email</Label>
              {/* Use recoveryGoogleId as the single source of truth for recovery link state */}
              {!!user?.recoveryGoogleId || !!user?.recoveryEmail ? (
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
                  <p className="text-[10px] text-muted-foreground">
                    Link a Google account for faster login and recovery
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs w-full flex items-center justify-center gap-1.5"
                    onClick={handleLinkGoogle}
                    disabled={isLinking}
                  >
                    {isLinking ? (
                      '🔄 Linking...'
                    ) : (
                      <>
                        <GoogleIcon /> Link Google Account
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <Separator />
            <div className="space-y-1.5">
              <Button
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={() => setShowPasswordDialog(true)}
              >
                {user?.hasPassword !== false ? 'Change Password' : 'Set Password'}
              </Button>
              <Button
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={handleExportData}
                disabled={isExporting}
              >
                {isExporting && <JuriqLoader size="sm" className="mr-1.5" />}
                Download Account Data
              </Button>
              <Button
                variant="destructive"
                className="w-full h-7 text-xs"
                onClick={() => setShowDeleteWarningDialog(true)}
              >
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
          <CardDescription className="text-[10px]">
            Backup and restore your legal data
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium">Export Data</h4>
              <p className="text-[10px] text-muted-foreground">
                Download a complete backup of your cases, clients, and documents
              </p>
              <Button
                onClick={handleExportData}
                className="w-full h-7 text-xs"
                disabled={isExporting}
              >
                {isExporting ? (
                  <JuriqLoader size="sm" className="mr-1.5" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Export All Data
              </Button>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium">Import Data</h4>
              <p className="text-[10px] text-muted-foreground">
                Restore your data from a previous backup
              </p>
              <Button onClick={handleImportData} variant="outline" className="w-full h-7 text-xs">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import Backup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Privacy & Legal ────────────────────────────────── */}
      <Card id="settings-privacy-card" className="shadow-card-custom">
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Privacy &amp; Legal
          </CardTitle>
          <CardDescription className="text-[10px]">
            Your consent records, data rights, and legal policies
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 space-y-5">

          {/* Cookie Preferences Section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 text-primary">
              <Cookie className="h-3.5 w-3.5" />
              Cookie Preference Center
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2.5 border rounded-md bg-muted/10">
                <div>
                  <div className="font-semibold text-foreground/90">Strictly Necessary Cookies</div>
                  <div className="text-[10px] text-muted-foreground">Required for authentication, security, and plan enforcement.</div>
                </div>
                <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded tracking-wide uppercase">Always Active</span>
              </div>
              
              <div className="flex items-center justify-between text-xs p-2.5 border rounded-md bg-muted/10">
                <div>
                  <div className="font-semibold text-foreground/90">Analytics & Latency Tracking</div>
                  <div className="text-[10px] text-muted-foreground">Helps us monitor platform speed, errors, and feature usage.</div>
                </div>
                <Switch 
                  checked={cookiePrefs.analytics} 
                  onCheckedChange={(checked) => setCookiePrefs(prev => ({ ...prev, analytics: checked }))} 
                />
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 border rounded-md bg-muted/10">
                <div>
                  <div className="font-semibold text-foreground/90">UI Customization & State Memory</div>
                  <div className="text-[10px] text-muted-foreground">Remembers side-panel widths, calendar sorting, and UI choices.</div>
                </div>
                <Switch 
                  checked={cookiePrefs.preferences} 
                  onCheckedChange={(checked) => setCookiePrefs(prev => ({ ...prev, preferences: checked }))} 
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
              <button 
                onClick={handleResetCookiePreferences} 
                className="text-[10px] text-muted-foreground hover:text-primary underline bg-transparent border-0 cursor-pointer p-0"
              >
                Reset & Re-open Consent Banner
              </button>
              <Button 
                onClick={handleSaveCookiePrefs} 
                disabled={isSavingCookies} 
                className="h-8 text-[11px] font-semibold px-3"
              >
                {isSavingCookies ? <JuriqLoader size="sm" className="mr-1" /> : null}
                Save Cookie Preferences
              </Button>
            </div>
          </div>

          <Separator />

          {/* Communication Consent Section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 text-primary">
              <Bell className="h-3.5 w-3.5" />
              Communication & Privacy Consents
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2.5 border rounded-md bg-muted/10">
                <div>
                  <div className="font-semibold text-foreground/90">Product Announcements</div>
                  <div className="text-[10px] text-muted-foreground">Major platform updates, downtime alerts, and new tool announcements.</div>
                </div>
                <Switch 
                  checked={commPrefs.productAnnouncements} 
                  onCheckedChange={(checked) => setCommPrefs(prev => ({ ...prev, productAnnouncements: checked }))} 
                />
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 border rounded-md bg-muted/10">
                <div>
                  <div className="font-semibold text-foreground/90">Legal Tech Newsletters</div>
                  <div className="text-[10px] text-muted-foreground">Weekly digests of Supreme Court updates, case summaries, and templates.</div>
                </div>
                <Switch 
                  checked={commPrefs.newsletters} 
                  onCheckedChange={(checked) => setCommPrefs(prev => ({ ...prev, newsletters: checked }))} 
                />
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 border rounded-md bg-muted/10">
                <div>
                  <div className="font-semibold text-foreground/90">New Feature Betas</div>
                  <div className="text-[10px] text-muted-foreground">Early invitations to beta-test vector legal research and AI draft features.</div>
                </div>
                <Switch 
                  checked={commPrefs.featureUpdates} 
                  onCheckedChange={(checked) => setCommPrefs(prev => ({ ...prev, featureUpdates: checked }))} 
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button 
                onClick={handleSaveCommPrefs} 
                disabled={isSavingComm} 
                className="h-8 text-[11px] font-semibold px-3"
              >
                {isSavingComm ? <JuriqLoader size="sm" className="mr-1" /> : null}
                Save Consent Settings
              </Button>
            </div>
          </div>

          <Separator />

          {/* Consent History Section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 text-primary">
              <FileText className="h-3.5 w-3.5" />
              Cryptographic Consent History
            </h4>
            {isLoadingConsents ? (
              <div className="text-xs text-muted-foreground">Loading consent history...</div>
            ) : myConsents.length === 0 ? (
              <div className="text-[11px] text-muted-foreground p-3 border rounded-md bg-muted/20">
                No legal consent records found. Consent records are captured at account creation for accounts created after 1 June 2026.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse text-[11px] text-left">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/80 font-semibold text-muted-foreground">
                      <th className="p-2.5">Agreement</th>
                      <th className="p-2.5">Version</th>
                      <th className="p-2.5">Hash Verification</th>
                      <th className="p-2.5">Accepted Date</th>
                      <th className="p-2.5">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {myConsents.map((c, idx) => {
                      const label = c.policyType === 'terms' ? 'Terms of Service' : c.policyType === 'privacy' ? 'Privacy Policy' : c.policyType === 'refund-policy' ? 'Refund Policy' : c.policyType;
                      const hashStr = c.policyHash ? `${c.policyHash.slice(0, 10)}...${c.policyHash.slice(-6)}` : 'N/A';
                      const currentVersion = getPolicyVersion(c.policyType);
                      const isOutdated = currentVersion && c.version !== currentVersion;
                      return (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="p-2.5 font-medium flex items-center gap-1.5 flex-wrap">
                            {label}
                            {isOutdated ? (
                              <span className="text-[8px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded">Outdated</span>
                            ) : (
                              <span className="text-[8px] bg-green-500/15 text-green-700 dark:text-green-400 font-bold px-1.5 py-0.5 rounded">Current</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-muted-foreground">v{c.version}</td>
                          <td className="p-2.5 font-mono text-muted-foreground/60 select-all" title={c.policyHash || 'No Hash Available'}>{hashStr}</td>
                          <td className="p-2.5 text-muted-foreground">{new Date(c.acceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-2.5 font-semibold text-primary capitalize">{c.method?.replace('_', ' ')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Separator />

          {/* Data Rights */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-primary flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Privacy &amp; Data Rights
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-2.5 border rounded-md bg-muted/20">
                <div>
                  <div className="text-xs font-semibold">Request Data Export</div>
                  <div className="text-[10px] text-muted-foreground">Download all cases, clients, documents, hearings, and consent history.</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0 ml-2"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? <JuriqLoader size="sm" className="mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  Export Data
                </Button>
              </div>
              <div className="flex items-center justify-between p-2.5 border rounded-md bg-muted/20">
                <div>
                  <div className="text-xs font-semibold text-destructive">Delete Account</div>
                  <div className="text-[10px] text-muted-foreground">Hard delete your user record, cases, files, and Cloudinary uploads permanently.</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0 ml-2 text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={() => setShowDeleteWarningDialog(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Legal Policies */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-primary flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              Standard Platform Legal Policies
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Terms of Service', href: '/dashboard/terms', version: getPolicyVersion('terms') },
                { label: 'Privacy Policy', href: '/dashboard/privacy', version: getPolicyVersion('privacy') },
                { label: 'Data Processing', href: '/dashboard/data-processing', version: getPolicyVersion('data-processing') },
                { label: 'Cookie Policy', href: '/dashboard/cookie-policy', version: getPolicyVersion('cookie-policy') },
                { label: 'Refund Policy', href: '/dashboard/refund-policy', version: getPolicyVersion('refund-policy') },
              ].map(p => (
                <Link
                  key={p.href}
                  to={p.href}
                  className="flex items-center justify-between p-2 border rounded-md bg-muted/20 hover:bg-muted/40 text-xs transition-colors"
                >
                  <span className="font-medium">{p.label}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-[10px]">v{p.version}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between">
            <span>For privacy rights, contact <span className="font-semibold">support@juriq.in</span></span>
            <Link to="/dashboard/grievance" className="underline hover:text-primary font-semibold">Grievance Redressal Center</Link>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user?.hasPassword !== false ? 'Change Password' : 'Set Password'}
            </DialogTitle>
            <DialogDescription>
              {user?.hasPassword !== false
                ? 'Enter your current password and choose a new one'
                : 'Choose a new password for your account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {user?.hasPassword !== false && (
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  disabled={isChangingPassword}
                />
              </div>
            )}
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                disabled={isChangingPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
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
              {user?.hasPassword !== false ? 'Change Password' : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Step 1: Delete Account Pre-Warning Dialog ─────────────────────── */}
      <Dialog open={showDeleteWarningDialog} onOpenChange={setShowDeleteWarningDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <DialogTitle className="text-destructive">Before You Delete Your Account</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              Deleting your account is permanent and cannot be undone. Please read the following carefully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">The following will be permanently deleted:</p>
              <ul className="text-sm text-destructive/90 space-y-1 list-disc pl-5">
                <li>Your account profile and login credentials</li>
                <li>All cases, hearing records, and matter details</li>
                <li>All client records</li>
                <li>All uploaded documents and files</li>
                <li>All legal notes and templates you created</li>
                <li>Your subscription and billing history (billing records are anonymised and retained for 7 years as required by Indian law)</li>
                <li>All consent records associated with your account</li>
              </ul>
            </div>
            <div className="bg-muted/50 border rounded-md p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Before proceeding:</strong> Export your data if you need a copy (Settings → Privacy &amp; Legal → Download Account Data).
                Data is purged within 30 days of deletion as stated in our{' '}
                <Link to="/dashboard/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteWarningDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel — Keep My Account
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setShowDeleteWarningDialog(false); setShowDeleteDialog(true); }}
              className="w-full sm:w-auto"
            >
              I Understand — Proceed to Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Step 2: Delete Account Confirmation Dialog ───────────────────────── */}
      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and all
              associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: All your cases, clients, documents, and other data will be permanently
                deleted.
              </p>
            </div>
            {user?.hasPassword !== false && (
              <div>
                <Label htmlFor="deletePassword">Password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deleteData.password}
                  onChange={(e) => setDeleteData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={isDeletingAccount}
                  placeholder="Enter your password"
                />
              </div>
            )}
            <div>
              <Label htmlFor="deleteConfirmation">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirmation"
                value={deleteData.confirmation}
                onChange={(e) =>
                  setDeleteData((prev) => ({ ...prev, confirmation: e.target.value }))
                }
                disabled={isDeletingAccount}
                placeholder="DELETE"
              />
            </div>

            <Separator className="my-2" />

            {hasSecurityQuestion ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary">
                  <Shield className="h-4 w-4" />
                  Security Verification
                </Label>
                <div className="bg-muted/50 p-3 rounded-md border text-sm italic">
                  {isLoadingQuestion ? (
                    <div className="flex items-center gap-2">
                      <JuriqLoader size="xs" />
                      <span>Loading question...</span>
                    </div>
                  ) : (
                    userSecurityQuestion
                  )}
                </div>
                <Input
                  id="securityAnswer"
                  value={deleteData.securityAnswer}
                  onChange={(e) =>
                    setDeleteData((prev) => ({ ...prev, securityAnswer: e.target.value }))
                  }
                  disabled={isDeletingAccount || isLoadingQuestion}
                  placeholder="Enter your security answer"
                />
                <p className="text-[10px] text-muted-foreground">
                  Your answer is case-insensitive.
                </p>
              </div>
            ) : (
              !isLoadingQuestion && (
                <div className="p-3 bg-muted/30 border rounded-md">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-orange-500/70" />
                    Security question not set. Proceeding with password verification only.
                  </p>
                </div>
              )
            )}
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
              A recovery email is already linked to this account. Would you like to replace it with
              the Google account you just verified?
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
                : 'Select a valid Juriq JSON backup file to restore your account data.'}
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
                  This operation will **PERMANENTLY DELETE** your existing Cases, Clients, Hearings,
                  and Invoices and replace them with the data from the backup. This cannot be
                  undone.
                </p>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
                <p>• Cases: {importData.statistics?.totalCases || 0}</p>
                <p>• Clients: {importData.statistics?.totalClients || 0}</p>
                <p>
                  • Backup Date:{' '}
                  {importData.exportDate
                    ? new Date(importData.exportDate).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border p-4 rounded-md space-y-2">
              <h4 className="text-sm font-semibold">Note before importing:</h4>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                <li>
                  You must use a <code>.json</code> backup file generated by Juriq.
                </li>
                <li>This will restore your profile, preferences, and all business data.</li>
                <li>Existing data will be replaced to ensure system integrity.</li>
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportData(null);
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            {importData ? (
              <Button variant="destructive" onClick={handleConfirmImport} disabled={isImporting}>
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
            <DialogDescription>{linkingError?.message}</DialogDescription>
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
