import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Bell, Settings } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useLegalData } from '@/contexts/LegalDataContext';
import { useNavigate } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';

export const Header = () => {
  const { user, logout } = useAuth();
  const { alerts } = useLegalData();
  const navigate = useNavigate();
  const unreadAlerts = alerts.filter(alert => !alert.isRead).length;

  const handleLogout = () => {
    logout();
  };

  const handleProfileClick = () => {
    navigate('/dashboard/settings');
  };

  return (
    <header className="flex items-center justify-between px-2 md:px-4 py-2 bg-card border-b border-border">
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
                {user?.barNumber && (
                  <p className="text-xs leading-none text-muted-foreground">
                    Bar No: {user.barNumber}
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
  );
};
