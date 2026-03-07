import { clsx } from "clsx";

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: "primary" | "secondary" | "success" | "warning";
  className?: string;
}

const colorStyles = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
};

export default function ProgressBar({
  label,
  value,
  max,
  unit = "",
  color = "primary",
  className,
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className={clsx("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-text-secondary">
          {value}
          {unit} / {max}
          {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-500 ease-out",
            colorStyles[color]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
