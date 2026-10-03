"use client";

import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField } from "@/components/atoms/fields";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { DISPLAY_NAME_MAX, JOB_TITLE_MAX } from "@/modules/team/domain/profile";

/** Name and job title: what the rest of the team sees next to your tasks. */
export function ProfileForm({
  action,
  displayName,
  jobTitle,
}: {
  action: BoundFormAction;
  displayName: string;
  jobTitle: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField id="profile-name" name="displayName" label="Nombre" required maxLength={DISPLAY_NAME_MAX} defaultValue={displayName} autoComplete="name" />
      <TextField
        id="profile-title"
        name="jobTitle"
        label="Cargo"
        hint="Opcional. Por ejemplo: Desarrolladora backend."
        maxLength={JOB_TITLE_MAX}
        defaultValue={jobTitle ?? ""}
        autoComplete="organization-title"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar perfil"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
