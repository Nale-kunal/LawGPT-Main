import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Settings, Activity, X, FileText, UserPlus, Receipt, Timer, IndianRupee } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLegalData } from '@/contexts/LegalDataContext';
import { useNavigate } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';
import { UpgradePlanButton } from '@/components/subscription/UpgradePlanButton';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiUrl, apiFetch } from '@/lib/api';
import { useFormatting } from '@/contexts/FormattingContext';
import JuriqLoader from '@/components/ui/JuriqLoader';

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  metadata: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'case_created':
    case 'case_updated':
      return <FileText className="h-3 w-3" />;
    case 'client_registered':
      return <UserPlus className="h-3 w-3" />;
    case 'payment_received':
      return <Receipt className="h-3 w-3" />;
    case 'invoice_created':
      return <IndianRupee className="h-3 w-3" />;
    case 'time_logged':
      return <Timer className="h-3 w-3" />;
    default:
      return <Activity className="h-3 w-3" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'case_created':
      return 'bg-success';
    case 'case_updated':
      return 'bg-primary';
    case 'client_registered':
      return 'bg-warning';
    case 'payment_received':
      return 'bg-success';
    case 'invoice_created':
      return 'bg-secondary';
    case 'time_logged':
      return 'bg-info';
    default:
      return 'bg-muted-foreground';
  }
};

export const Header = () => {
  const { user, logout } = useAuth();
  const { alerts } = useLegalData();
  const navigate = useNavigate();
  const { formatCurrency, formatRelativeDate } = useFormatting();
  const unreadAlerts = alerts.filter(alert => !alert.isRead).length;
  const [scrolled, setScrolled] = useState(false);

  // Recent Activity modal state
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activityData, setActivityData] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const activityFetched = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // rAF-batched scroll handler — batches DOM reads and React state writes
    // into a single animation frame to prevent forced reflows during scroll.
    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return; // coalesce rapid scroll events
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
        rafId = 0;
      });
    };
    // Also listen on the main scrollable container inside the dashboard
    const mainEl = document.getElementById('dashboard-main');
    const target: EventTarget = mainEl ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // ESC key closes modal
  useEffect(() => {
    if (!isActivityOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsActivityOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActivityOpen]);

  // Lazy fetch — only on first open
  const openActivityModal = useCallback(async () => {
    setIsActivityOpen(true);
    if (activityFetched.current) return;
    try {
      setActivityLoading(true);
      const res = await apiFetch(getApiUrl('/api/dashboard/activity'), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setActivityData(data);
      }
    } catch {
      // Silently handle errors
    } finally {
      setActivityLoading(false);
      activityFetched.current = true;
    }
  }, []);

  // Click outside backdrop closes modal
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsActivityOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleProfileClick = () => {
    navigate('/dashboard/settings');
  };

  return (
    <>
      <header
        className={`
          sticky top-0 z-[40] flex items-center justify-between px-2 md:px-4 py-2
          border-b will-change-auto
          transition-[background-color,border-color,box-shadow,backdrop-filter] duration-150 ease-out
          ${scrolled
            ? 'bg-background/70 backdrop-blur-xl backdrop-saturate-150 border-border/50 shadow-[0_1px_20px_rgba(0,0,0,0.08)]'
            : 'bg-card border-border shadow-none backdrop-blur-none'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          <h2 className="text-xs md:text-sm font-semibold text-foreground hidden sm:block">
            Welcome back, {user?.name}
          </h2>
          <h2 className="text-xs font-semibold text-foreground sm:hidden">
            {user?.name?.split(' ')[0]}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          {/* Upgrade / Plan button */}
          <UpgradePlanButton />

          {/* Recent Activity Button */}
          <Button
            id="recent-activity-btn"
            variant="outline"
            size="sm"
            onClick={openActivityModal}
            className="h-7 text-xs px-2 gap-1.5 border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all hidden sm:flex items-center"
            aria-label="Open recent activity"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Recent Activity</span>
          </Button>

          {/* Mobile Recent Activity icon-only button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={openActivityModal}
            className="h-7 w-7 p-0 sm:hidden border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
            aria-label="Open recent activity"
          >
            <Activity className="h-4 w-4" />
          </Button>

          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* Notifications Dropdown */}
          <NotificationDropdown unreadCount={unreadAlerts} />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-7 w-7 rounded-full border border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.profile?.barCouncilNumber && (
                    <p className="text-xs leading-none text-muted-foreground">
                      Bar No: {user.profile.barCouncilNumber}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfileClick}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Recent Activity Modal */}
      {isActivityOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onMouseDown={handleBackdropMouseDown}
          role="dialog"
          aria-modal="true"
          aria-label="Recent Activity"
        >
          <div
            ref={modalRef}
            className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Recent Activity</h2>
              </div>
              <Button
                id="close-activity-modal-btn"
                variant="ghost"
                size="sm"
                onClick={() => setIsActivityOpen(false)}
                className="h-7 w-7 p-0 border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                aria-label="Close recent activity"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body — Scrollable */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <JuriqLoader size="sm" />
                </div>
              ) : activityData.length > 0 ? (
                <div className="space-y-3">
                  {activityData.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-full ${getActivityColor(activity.type)} text-white mt-0.5 flex-shrink-0`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium break-words">{activity.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeDate(activity.timestamp)}</p>
                        {activity.metadata && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {activity.type === 'payment_received' && (
                              <span>Amount: {formatCurrency(activity.metadata.amount)}</span>
                            )}
                            {activity.type === 'time_logged' && (
                              <span>{activity.metadata.durationText || `${activity.metadata.duration}m`} • {activity.metadata.billable ? 'Billable' : 'Non-billable'}</span>
                            )}
                            {(activity.type === 'case_created' || activity.type === 'case_updated') && (
                              <span>Priority: {activity.metadata.priority}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
