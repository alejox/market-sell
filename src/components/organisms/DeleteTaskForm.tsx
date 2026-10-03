"use client";

import { Button } from "@/components/atoms/Button";

/** Deleting is permanent, so it asks first. Works as a plain form post to the bound Server Action. */
export function DeleteTaskForm({
  action,
  label = "Eliminar tarea",
  message = "¿Eliminar esta tarea y sus notas? Esta acción no se puede deshacer.",
}: {
  action: () => Promise<void>;
  label?: string;
  message?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger">
        {label}
      </Button>
    </form>
  );
}
