import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Stethoscope } from "lucide-react";
import { Queue as QueueItem, Patient } from "@shared/schema";

type QueueWithPatient = QueueItem & { patient: Patient };

export default function WaitingDisplay() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: queue = [] } = useQuery<QueueWithPatient[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentServing = queue.find(item => item.status === 'serving');
  const waitingQueue = queue.filter(item => item.status === 'waiting').slice(0, 4);

  return (
    <div className="min-h-screen waiting-room-display flex flex-col">
      {/* Header */}
      <div className="text-center py-12 text-white">
        <h1 className="text-6xl font-bold mb-4 flex items-center justify-center">
          <Stethoscope className="mr-4 w-16 h-16" />
          {user?.name || 'Dental Clinic'}
        </h1>
        <p className="text-2xl opacity-90">Please wait for your number to be called</p>
        <div className="text-xl opacity-75 mt-2" data-testid="current-time">
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Current Number Display */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 mb-12">
            <p className="text-white text-4xl font-medium mb-8">NOW SERVING</p>
            <div 
              className="text-white text-9xl font-bold pulse-gentle" 
              data-testid="display-current-number"
            >
              {currentServing ? `#${currentServing.queueNumber}` : '--'}
            </div>
            {currentServing && (
              <p className="text-white text-2xl mt-4 opacity-75">
                Thank you for waiting
              </p>
            )}
          </div>

          {/* Next Numbers */}
          {waitingQueue.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <p className="text-white text-2xl font-medium mb-6">NEXT IN LINE</p>
              <div className="flex justify-center space-x-8">
                {waitingQueue.map((item) => (
                  <div 
                    key={item.id}
                    className="text-white text-4xl font-bold"
                    data-testid={`display-next-${item.queueNumber}`}
                  >
                    #{item.queueNumber}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-white/80">
        <p className="text-xl">Thank you for your patience</p>
        <p className="text-lg mt-2">Updates every 10 seconds</p>
        {/* Auto-refresh indicator */}
        <div className="mt-4">
          <div className="w-2 h-2 bg-white rounded-full mx-auto animate-pulse" data-testid="refresh-indicator"></div>
        </div>
      </div>
    </div>
  );
}
