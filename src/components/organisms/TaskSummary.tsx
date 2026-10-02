import { Card } from "@/components/atoms/Card";
import { TASK_STATUS_LABELS } from "@/components/labels";
import { TASK_STATUSES, type TaskSummary as Summary } from "@/modules/tasks/domain/dev-task";

/** Dashboard header for the notebook: how many tasks sit in each state, what needs attention, and who is carrying what. */
export function TaskSummary({ summary }: { summary: Summary }) {
  const busiest = Math.max(1, ...summary.openByAssignee.map((entry) => entry.open));

  return (
    <section aria-label="Resumen de tareas" className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="flex flex-col gap-1 rounded-2xl border border-border bg-surface-raised p-5">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-on">{TASK_STATUS_LABELS[status]}</dt>
            <dd className="font-serif text-4xl text-on-surface">{summary.byStatus[status]}</dd>
          </div>
        ))}
      </dl>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-2xl bg-accent p-6 text-accent-on">
          <p className="text-xs font-medium uppercase tracking-[0.16em]">Atención</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>
              <span className="font-serif text-3xl">{summary.overdue}</span>{" "}
              {summary.overdue === 1 ? "tarea vencida" : "tareas vencidas"}
            </li>
            <li>
              <span className="font-serif text-3xl">{summary.unassigned}</span>{" "}
              {summary.unassigned === 1 ? "tarea abierta sin responsable" : "tareas abiertas sin responsable"}
            </li>
          </ul>
        </div>

        <Card title="Carga por responsable">
          {summary.openByAssignee.length === 0 ? (
            <p className="text-sm text-muted-on">No hay tareas abiertas asignadas.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {summary.openByAssignee.map((entry) => (
                <li key={entry.assignee} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate text-on-surface">{entry.assignee}</span>
                  <span aria-hidden="true" className="h-2 rounded-full bg-muted">
                    <span className="block h-2 rounded-full bg-primary" style={{ width: `${(entry.open / busiest) * 100}%` }} />
                  </span>
                  <span className="tabular-nums text-muted-on">
                    {entry.open} {entry.open === 1 ? "abierta" : "abiertas"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
