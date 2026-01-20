import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";

interface DateRangePresetsProps {
  onSelect: (from: string, to: string, preset: string) => void;
  selected: string;
}

const presets = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "Last 30 Days", value: "last-30" },
  { label: "Last 90 Days", value: "last-90" },
  { label: "All Time", value: "all" },
];

function getDateRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  switch (preset) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "this-week":
      return {
        from: format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd"),
        to: todayStr,
      };
    case "this-month":
      return {
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: todayStr,
      };
    case "last-30":
      return {
        from: format(subDays(today, 30), "yyyy-MM-dd"),
        to: todayStr,
      };
    case "last-90":
      return {
        from: format(subDays(today, 90), "yyyy-MM-dd"),
        to: todayStr,
      };
    case "all":
    default:
      return { from: "", to: "" };
  }
}

export function DateRangePresets({ onSelect, selected }: DateRangePresetsProps) {
  const handlePresetClick = (preset: string) => {
    const { from, to } = getDateRange(preset);
    onSelect(from, to, preset);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.value}
          variant={selected === preset.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(preset.value)}
          className={cn(
            "h-8 px-3 text-xs transition-colors",
            selected === preset.value && "shadow-sm"
          )}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
