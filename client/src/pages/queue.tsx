import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddToQueueModal } from "@/components/add-to-queue-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Megaphone, 
  Plus, 
  Check,
  SkipForward,
  X
} from "lucide-react";
import { Queue as QueueItem, Patient } from "@shared/schema";

type QueueWithPatient = QueueItem & { patient: Patient };

export default function Queue() {
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: queue = [], isLoading } = useQuery<QueueWithPatient[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const { data: queueStats } = useQuery({
    queryKey: ["/api/queue/stats"],
    refetchInterval: 5000,
  });

  const updateQueueMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/queue/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentServing = queue.find(item => item.status === 'serving');
  const nextInLine = queue.find(item => item.status === 'waiting');
  const waitingCount = queue.filter(item => item.status === 'waiting').length;

  // Group queue items for better visual separation
  const activeQueue = queue.filter(item => ['serving', 'waiting'].includes(item.status));
  const completedQueue = queue.filter(item => ['completed', 'cancelled', 'skipped'].includes(item.status));

  const handleCallNext = () => {
    if (currentServing) {
      // Mark current as completed and call next
      updateQueueMutation.mutate({ id: currentServing.id, status: 'completed' });
    }
    
    if (nextInLine) {
      updateQueueMutation.mutate({ id: nextInLine.id, status: 'serving' });
      toast({
        title: "Called Next Patient",
        description: `Patient #${nextInLine.queueNumber} - ${nextInLine.patient.name}`,
      });
    }
  };

  const handleMarkComplete = (id: number) => {
    updateQueueMutation.mutate({ id, status: 'completed' });
    toast({
      title: "Patient Completed",
      description: "Patient service marked as completed",
    });
  };

  const handleSkipPatient = (id: number) => {
    updateQueueMutation.mutate({ id, status: 'skipped' });
    toast({
      title: "Patient Skipped",
      description: "Patient skipped, visit marked as unattended",
      variant: "default",
    });
  };

  const handleCancelPatient = (id: number) => {
    updateQueueMutation.mutate({ id, status: 'cancelled' });
    toast({
      title: "Patient Cancelled",
      description: "Patient cancelled, visit marked as unattended",
      variant: "default",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'serving': return 'default';
      case 'waiting': return 'secondary';
      case 'completed': return 'outline';
      case 'skipped': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'serving': return 'bg-yellow-500';
      case 'waiting': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'skipped': return 'bg-orange-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-center'} mb-6`}>
          <div>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>Queue Management</h2>
            <p className="text-muted-foreground mt-2">Manage today's waiting queue</p>
          </div>
          <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'flex space-x-3'}`}>
            <Button 
              onClick={handleCallNext}
              disabled={!nextInLine || updateQueueMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-call-next"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Call Next
            </Button>
            <Button 
              onClick={() => setIsModalOpen(true)}
              data-testid="button-add-to-queue"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Queue
            </Button>
          </div>
        </div>

        {/* Current Status */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-6'} mb-8`}>
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Currently Serving</h3>
              <div className="text-4xl font-bold text-primary" data-testid="current-serving">
                {currentServing ? `#${currentServing.queueNumber}` : '--'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {currentServing ? currentServing.patient.name : 'No one being served'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Next in Line</h3>
              <div className="text-4xl font-bold text-secondary" data-testid="next-in-line">
                {nextInLine ? `#${nextInLine.queueNumber}` : '--'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {nextInLine ? nextInLine.patient.name : 'No one waiting'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">In Queue</h3>
              <div className="text-4xl font-bold text-amber-600" data-testid="waiting-count">
                {waitingCount}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Patients waiting</p>
            </CardContent>
          </Card>
        </div>

        {/* Queue List */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading queue...</div>
            ) : queue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No patients in queue today.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Queue Section */}
                {activeQueue.length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <h3 className="text-lg font-semibold text-foreground">Active Queue</h3>
                      <div className="flex-1 border-b border-border ml-4"></div>
                    </div>
                    <div className="space-y-3">
                      {activeQueue.map((item) => (
                        <div
                          key={item.id}
                          className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between'} p-4 border border-border rounded-lg hover:bg-accent transition-colors`}
                          data-testid={`queue-item-${item.id}`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 ${
                              item.status === 'serving' ? 'bg-primary' :
                              item.status === 'waiting' ? 'bg-secondary' : 'bg-muted'
                            } text-white rounded-full flex items-center justify-center font-bold text-lg`}>
                              <span data-testid={`queue-number-${item.id}`}>
                                {item.queueNumber}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground" data-testid={`patient-name-${item.id}`}>
                                {item.patient.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Added at {new Date(item.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            {!isMobile && (
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={getStatusBadgeVariant(item.status)}
                                  data-testid={`status-${item.id}`}
                                >
                                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                </Badge>

                                {item.status === 'serving' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkComplete(item.id)}
                                      disabled={updateQueueMutation.isPending}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      data-testid={`button-complete-${item.id}`}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Complete
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSkipPatient(item.id)}
                                      disabled={updateQueueMutation.isPending}
                                      className="bg-orange-600 hover:bg-orange-700 text-white"
                                      data-testid={`button-skip-${item.id}`}
                                    >
                                      <SkipForward className="w-4 h-4 mr-1" />
                                      Skip
                                    </Button>
                                  </>
                                )}

                                {(item.status === 'waiting' || item.status === 'serving') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCancelPatient(item.id)}
                                    disabled={updateQueueMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    data-testid={`button-cancel-${item.id}`}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {isMobile && (
                            <div className="flex items-center justify-between w-full">
                              <Badge
                                variant={getStatusBadgeVariant(item.status)}
                                data-testid={`status-${item.id}`}
                              >
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </Badge>

                              {item.status === 'serving' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkComplete(item.id)}
                                    disabled={updateQueueMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    data-testid={`button-complete-${item.id}`}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Complete
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSkipPatient(item.id)}
                                    disabled={updateQueueMutation.isPending}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                    data-testid={`button-skip-${item.id}`}
                                  >
                                    <SkipForward className="w-4 h-4 mr-1" />
                                    Skip
                                  </Button>
                                </div>
                              )}

                              {(item.status === 'waiting' || item.status === 'serving') && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCancelPatient(item.id)}
                                  disabled={updateQueueMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  data-testid={`button-cancel-${item.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Queue Section */}
                {completedQueue.length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                      <h3 className="text-lg font-semibold text-muted-foreground">Completed Today</h3>
                      <div className="flex-1 border-b border-border ml-4"></div>
                    </div>
                    <div className="space-y-3">
                      {completedQueue.map((item) => (
                        <div
                          key={item.id}
                          className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between'} p-4 border border-border rounded-lg bg-muted/30 opacity-75`}
                          data-testid={`queue-item-${item.id}`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-bold text-lg">
                              <span data-testid={`queue-number-${item.id}`}>
                                {item.queueNumber}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-muted-foreground" data-testid={`patient-name-${item.id}`}>
                                {item.patient.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Added at {new Date(item.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={getStatusBadgeVariant(item.status)}
                                data-testid={`status-${item.id}`}
                              >
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {activeQueue.length === 0 && completedQueue.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No patients in queue today.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add to Queue Modal */}
        <AddToQueueModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      </div>
    </div>
  );
}
