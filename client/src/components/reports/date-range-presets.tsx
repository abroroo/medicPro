import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";

interface DateRangePresetsProps {
  onSelect: (from: string, to: string, preset: string) => void;
  selected: string;
}

const presetValues = [
  { key: "today", value: "today" },
  { key: "thisWeek", value: "this-week" },
  { key: "thisMonth", value: "this-month" },
  { key: "last30Days", value: "last-30" },
  { key: "last90Days", value: "last-90" },
  { key: "allTime", value: "all" },
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
  const { t } = useTranslation(['reports']);

  const presets = presetValues.map((preset) => ({
    label: t(`reports:datePresets.${preset.key}`),
    value: preset.value,
  }));

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
