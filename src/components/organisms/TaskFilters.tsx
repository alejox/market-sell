import Link from "next/link";
import type { Person } from "@/modules/team/domain/profile";

export type TaskView = "tablero" | "tabla";

/** URL-only sentinels; real filters are user ids (UUIDs), so they can't collide with these. */
export const UNASSIGNED_FILTER = "sin-asignar";
/** "My tasks": the server resolves it to the signed-in person. */
export const MINE_FILTER = "mias";

export function tasksHref(basePath: string, params: { vista: TaskView; asignado?: string | null }): string {
  const query = new URLSearchParams({ vista: params.vista });
  if (params.asignado) query.set("asignado", params.asignado);
  return `${basePath}?${query.toString()}`;
}

function Pill({ href, selected, children }: { href: string; selected: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full border px-5 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary ${
        selected ? "border-primary bg-primary text-primary-on" : "border-border bg-surface-raised text-on-surface hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}

/** View switch (board / table) plus the assignee filter. Plain links, so both live in the URL and work without client JS. */
export function TaskFilters({
  basePath,
  view,
  assignee,
  assignees,
  hasUnassigned,
}: {
  basePath: string;
  view: TaskView;
  assignee: string | null;
  assignees: Person[];
  hasUnassigned: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Vista de tareas" className="flex flex-wrap gap-2">
        <Pill href={tasksHref(basePath, { vista: "tablero", asignado: assignee })} selected={view === "tablero"}>
          Tablero
        </Pill>
        <Pill href={tasksHref(basePath, { vista: "tabla", asignado: assignee })} selected={view === "tabla"}>
          Tabla
        </Pill>
      </nav>

      <nav aria-label="Filtrar por responsable" className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-on">Responsable</span>
        <Pill href={tasksHref(basePath, { vista: view })} selected={assignee === null}>
          Todos
        </Pill>
        <Pill href={tasksHref(basePath, { vista: view, asignado: MINE_FILTER })} selected={assignee === MINE_FILTER}>
          Mis tareas
        </Pill>
        {assignees.map((person) => (
          <Pill key={person.userId} href={tasksHref(basePath, { vista: view, asignado: person.userId })} selected={assignee === person.userId}>
            {person.displayName}
          </Pill>
        ))}
        {hasUnassigned && (
          <Pill href={tasksHref(basePath, { vista: view, asignado: UNASSIGNED_FILTER })} selected={assignee === UNASSIGNED_FILTER}>
            Sin asignar
          </Pill>
        )}
      </nav>
    </div>
  );
}
