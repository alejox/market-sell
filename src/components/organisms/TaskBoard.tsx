"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Badge } from "@/components/atoms/Badge";
import { AssigneeLabel, DueDate, PriorityBadge } from "@/components/organisms/TaskMeta";
import { TASK_STATUS_LABELS, TASK_STATUS_TONES } from "@/components/labels";
import { TASK_STATUSES, groupTasksByStatus, type DevTask, type TaskStatus } from "@/modules/tasks/domain/dev-task";
import type { Person } from "@/modules/team/domain/profile";

/**
 * Kanban view: one column per status. Cards open the task's notebook page and
 * can be dragged between columns. The status can also be changed from the
 * task's page and from the table.
 */
export function TaskBoard({
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
  const [optimisticTasks, moveOptimistically] = useOptimistic(
    tasks,
    (current, move: { id: string; status: TaskStatus }) =>
      current.map((task) => (task.id === move.id ? { ...task, status: move.status } : task)),
  );
  const [, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);
  const groups = groupTasksByStatus(optimisticTasks);

  function drop(status: TaskStatus, taskId: string) {
    setDraggingId(null);
    setOverStatus(null);
    const task = optimisticTasks.find((candidate) => candidate.id === taskId);
    if (!task || task.status === status) return;
    startTransition(async () => {
      moveOptimistically({ id: taskId, status });
      await changeStatusAction(taskId, status);
    });
  }

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => (
        <section
          key={status}
          aria-labelledby={`column-${status}`}
          onDragOver={(event) => {
            if (!draggingId) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOverStatus(status);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setOverStatus((current) => (current === status ? null : current));
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData("text/plain");
            if (id) drop(status, id);
          }}
          className={`flex min-w-0 flex-col gap-3 rounded-2xl bg-muted p-3 outline-2 -outline-offset-2 ${
            overStatus === status && draggingId ? "outline-primary" : "outline-transparent"
          }`}
        >
          <header className="flex items-center justify-between gap-2 px-2 pt-1">
            <h2 id={`column-${status}`} className="font-sans text-sm font-semibold tracking-normal text-on-surface">
              {TASK_STATUS_LABELS[status]}
            </h2>
            <Badge tone={TASK_STATUS_TONES[status]}>{groups[status].length}</Badge>
          </header>

          {groups[status].length === 0 ? (
            <p className="px-2 pb-2 text-sm text-muted-on">
              {draggingId ? "Suelta aquí." : "Sin tareas."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {groups[status].map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", task.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingId(task.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverStatus(null);
                  }}
                  className={`flex cursor-grab flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4 active:cursor-grabbing ${
                    draggingId === task.id ? "opacity-50" : ""
                  }`}
                >
                  <Link href={`${basePath}/${task.id}`} draggable={false} className="text-sm font-medium text-on-surface underline-offset-4 hover:underline">
                    {task.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-on">Responsable</dt>
                    <dd><AssigneeLabel assigneeId={task.assigneeId} people={people} /></dd>
                    <dt className="text-muted-on">Límite</dt>
                    <dd><DueDate task={task} today={today} /></dd>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
