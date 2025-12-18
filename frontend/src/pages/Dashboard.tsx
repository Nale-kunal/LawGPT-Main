import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  Calendar,
  AlertTriangle,
  Clock,
  Gavel,
  TrendingUp,
  IndianRupee,
  Plus,
  Activity,
  CheckCircle,
  UserPlus,
  Timer,
  Receipt
} from 'lucide-react';
import { useLegalData } from '@/contexts/LegalDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { AlertManager } from '@/components/AlertManager';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '@/lib/api';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  todaysCases: number;
  urgentCases: number;
  totalClients: number;
  revenue: {
    currentMonth: number;
    growth: string;
    invoiced: number;
    billable: number;
    billableHours: number;
  };
}

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  metadata: any;
}

const Dashboard = () => {
  const { cases, clients, alerts } = useLegalData();
  const { user } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const [statsRes, activityRes] = await Promise.all([
          fetch(getApiUrl('/api/dashboard/stats'), { credentials: 'include' }),
          fetch(getApiUrl('/api/dashboard/activity'), { credentials: 'include' })
        ]);
        
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setDashboardStats(stats);
        }
        
        if (activityRes.ok) {
          const activity = await activityRes.json();
          setRecentActivity(activity);
        }
      } catch (error) {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const todaysCases = cases.filter(c => {
    const today = new Date();
    const caseDate = new Date(c.hearingDate);
    return caseDate.toDateString() === today.toDateString();
  });

  const urgentCases = cases.filter(c => c.priority === 'urgent');
  const activeCases = cases.filter(c => c.status === 'active');
  const unreadAlerts = alerts.filter(a => !a.isRead);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'case_created':
      case 'case_updated':
        return <FileText className="h-4 w-4" />;
      case 'client_registered':
        return <UserPlus className="h-4 w-4" />;
      case 'payment_received':
        return <Receipt className="h-4 w-4" />;
      case 'invoice_created':
        return <IndianRupee className="h-4 w-4" />;
      case 'time_logged':
        return <Timer className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

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
      title: "Revenue This Month",
      value: dashboardStats?.revenue ? formatCurrency(dashboardStats.revenue.currentMonth) : "₹0",
      description: dashboardStats?.revenue && dashboardStats.revenue.billableHours > 0 
        ? `${dashboardStats.revenue.billableHours.toFixed(1)} billable hours` 
        : "Billing & payments",
      icon: IndianRupee,
      trend: dashboardStats?.revenue && dashboardStats.revenue.growth !== undefined
        ? `${parseFloat(dashboardStats.revenue.growth) >= 0 ? '+' : ''}${dashboardStats.revenue.growth}% from last month`
        : undefined
    }
  ];

  const quickActions = [
    {
      title: "Add New Case",
      description: "Register a new legal case",
      icon: FileText,
      action: () => navigate('/dashboard/cases'),
      color: "bg-primary"
    },
    {
      title: "Schedule Hearing",
      description: "Add court appearance",
      icon: Calendar,
      action: () => navigate('/dashboard/calendar'),
      color: "bg-secondary"
    },
    {
      title: "Add Client",
      description: "Register new client",
      icon: Users,
      action: () => navigate('/dashboard/clients'),
      color: "bg-accent"
    },
    {
      title: "Legal Research",
      description: "Search law database",
      icon: Gavel,
      action: () => navigate('/dashboard/legal-research'),
      color: "bg-warning"
    }
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Here's what's happening with your practice today
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => navigate('/dashboard/cases')}
            className="flex-1 sm:flex-initial"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard/clients')}
            className="flex-1 sm:flex-initial"
          >
            <Users className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="card-gradient shadow-elevated hover:shadow-professional transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              {stat.trend && (
                <div className="flex items-center pt-1">
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-xs text-success">{stat.trend}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Today's Cases */}
        <div className="lg:col-span-2 xl:col-span-2">
          <Card className="card-gradient shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Hearings ({todaysCases.length})
              </CardTitle>
              <CardDescription>Cases scheduled for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {todaysCases.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hearings scheduled for today
                  </p>
                ) : (
                  todaysCases.map((case_item) => (
                    <div key={case_item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/20 rounded-lg border">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-medium text-sm">{case_item.caseNumber}</span>
                          <Badge 
                            variant={case_item.priority === 'urgent' ? 'destructive' : 'secondary'}
                            className="w-fit"
                          >
                            {case_item.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{case_item.clientName} vs {case_item.opposingParty}</p>
                        <p className="text-xs text-muted-foreground">
                          {case_item.courtName} • {case_item.hearingTime}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate('/dashboard/cases')}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => navigate('/dashboard/calendar')}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {todaysCases.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/dashboard/calendar')}
                  >
                    View Full Calendar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          {/* Alerts */}
          <AlertManager />

          {/* Quick Actions */}
          <Card className="card-gradient shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="flex items-center justify-start gap-3 p-3 h-auto text-left"
                    onClick={action.action}
                  >
                    <div className={`p-2 rounded-lg ${action.color} text-white`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{action.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-gradient shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full ${getActivityColor(activity.type)} text-white mt-0.5 flex-shrink-0`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium break-words">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                        {activity.metadata && (
                          <div className="text-xs text-muted-foreground mt-1">
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
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;