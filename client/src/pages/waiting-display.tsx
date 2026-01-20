import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Stethoscope } from "lucide-react";
import { Queue as QueueItem, Patient } from "@shared/schema";

type QueueWithPatient = QueueItem & { patient: Patient };

export default function WaitingDisplay() {
  const { t } = useTranslation(["queue", "common"]);
  const { user } = useAuth();
  const isMobile = useIsMobile();
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

  const currentServing = queue.find((item) => item.status === "serving");
  const waitingQueue = queue
    .filter((item) => item.status === "waiting")
    .slice(0, 4);

  return (
    <div className="min-h-screen waiting-room-display flex flex-col">
      {/* Header */}
      <div className={`text-center ${isMobile ? "py-6" : "py-12"} text-white`}>
        <h1
          className={`${isMobile ? "text-3xl" : "text-6xl"} font-bold mb-4 flex items-center justify-center`}
        >
          <Stethoscope
            className={`${isMobile ? "mr-2 w-8 h-8" : "mr-4 w-16 h-16"}`}
          />
          <span className={isMobile ? "truncate max-w-xs" : ""}>
            {user?.name || "S Dental"}
          </span>
        </h1>
        <p className={`${isMobile ? "text-lg" : "text-2xl"} opacity-90`}>
          {t("queue:display.waitMessage")}
        </p>
        <div
          className={`${isMobile ? "text-base" : "text-xl"} opacity-75 mt-2`}
          data-testid="current-time"
        >
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Current Number Display */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div
            className={`bg-white/10 backdrop-blur-lg rounded-3xl ${isMobile ? "p-8 mb-8" : "p-16 mb-12"}`}
          >
            <p
              className={`text-white ${isMobile ? "text-2xl" : "text-4xl"} font-medium ${isMobile ? "mb-4" : "mb-8"}`}
            >
              {t("queue:display.nowServing")}
            </p>
            <div
              className={`text-white ${isMobile ? "text-6xl" : "text-9xl"} font-bold pulse-gentle`}
              data-testid="display-current-number"
            >
              {currentServing ? `#${currentServing.queueNumber}` : "--"}
            </div>
            {currentServing && (
              <p
                className={`text-white ${isMobile ? "text-lg mt-2" : "text-2xl mt-4"} opacity-75`}
              >
                {t("queue:display.thankYouWaiting")}
              </p>
            )}
          </div>

          {/* Next Numbers */}
          {waitingQueue.length > 0 && (
            <div
              className={`bg-white/10 backdrop-blur-lg rounded-2xl ${isMobile ? "p-4" : "p-8"}`}
            >
              <p
                className={`text-white ${isMobile ? "text-lg" : "text-2xl"} font-medium ${isMobile ? "mb-3" : "mb-6"}`}
              >
                {t("queue:display.nextInLine")}
              </p>
              <div
                className={`${isMobile ? "grid grid-cols-2 gap-4" : "flex justify-center space-x-8"}`}
              >
                {waitingQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`text-white ${isMobile ? "text-2xl text-center" : "text-4xl"} font-bold`}
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
      <div
        className={`text-center ${isMobile ? "py-4" : "py-8"} text-white/80`}
      >
        <p className={`${isMobile ? "text-base" : "text-xl"}`}>
          {t("queue:display.thankYouPatience")}
        </p>
        <p className={`${isMobile ? "text-sm" : "text-lg"} mt-2`}>
          {t("queue:display.updatesEvery")}
        </p>
        {/* Auto-refresh indicator */}
        <div className="mt-4">
          <div
            className="w-2 h-2 bg-white rounded-full mx-auto animate-pulse"
            data-testid="refresh-indicator"
          ></div>
        </div>
      </div>
    </div>
  );
}
