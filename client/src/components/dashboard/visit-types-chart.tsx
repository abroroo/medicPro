"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VisitTypesChartProps {
  data: { type: string; count: number }[];
  isLoading?: boolean;
}

const typeColors: Record<string, string> = {
  Consultation: "#3b82f6", // Blue
  "Follow-up": "#10b981",  // Emerald
  Dental: "#f59e0b",       // Amber
  Emergency: "#ef4444",    // Red
  Gynecology: "#ec4899",   // Pink
};

const chartConfig = {
  count: {
    label: "Visits",
  },
} satisfies ChartConfig;

export function VisitTypesChart({ data, isLoading = false }: VisitTypesChartProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Prepare data with colors
  const chartData = data.map(item => ({
    ...item,
    fill: typeColors[item.type] || "hsl(var(--chart-1))",
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <div>
          <CardTitle className="text-lg">{t('dashboard:charts.visitTypes')}</CardTitle>
          <CardDescription>{t('common:fields.type')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="type"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => {
                // Truncate long names on mobile
                return value.length > 8 ? `${value.substring(0, 8)}...` : value;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
