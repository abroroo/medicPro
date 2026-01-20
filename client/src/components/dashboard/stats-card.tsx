import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  isLoading?: boolean;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950",
    icon: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950",
    icon: "text-green-600 dark:text-green-400",
    accent: "bg-green-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950",
    icon: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950",
    icon: "text-red-600 dark:text-red-400",
    accent: "bg-red-500",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950",
    icon: "text-purple-600 dark:text-purple-400",
    accent: "bg-purple-500",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  isLoading = false,
}: StatsCardProps) {
  const colors = colorClasses[color];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute top-0 left-0 h-1 w-full", colors.accent)} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
            {trend && (
              <div className="flex items-center gap-1 text-sm">
                {trend.isPositive ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500" />
                )}
                <span className={cn(
                  "font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {trend.value}%
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-full", colors.bg)}>
            <Icon className={cn("h-6 w-6", colors.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
