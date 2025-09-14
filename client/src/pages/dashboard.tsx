import { useQuery } from "@tanstack/react-query";
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
  Activity
} from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: queueStats } = useQuery({
    queryKey: ["/api/queue/stats"],
  });

  const { data: patientStats } = useQuery({
    queryKey: ["/api/reports/stats"],
  });

  const { data: queue } = useQuery({
    queryKey: ["/api/queue"],
  });

  const recentActivity = (queue as any[])?.slice(-4).reverse() || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's what's happening at your clinic today.
          </p>
        </div>

        {/* Compact Stats Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Today's Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div>
                  <p className="text-lg font-bold text-foreground" data-testid="stat-today-patients">
                    {(patientStats as any)?.today || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Today's Patients</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div>
                  <p className="text-lg font-bold text-foreground" data-testid="stat-queue-length">
                    {(queueStats as any)?.waiting || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Queue</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div>
                  <p className="text-lg font-bold text-foreground" data-testid="stat-completed">
                    {(queueStats as any)?.completed || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div>
                  <p className="text-lg font-bold text-foreground" data-testid="stat-total-patients">
                    {(patientStats as any)?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Patients</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
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
                  <p className="font-medium text-foreground">Add New Patient</p>
                  <p className="text-sm text-muted-foreground">Register a new patient in the system</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => setLocation("/queue")}
                data-testid="quick-action-add-queue"
              >
                <PlusCircle className="text-secondary mr-3 w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Add to Queue</p>
                  <p className="text-sm text-muted-foreground">Add patient to today's waiting queue</p>
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
                  <p className="font-medium text-foreground">Waiting Room Display</p>
                  <p className="text-sm text-muted-foreground">Show queue status on waiting room screen</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((item: any) => (
                    <div key={item.id} className="flex items-center space-x-3" data-testid={`activity-${item.id}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'completed' ? 'bg-green-500' : 
                        item.status === 'serving' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Patient #{item.queueNumber} - {item.patient?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.status === 'completed' ? 'Service completed' : 
                           item.status === 'serving' ? 'Currently serving' : 'Added to queue'} •{' '}
                          {new Date(item.createdAt).toLocaleTimeString()}
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
