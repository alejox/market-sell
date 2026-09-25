export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-on",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  info: "border-info/20 bg-info/10 text-info",
  primary: "border-primary/20 bg-primary/5 text-primary",
};

/**
 * A small labeled pill. Always carries a text label, never color alone —
 * state, provenance, and claim-basis meaning must be readable without
 * relying on color perception.
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
