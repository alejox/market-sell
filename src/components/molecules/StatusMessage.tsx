export type StatusTone = "info" | "success" | "error";

const TONE_CLASSES: Record<StatusTone, string> = {
  info: "text-info",
  success: "text-success",
  error: "text-danger",
};

/**
 * An aria-live region for Server Action pending/success/error feedback.
 * Always rendered (even when empty) so assistive tech has a stable node to
 * watch — the message swaps in and out instead of the node appearing late.
 */
export function StatusMessage({ tone, message }: { tone: StatusTone; message: string | null }) {
  if (!message) {
    return <div aria-live="polite" className="sr-only" />;
  }

  return (
    <p role={tone === "error" ? "alert" : "status"} aria-live="polite" className={`text-sm font-medium ${TONE_CLASSES[tone]}`}>
      {message}
    </p>
  );
}
