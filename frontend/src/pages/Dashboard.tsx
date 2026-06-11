import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Users,
  Calendar,
  AlertTriangle,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useLegalData } from '@/contexts/LegalDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, apiFetch } from '@/lib/api';
import MiniCalendar from '@/components/MiniCalendar';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  todaysCases: number;
  urgentCases: number;
  totalClients: number;
}

const Dashboard = () => {
  const { cases, clients } = useLegalData();
  const { user } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [_loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Trap the back button when we are on the dashboard root
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      // Prevent leaving the dashboard root by pushing the state right back
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const statsRes = await apiFetch(getApiUrl('/api/dashboard/stats'), { credentials: 'include' });

        if (statsRes.ok) {
          const stats = await statsRes.json();
          setDashboardStats(stats);
        }
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const todaysCases = cases.filter(c => {
    const today = new Date();
    const caseDate = new Date(c.hearingDate);
    return caseDate.toDateString() === today.toDateString();
  });

  const urgentCases = cases.filter(c => c.priority === 'urgent');
  const activeCases = cases.filter(c => c.status === 'active');

  // formatCurrency is provided by useFormatting hook

  const stats = [
    {
      title: "Total Cases",
      value: dashboardStats?.totalCases ?? cases.length,
      description: `${dashboardStats?.activeCases ?? activeCases.length} active`,
      icon: FileText,
      trend: undefined
    },
    {
      title: "Clients",
      value: dashboardStats?.totalClients ?? clients.length,
      description: "Total registered",
      icon: Users,
      trend: undefined
    },
    {
      title: "Today's Hearings",
      value: dashboardStats?.todaysCases ?? todaysCases.length,
      description: "Scheduled for today",
      icon: Calendar,
      trend: (dashboardStats?.urgentCases ?? urgentCases.length) > 0 ? `${dashboardStats?.urgentCases ?? urgentCases.length} urgent` : "No urgent cases"
    },
    {
      title: "Urgent Cases",
      value: dashboardStats?.urgentCases ?? urgentCases.length,
      description: (dashboardStats?.urgentCases ?? urgentCases.length) > 0 ? "Requires immediate attention" : "No urgent matters",
      icon: AlertTriangle,
      trend: undefined
    }
  ];

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-xs text-muted-foreground">
            Here's what's happening with your practice today
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            onClick={() => navigate('/dashboard/cases')}
            className="flex-1 sm:flex-initial h-8 text-xs border border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
            size="sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Case
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/clients')}
            className="flex-1 sm:flex-initial h-8 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
            size="sm"
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {stats.map((stat, index) => (
          <Card key={index} className="card-gradient shadow-elevated transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold text-primary">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground">{stat.description}</p>
              {stat.trend && (
                <div className="flex items-center pt-0.5">
                  <TrendingUp className="h-2.5 w-2.5 text-success mr-0.5" />
                  <span className="text-[10px] text-success">{stat.trend}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid — MiniCalendar owns its own 2-col layout internally */}
      <div className="w-full">
        <MiniCalendar />
      </div>
    </div>
  );
};

export default Dashboard;
