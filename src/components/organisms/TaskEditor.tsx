"use client";

import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { SelectField, TextField } from "@/components/atoms/fields";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { NotesEditor } from "@/components/organisms/NotesEditor";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/labels";
import { TASK_PRIORITIES, TASK_STATUSES, type DevTask } from "@/modules/tasks/domain/dev-task";

/**
 * One task's page: its properties (state, owner, priority, deadline) and the
 * notebook body (`NotesEditor`); both properties and notes are saved together
 * by one Server Action.
 */
export function TaskEditor({
  task,
  assignees,
  action,
}: {
  task: DevTask;
  assignees: string[];
  action: BoundFormAction;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField id="task-title" name="title" label="Título" required maxLength={200} defaultValue={task.title} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField id="task-status" name="status" label="Estado" defaultValue={task.status}>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-2">
          <TextField
            id="task-assignee"
            name="assignee"
            label="Responsable"
            list="task-assignees"
            maxLength={80}
            autoComplete="off"
            defaultValue={task.assignee ?? ""}
          />
          <datalist id="task-assignees">
            {assignees.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <SelectField id="task-priority" name="priority" label="Prioridad" defaultValue={task.priority}>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>
          ))}
        </SelectField>
        <TextField id="task-due" name="dueDate" label="Fecha límite" type="date" defaultValue={task.dueDate ?? ""} />
      </div>

      <NotesEditor defaultValue={task.notes} />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
