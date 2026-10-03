import { Badge } from "@/components/atoms/Badge";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES } from "@/components/labels";
import { formatCalendarDate } from "@/components/format-date";
import { isOverdue, type DevTask } from "@/modules/tasks/domain/dev-task";

export function PriorityBadge({ priority }: { priority: DevTask["priority"] }) {
  return <Badge tone={TASK_PRIORITY_TONES[priority]}>Prioridad {TASK_PRIORITY_LABELS[priority].toLowerCase()}</Badge>;
}

export function AssigneeLabel({ assignee }: { assignee: string | null }) {
  return assignee ? <span className="text-on-surface">{assignee}</span> : <span className="text-muted-on">Sin asignar</span>;
}

/** Deadline with an explicit "Vencida" marker (text, never color alone) when it has passed. */
export function DueDate({ task, today }: { task: DevTask; today: string }) {
  if (task.dueDate === null) return <span className="text-muted-on">Sin fecha</span>;
  const overdue = isOverdue(task, today);
  return (
    <span className={overdue ? "font-medium text-danger" : "text-on-surface"}>
      {formatCalendarDate(task.dueDate)}
      {overdue && " · Vencida"}
    </span>
  );
}
