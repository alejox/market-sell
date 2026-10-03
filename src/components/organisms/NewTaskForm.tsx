"use client";

import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { SelectField, TextField } from "@/components/atoms/fields";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/labels";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/modules/tasks/domain/dev-task";

/** Creates a task. Notes are written afterwards on the task's own page. */
export function NewTaskForm({ action, assignees }: { action: BoundFormAction; assignees: string[] }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextField id="new-task-title" name="title" label="Título" required maxLength={200} placeholder="Qué hay que desarrollar" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <TextField id="new-task-assignee" name="assignee" label="Responsable" list="new-task-assignees" maxLength={80} autoComplete="off" />
          <datalist id="new-task-assignees">
            {assignees.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <SelectField id="new-task-status" name="status" label="Estado" defaultValue="todo">
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>
          ))}
        </SelectField>
        <SelectField id="new-task-priority" name="priority" label="Prioridad" defaultValue="medium">
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>
          ))}
        </SelectField>
        <TextField id="new-task-due" name="dueDate" label="Fecha límite" type="date" />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear tarea"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
