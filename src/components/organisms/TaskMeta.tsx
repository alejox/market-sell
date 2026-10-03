import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES } from "@/components/labels";
import { formatCalendarDate } from "@/components/format-date";
import { isOverdue, type DevTask } from "@/modules/tasks/domain/dev-task";
import type { Person } from "@/modules/team/domain/profile";

export function PriorityBadge({ priority }: { priority: DevTask["priority"] }) {
  return <Badge tone={TASK_PRIORITY_TONES[priority]}>Prioridad {TASK_PRIORITY_LABELS[priority].toLowerCase()}</Badge>;
}

/** The assigned person (avatar + name), or "Sin asignar". `people` is keyed by user id. */
export function AssigneeLabel({ assigneeId, people }: { assigneeId: string | null; people: Record<string, Person> }) {
  if (assigneeId === null) return <span className="text-muted-on">Sin asignar</span>;
  const person = people[assigneeId];
  if (!person) return <span className="text-muted-on">Persona desconocida</span>;
  return (
    <span className="inline-flex items-center gap-2 text-on-surface">
      <Avatar name={person.displayName} />
      <span className="min-w-0 truncate">{person.displayName}</span>
    </span>
  );
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
