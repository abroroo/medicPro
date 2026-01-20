"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VisitTrendsChartProps {
  data: { date: string; count: number }[];
  isLoading?: boolean;
  selectedRange: number;
  onRangeChange: (days: number) => void;
}

const chartConfig = {
  count: {
    label: "Visits",
    color: "#10b981", // Emerald green
  },
} satisfies ChartConfig;

const rangeOptions = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
];

export function VisitTrendsChart({
  data,
  isLoading = false,
  selectedRange,
  onRangeChange,
}: VisitTrendsChartProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  const rangeLabels: Record<number, string> = {
    7: t('dashboard:timeRange.days7'),
    30: t('dashboard:timeRange.days30'),
    90: t('dashboard:timeRange.days90'),
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Format date for display
  const formattedData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  // Calculate total visits
  const totalVisits = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">{t('dashboard:charts.visitTrends')}</CardTitle>
            <CardDescription>
              {totalVisits} total visits in the last {selectedRange} days
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-1">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedRange === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onRangeChange(option.value)}
              className="h-8 px-3 text-xs"
            >
              {rangeLabels[option.value] || option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-count)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-count)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
              labelFormatter={(value) => value}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              fill="url(#fillVisits)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
