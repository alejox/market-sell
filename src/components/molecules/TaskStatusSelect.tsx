"use client";

import { useState, useTransition } from "react";
import { TASK_STATUSES, type TaskStatus } from "@/modules/tasks/domain/dev-task";
import { TASK_STATUS_LABELS } from "@/components/labels";

/**
 * Moves a task between columns without leaving the page. Rendered in the
 * board and the table, so it is a small native <select> (keyboard- and
 * screen-reader-friendly) that calls the bound Server Action on change.
 */
export function TaskStatusSelect({
  taskTitle,
  status,
  action,
}: {
  taskTitle: string;
  status: TaskStatus;
  action: (status: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<TaskStatus>(status);

  // Re-sync when the server re-renders with a different status (e.g. after revalidation).
  const [seen, setSeen] = useState(status);
  if (seen !== status) {
    setSeen(status);
    setValue(status);
  }

  return (
    <select
      aria-label={`Estado de la tarea: ${taskTitle}`}
      value={value}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value as TaskStatus;
        setValue(next);
        startTransition(() => action(next));
      }}
      className="min-h-9 max-w-full rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
    >
      {TASK_STATUSES.map((option) => (
        <option key={option} value={option}>
          {TASK_STATUS_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
