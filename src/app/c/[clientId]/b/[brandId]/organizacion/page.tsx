import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories } from "@/server/container";
import { Card } from "@/components/atoms/Card";
import { NewTaskForm } from "@/components/organisms/NewTaskForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { TaskBoard } from "@/components/organisms/TaskBoard";
import { TaskFilters, UNASSIGNED_FILTER, type TaskView } from "@/components/organisms/TaskFilters";
import { TaskSummary } from "@/components/organisms/TaskSummary";
import { TaskTable } from "@/components/organisms/TaskTable";
import { knownAssignees, summarizeTasks } from "@/modules/tasks/domain/dev-task";
import { localIsoDate } from "@/shared/local-date";
import { requireOwner } from "@/shared/infrastructure/supabase/owner-auth";
import { changeTaskStatusAction, createTaskAction } from "./actions";

export const metadata = { title: "Organización — Devtecia" };

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; brandId: string }>;
  searchParams: Promise<{ vista?: string; asignado?: string }>;
}) {
  await requireOwner();
  await ensureWorkspaceSeeded();

  const { clientId, brandId } = await params;
  const { vista, asignado } = await searchParams;
  const scope = { clientId, brandId };

  const brand = await repositories.brands.getById(clientId, brandId);
  if (!brand) {
    notFound();
  }

  const view: TaskView = vista === "tabla" ? "tabla" : "tablero";
  const basePath = `/c/${clientId}/b/${brandId}`;
  const tasksPath = `${basePath}/organizacion`;
  const today = localIsoDate(new Date());

  const allTasks = await repositories.devTasks.list(scope);
  const assignees = knownAssignees(allTasks);
  const assigneeFilter =
    asignado === UNASSIGNED_FILTER || (asignado !== undefined && assignees.includes(asignado)) ? (asignado ?? null) : null;

  const visibleTasks =
    assigneeFilter === null
      ? allTasks
      : allTasks.filter((task) => (assigneeFilter === UNASSIGNED_FILTER ? task.assignee === null : task.assignee === assigneeFilter));

  const summary = summarizeTasks(allTasks, today);
  const changeStatusAction = changeTaskStatusAction.bind(null, scope);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">{brand.name} · Organización</p>
          <SignOutButton />
        </div>
        <div className="max-w-3xl">
          <h1 className="text-4xl leading-tight text-on-surface sm:text-5xl">Tareas de desarrollo</h1>
          <p className="mt-3 text-base text-muted-on">
            Cuaderno de trabajo del equipo: qué hay por desarrollar, quién lo lleva y en qué estado va.
          </p>
        </div>
      </header>

      <TaskSummary summary={summary} />

      <details className="group rounded-2xl border border-border bg-surface-raised p-5 sm:p-6" open={allTasks.length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-on-surface [&::-webkit-details-marker]:hidden">
          <span className="font-serif text-2xl">Nueva tarea</span>
          <span aria-hidden="true" className="text-2xl group-open:rotate-45">+</span>
        </summary>
        <div className="mt-5">
          <NewTaskForm action={createTaskAction.bind(null, scope)} assignees={assignees} />
        </div>
      </details>

      <section aria-labelledby="tasks-heading" className="flex flex-col gap-5">
        <h2 id="tasks-heading" className="text-3xl text-on-surface">Cuaderno de tareas</h2>
        <TaskFilters
          basePath={tasksPath}
          view={view}
          assignee={assigneeFilter}
          assignees={assignees}
          hasUnassigned={allTasks.some((task) => task.assignee === null)}
        />

        {allTasks.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-on">Todavía no hay tareas. Crea la primera con «Nueva tarea».</p>
          </Card>
        ) : visibleTasks.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-on">No hay tareas para este responsable.</p>
          </Card>
        ) : view === "tabla" ? (
          <TaskTable tasks={visibleTasks} basePath={tasksPath} today={today} changeStatusAction={changeStatusAction} />
        ) : (
          <TaskBoard tasks={visibleTasks} basePath={tasksPath} today={today} changeStatusAction={changeStatusAction} />
        )}
      </section>
    </main>
  );
}
