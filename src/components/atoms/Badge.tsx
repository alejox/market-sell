export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-on border-border",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-info/10 text-info border-info/30",
  primary: "bg-primary/10 text-primary border-primary/30",
};

/**
 * A small labeled pill. Always carries a text label, never color alone —
 * state, provenance, and claim-basis meaning must be readable without
 * relying on color perception.
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
