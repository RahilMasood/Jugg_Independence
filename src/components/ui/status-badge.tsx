import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "pending" | "submitted" | "overdue";
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-warning/10 text-warning border-warning/20"
  },
  submitted: {
    label: "Submitted",
    className: "bg-success/10 text-success border-success/20"
  },
  overdue: {
    label: "Overdue",
    className: "bg-destructive/10 text-destructive border-destructive/20"
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
