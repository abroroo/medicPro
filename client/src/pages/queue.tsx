import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Check 
} from "lucide-react";
import { Queue as QueueItem, Patient } from "@shared/schema";

type QueueWithPatient = QueueItem & { patient: Patient };

export default function Queue() {
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'serving': return 'default';
      case 'waiting': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'serving': return 'bg-yellow-500';
      case 'waiting': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Queue Management</h2>
            <p className="text-muted-foreground mt-2">Manage today's waiting queue</p>
          </div>
          <div className="flex space-x-3">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <div className="space-y-4">
                {queue.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
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
                      <div>
                        <p className="font-medium text-foreground" data-testid={`patient-name-${item.id}`}>
                          {item.patient.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Added at {new Date(item.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={getStatusBadgeVariant(item.status)}
                        data-testid={`status-${item.id}`}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                      
                      {item.status === 'serving' && (
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
                      )}
                    </div>
                  </div>
                ))}
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
