import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Users,
  Clock,
  CheckCircle,
  Database,
  UserPlus,
  PlusCircle,
  Monitor,
  Activity,
  CalendarDays
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { VisitTrendsChart } from "@/components/dashboard/visit-trends-chart";
import { VisitStatusChart } from "@/components/dashboard/visit-status-chart";
import { DoctorsChart } from "@/components/dashboard/doctors-chart";
import { VisitTypesChart } from "@/components/dashboard/visit-types-chart";
import { useAuth } from "@/hooks/use-auth";

interface ChartData {
  visitTrends: { date: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  doctorPerformance: { name: string; visits: number }[];
  typeDistribution: { type: string; count: number }[];
}

interface QueueStats {
  waiting: number;
  serving: number;
  completed: number;
  skipped: number;
  cancelled: number;
}

interface PatientStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
}

interface QueueItem {
  id: number;
  queueNumber: number;
  status: string;
  createdAt: string;
  patient: {
    name: string;
  };
  visitType?: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState(30);
  const { user } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);

  const { data: queueStats, isLoading: queueStatsLoading } = useQuery<QueueStats>({
    queryKey: ["/api/queue/stats"],
  });

  const { data: patientStats, isLoading: patientStatsLoading } = useQuery<PatientStats>({
    queryKey: ["/api/reports/stats"],
  });

  const { data: queue, isLoading: queueLoading } = useQuery<QueueItem[]>({
    queryKey: ["/api/queue"],
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<ChartData>({
    queryKey: ["/api/dashboard/chart-data", { days: timeRange }],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/chart-data?days=${timeRange}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }
      return response.json();
    },
  });

  const recentActivity = queue?.slice(-8).reverse() || [];
  const isLoading = queueStatsLoading || patientStatsLoading || chartLoading;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('common:status.completed');
      case 'serving': return t('dashboard:recentActivity.currentlyServing');
      case 'cancelled': return t('common:status.cancelled');
      case 'skipped': return t('common:status.skipped');
      default: return t('common:status.waiting');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">{t('dashboard:title')}</h2>
          <p className="text-muted-foreground mt-2">
            {t('dashboard:welcome', { name: user?.firstName ? `, ${user.firstName}` : '' })}
          </p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title={t('dashboard:stats.todaysPatients')}
            value={patientStats?.today || 0}
            icon={CalendarDays}
            color="blue"
            isLoading={patientStatsLoading}
          />
          <StatsCard
            title={t('dashboard:stats.inQueue')}
            value={queueStats?.waiting || 0}
            icon={Clock}
            color="amber"
            isLoading={queueStatsLoading}
          />
          <StatsCard
            title={t('dashboard:stats.completedToday')}
            value={queueStats?.completed || 0}
            icon={CheckCircle}
            color="green"
            isLoading={queueStatsLoading}
          />
          <StatsCard
            title={t('dashboard:stats.totalPatients')}
            value={patientStats?.total || 0}
            icon={Users}
            color="purple"
            isLoading={patientStatsLoading}
          />
        </div>

        {/* Visit Trends Chart - Full Width */}
        <div className="mb-8">
          <VisitTrendsChart
            data={chartData?.visitTrends || []}
            isLoading={chartLoading}
            selectedRange={timeRange}
            onRangeChange={setTimeRange}
          />
        </div>

        {/* Status Distribution and Doctor Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <VisitStatusChart
            data={chartData?.statusDistribution || []}
            isLoading={chartLoading}
          />
          <DoctorsChart
            data={chartData?.doctorPerformance || []}
            isLoading={chartLoading}
          />
        </div>

        {/* Visit Types Chart - Full Width */}
        <div className="mb-8">
          <VisitTypesChart
            data={chartData?.typeDistribution || []}
            isLoading={chartLoading}
          />
        </div>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard:quickActions.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => setLocation("/patients")}
                data-testid="quick-action-add-patient"
              >
                <UserPlus className="text-primary mr-3 w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{t('dashboard:quickActions.addNewPatient')}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard:quickActions.addNewPatientDesc')}</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => setLocation("/queue")}
                data-testid="quick-action-add-queue"
              >
                <PlusCircle className="text-blue-600 mr-3 w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{t('dashboard:quickActions.addToQueue')}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard:quickActions.addToQueueDesc')}</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => setLocation("/display")}
                data-testid="quick-action-display"
              >
                <Monitor className="text-green-600 mr-3 w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{t('dashboard:quickActions.waitingRoomDisplay')}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard:quickActions.waitingRoomDisplayDesc')}</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                {t('dashboard:recentActivity.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm">{t('dashboard:recentActivity.noActivity')}</p>
                  <p className="text-muted-foreground text-xs mt-1">{t('dashboard:recentActivity.activityAppears')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3" data-testid={`activity-${item.id}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.status === 'completed' ? 'bg-green-500' :
                        item.status === 'serving' ? 'bg-yellow-500' :
                        item.status === 'cancelled' ? 'bg-red-500' :
                        item.status === 'skipped' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          #{item.queueNumber} - {item.patient?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getStatusLabel(item.status)}
                          {item.visitType && ` • ${item.visitType}`}
                          {' • '}
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
