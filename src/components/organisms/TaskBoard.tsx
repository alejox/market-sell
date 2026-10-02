import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { TaskStatusSelect } from "@/components/molecules/TaskStatusSelect";
import { AssigneeLabel, DueDate, PriorityBadge } from "@/components/organisms/TaskMeta";
import { TASK_STATUS_LABELS, TASK_STATUS_TONES } from "@/components/labels";
import { TASK_STATUSES, groupTasksByStatus, type DevTask } from "@/modules/tasks/domain/dev-task";

/** Kanban view: one column per status. Cards open the task's notebook page; the select moves them between columns. */
export function TaskBoard({
  tasks,
  basePath,
  today,
  changeStatusAction,
}: {
  tasks: DevTask[];
  basePath: string;
  today: string;
  changeStatusAction: (taskId: string, status: string) => Promise<void>;
}) {
  const groups = groupTasksByStatus(tasks);

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => (
        <section key={status} aria-labelledby={`column-${status}`} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-muted p-3">
          <header className="flex items-center justify-between gap-2 px-2 pt-1">
            <h2 id={`column-${status}`} className="font-sans text-sm font-semibold tracking-normal text-on-surface">
              {TASK_STATUS_LABELS[status]}
            </h2>
            <Badge tone={TASK_STATUS_TONES[status]}>{groups[status].length}</Badge>
          </header>

          {groups[status].length === 0 ? (
            <p className="px-2 pb-2 text-sm text-muted-on">Sin tareas.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {groups[status].map((task) => (
                <li key={task.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4">
                  <Link href={`${basePath}/${task.id}`} className="text-sm font-medium text-on-surface underline-offset-4 hover:underline">
                    {task.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-on">Responsable</dt>
                    <dd><AssigneeLabel assignee={task.assignee} /></dd>
                    <dt className="text-muted-on">Límite</dt>
                    <dd><DueDate task={task} today={today} /></dd>
                  </dl>
                  <TaskStatusSelect
                    taskTitle={task.title}
                    status={task.status}
                    action={changeStatusAction.bind(null, task.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
