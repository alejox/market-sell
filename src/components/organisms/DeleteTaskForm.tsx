"use client";

import { Button } from "@/components/atoms/Button";

/** Deleting is permanent, so it asks first. Works as a plain form post to the bound Server Action. */
export function DeleteTaskForm({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar esta tarea y sus notas? Esta acción no se puede deshacer.")) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger">
        Eliminar tarea
      </Button>
    </form>
  );
}
