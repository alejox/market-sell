"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_INVITE_STATE, type InviteFormAction } from "@/components/invite-state";
import { formatCalendarDate } from "@/components/format-date";

/** Creates a single-use invitation link and shows it once, with a copy button. */
export function InviteLinkForm({ action }: { action: InviteFormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_INVITE_STATE);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [hidden, setHidden] = useState(false);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} onSubmit={() => {
          setCopied("idle");
          setHidden(false);
        }} className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear enlace de invitación"}
        </Button>
        <StatusMessage tone="error" message={state.status === "error" ? state.message : null} />
      </form>

      {state.status === "created" && state.link && !hidden && (
        <div className="flex flex-col gap-3 rounded-2xl bg-accent p-4 text-accent-on">
          <p className="text-sm">
            Comparte este enlace con la persona. Sirve una sola vez
            {state.expiresAt ? ` y vence el ${formatCalendarDate(state.expiresAt.slice(0, 10))}` : ""}. No lo
            volverás a ver, así que cópialo ahora.
          </p>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="invite-link">Enlace de invitación</label>
            <input
              id="invite-link"
              readOnly
              value={state.link}
              onFocus={(event) => event.currentTarget.select()}
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface-raised px-3 font-mono text-xs text-on-surface"
            />
            <Button type="button" variant="primary" onClick={() => copy(state.link as string)}>
              {copied === "copied" ? "Copiado" : "Copiar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setHidden(true)}>
              Ocultar
            </Button>
          </div>
          {copied === "failed" && <p role="alert" className="text-sm">No se pudo copiar. Selecciona el enlace y cópialo a mano.</p>}
        </div>
      )}
    </div>
  );
}
