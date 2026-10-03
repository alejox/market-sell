import Link from "next/link";
import { TaskStatusSelect } from "@/components/molecules/TaskStatusSelect";
import { AssigneeLabel, DueDate, PriorityBadge } from "@/components/organisms/TaskMeta";
import { compareTasks, type DevTask } from "@/modules/tasks/domain/dev-task";
import type { Person } from "@/modules/team/domain/profile";

const STATUS_ORDER = { todo: 0, in_progress: 1, in_review: 2, done: 3 } as const;

/** Table view: every task as one row, grouped by status order, then priority and deadline. */
export function TaskTable({
  tasks,
  basePath,
  today,
  people,
  changeStatusAction,
}: {
  tasks: DevTask[];
  basePath: string;
  today: string;
  people: Record<string, Person>;
  changeStatusAction: (taskId: string, status: string) => Promise<void>;
}) {
  const rows = [...tasks].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || compareTasks(a, b));

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface-raised">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption className="sr-only">Tareas de desarrollo</caption>
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-on">
            <th scope="col" className="px-5 py-3 font-medium">Tarea</th>
            <th scope="col" className="px-3 py-3 font-medium">Estado</th>
            <th scope="col" className="px-3 py-3 font-medium">Responsable</th>
            <th scope="col" className="px-3 py-3 font-medium">Prioridad</th>
            <th scope="col" className="px-5 py-3 font-medium">Límite</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => (
            <tr key={task.id} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-5 py-3 font-medium">
                <Link href={`${basePath}/${task.id}`} className="text-on-surface underline-offset-4 hover:underline">
                  {task.title}
                </Link>
              </th>
              <td className="px-3 py-3">
                <TaskStatusSelect taskTitle={task.title} status={task.status} action={changeStatusAction.bind(null, task.id)} />
              </td>
              <td className="px-3 py-3"><AssigneeLabel assigneeId={task.assigneeId} people={people} /></td>
              <td className="px-3 py-3"><PriorityBadge priority={task.priority} /></td>
              <td className="px-5 py-3"><DueDate task={task} today={today} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
