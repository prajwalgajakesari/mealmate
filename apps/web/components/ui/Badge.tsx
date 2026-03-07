import { clsx } from "clsx";

type BadgeStatus = "stocked" | "low" | "empty";

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

const statusStyles: Record<BadgeStatus, string> = {
  stocked: "bg-emerald-50 text-emerald-700 border-emerald-200",
  low: "bg-amber-50 text-amber-700 border-amber-200",
  empty: "bg-red-50 text-red-700 border-red-200",
};

const defaultLabels: Record<BadgeStatus, string> = {
  stocked: "Stocked",
  low: "Running Low",
  empty: "Empty",
};

export default function Badge({ status, label, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {label ?? defaultLabels[status]}
    </span>
  );
}
