import { Link, useLocation } from 'react-router-dom';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  BookOpen,
  Receipt,
  FolderOpen,
  Settings,
  Scale,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  ChevronsLeftRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLegalData } from '@/contexts/LegalDataContext';
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cases', href: '/dashboard/cases', icon: FileText },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Legal Research', href: '/dashboard/legal-research', icon: BookOpen },
  { name: 'Billing', href: '/dashboard/billing', icon: Receipt },
  { name: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const { alerts } = useLegalData();
  const { state, toggleSidebar, setOpen, isMobile } = useSidebar();
  const unreadAlerts = alerts.filter(alert => !alert.isRead).length;
  const hoverCollapsedRef = useRef(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);

  const handleMouseEnter = () => {
    if (isMobile || isPinnedExpanded) return;
    hoverCollapsedRef.current = state === 'collapsed';
    if (hoverCollapsedRef.current) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (isMobile || isPinnedExpanded) return;
    if (hoverCollapsedRef.current) {
      setOpen(false);
      hoverCollapsedRef.current = false;
    }
  };

  const handlePinToggle = () => {
    if (isMobile) {
      toggleSidebar();
      return;
    }

    if (isPinnedExpanded) {
      setIsPinnedExpanded(false);
      setOpen(false);
    } else {
      setIsPinnedExpanded(true);
      setOpen(true);
    }
  };

  return (
    <SidebarComponent
      className="border-sidebar-border group hover:[&_[data-sidebar=group-label]]:opacity-100"
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader className="border-b border-sidebar-border px-3">
        <div className="flex items-center gap-2 py-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-md bg-primary/10">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          {state !== "collapsed" && (
            <div className="min-w-0 text-left">
              <h1 className="text-lg font-bold text-sidebar-foreground truncate leading-tight">LegalPro</h1>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Indian Law Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                        {item.name === 'Dashboard' && unreadAlerts > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                            {unreadAlerts}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={location.pathname === '/dashboard/news' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}>
                  <Link to="/dashboard/news" className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    <span>News</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Desktop expand/collapse control at bottom */}
      <SidebarFooter className="border-t border-sidebar-border mt-auto">
        <div className="w-full px-2 py-2 flex items-center justify-center">
          <button
            onClick={handlePinToggle}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
            title={
              isMobile
                ? state === 'collapsed' ? 'Expand' : 'Collapse'
                : isPinnedExpanded
                  ? 'Unpin and collapse'
                  : 'Pin expanded'
            }
          >
            <ChevronsLeftRight className="h-4 w-4" />
            <span className="sr-only">
              {isMobile
                ? state === 'collapsed' ? 'Expand' : 'Collapse'
                : isPinnedExpanded
                  ? 'Unpin and collapse'
                  : 'Pin expanded'}
            </span>
          </button>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
};