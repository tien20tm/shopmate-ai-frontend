import { cn } from "@/lib/utils";

const TRACK_STEPS = [
  { status: "pending", label: "Chờ xác nhận" },
  { status: "processing", label: "Đang xử lý" },
  { status: "shipped", label: "Đang giao" },
  { status: "delivered", label: "Đã giao" },
];

const PILL_STYLES: Record<string, string> = {
  pending: "bg-status-amber-tint text-status-amber",
  processing: "bg-status-amber-tint text-status-amber",
  shipped: "bg-status-blue-tint text-status-blue",
  delivered: "bg-accent text-accent-foreground",
  cancelled: "bg-alert-tint text-alert",
};

export function statusLabel(status: string): string {
  if (status === "cancelled") return "Đã hủy";
  return TRACK_STEPS.find((step) => step.status === status)?.label ?? status;
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
        PILL_STYLES[status] ?? "bg-muted text-soft",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

interface StatusTrackProps {
  status: string;
  showLabels?: boolean;
}

export function StatusTrack({ status, showLabels = false }: StatusTrackProps) {
  const currentIndex = TRACK_STEPS.findIndex((step) => step.status === status);

  // Cancelled orders do not record which step they stopped at, and a status
  // the frontend does not know yet has no place on the track.
  if (currentIndex === -1) return null;

  return (
    <ol
      aria-label={`Trạng thái: ${statusLabel(status)}`}
      className="grid grid-cols-4 gap-1.5"
    >
      {TRACK_STEPS.map((step, index) => (
        <li
          key={step.status}
          aria-current={index === currentIndex ? "step" : undefined}
        >
          <div
            className={cn(
              "h-1.5 rounded-full",
              index <= currentIndex ? "bg-primary" : "bg-line",
            )}
          />
          {showLabels && (
            <span
              className={cn(
                "mt-1.5 block text-xs md:text-sm",
                index === currentIndex ? "font-bold" : "text-soft",
              )}
            >
              {step.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
