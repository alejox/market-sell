"use client";

import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { PERSONAL_KIND_LABELS } from "@/components/labels";
import { PERSONAL_KINDS } from "@/modules/personal/domain/personal-item";

/** Quick add: a title and whether it is a task or a note. The body is written afterwards on its own page. */
export function NewPersonalItemForm({ action }: { action: BoundFormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);

  return (
    <form action={formAction} key={state.status === "success" ? "reset" : "idle"} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
        <label htmlFor="personal-title" className="text-sm font-medium text-on-surface">Título</label>
        <input
          id="personal-title"
          name="title"
          required
          maxLength={200}
          placeholder="Qué quieres recordar o anotar"
          className="min-h-11 w-full rounded-2xl border border-border bg-muted px-4 text-sm text-on-surface placeholder:text-muted-on focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="personal-kind" className="text-sm font-medium text-on-surface">Tipo</label>
        <select
          id="personal-kind"
          name="kind"
          defaultValue="task"
          className="min-h-11 rounded-2xl border border-border bg-muted px-4 text-sm text-on-surface focus-visible:ring-2 focus-visible:ring-primary"
        >
          {PERSONAL_KINDS.map((kind) => (
            <option key={kind} value={kind}>{PERSONAL_KIND_LABELS[kind]}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Guardando…" : "Añadir"}
      </Button>
      <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
    </form>
  );
}
