"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { SelectField, TextField } from "@/components/atoms/fields";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { NotesEditor } from "@/components/organisms/NotesEditor";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { PERSONAL_KIND_LABELS } from "@/components/labels";
import { PERSONAL_KINDS, type PersonalItem, type PersonalKind } from "@/modules/personal/domain/personal-item";

/** One personal task or note: title, type, done (tasks only) and a Markdown page, saved together. */
export function PersonalItemEditor({ item, action }: { item: PersonalItem; action: BoundFormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  const [kind, setKind] = useState<PersonalKind>(item.kind);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField id="personal-item-title" name="title" label="Título" required maxLength={200} defaultValue={item.title} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="personal-item-kind"
          name="kind"
          label="Tipo"
          value={kind}
          onChange={(event) => setKind(event.target.value as PersonalKind)}
        >
          {PERSONAL_KINDS.map((option) => (
            <option key={option} value={option}>{PERSONAL_KIND_LABELS[option]}</option>
          ))}
        </SelectField>
        {kind === "task" && (
          <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium text-on-surface">
            <input type="checkbox" name="done" defaultChecked={item.done} className="size-5 accent-primary" />
            Hecha
          </label>
        )}
      </div>

      <NotesEditor defaultValue={item.body} heading="Página" />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
