"use client";

import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";

/**
 * Triggers proposal generation. On success the action redirects to the new
 * proposal's page; on failure (e.g. no Gemini key configured) the error is
 * shown here instead of any template content ever being presented as AI
 * output.
 */
export function GenerateProposalForm({ action, label = "Generar propuesta" }: { action: BoundFormAction; label?: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Generando…" : label}
      </Button>
      <StatusMessage tone="error" message={state.status === "error" ? state.message : null} />
    </form>
  );
}
