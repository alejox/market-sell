import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, listPeople, repositories } from "@/server/container";
import { APP_NAME } from "@/components/app-name";
import { Card } from "@/components/atoms/Card";
import { NewTaskForm } from "@/components/organisms/NewTaskForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { TaskBoard } from "@/components/organisms/TaskBoard";
import { MINE_FILTER, TaskFilters, UNASSIGNED_FILTER, type TaskView } from "@/components/organisms/TaskFilters";
import { TaskSummary } from "@/components/organisms/TaskSummary";
import { TaskTable } from "@/components/organisms/TaskTable";
import { summarizeTasks } from "@/modules/tasks/domain/dev-task";
import { localIsoDate } from "@/shared/local-date";
import { requireWorkspaceUser } from "@/shared/infrastructure/supabase/owner-auth";
import { changeTaskStatusAction, createTaskAction } from "./actions";

export const metadata = { title: "Organización — Devtecia" };

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; brandId: string }>;
  searchParams: Promise<{ vista?: string; asignado?: string }>;
}) {
  const user = await requireWorkspaceUser();
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

  const [allTasks, people] = await Promise.all([repositories.devTasks.list(scope), listPeople({ clientId })]);
  const peopleById = Object.fromEntries(people.map((person) => [person.userId, person]));
  const withTasks = new Set(allTasks.map((task) => task.assigneeId));
  const filterPeople = people.filter((person) => withTasks.has(person.userId));

  // The filter is a user id, "mias" (the signed-in person) or "sin-asignar"; anything else is ignored.
  const assigneeFilter =
    asignado === UNASSIGNED_FILTER || asignado === MINE_FILTER || (asignado !== undefined && peopleById[asignado] !== undefined)
      ? (asignado ?? null)
      : null;
  const filterId = assigneeFilter === MINE_FILTER ? user.id : assigneeFilter;

  const visibleTasks =
    filterId === null
      ? allTasks
      : allTasks.filter((task) => (filterId === UNASSIGNED_FILTER ? task.assigneeId === null : task.assigneeId === filterId));

  const summary = summarizeTasks(allTasks, today);
  const changeStatusAction = changeTaskStatusAction.bind(null, scope);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">{APP_NAME} · Organización</p>
          <SignOutButton />
        </div>
        <div className="max-w-3xl">
          <h1 className="text-4xl leading-tight text-on-surface sm:text-5xl">Tareas de desarrollo</h1>
          <p className="mt-3 text-base text-muted-on">
            Cuaderno de trabajo del equipo: qué hay por desarrollar, quién lo lleva y en qué estado va.
          </p>
        </div>
      </header>

      <TaskSummary summary={summary} people={peopleById} />

      <details className="group rounded-2xl border border-border bg-surface-raised p-5 sm:p-6" open={allTasks.length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-on-surface [&::-webkit-details-marker]:hidden">
          <span className="font-serif text-2xl">Nueva tarea</span>
          <span aria-hidden="true" className="text-2xl group-open:rotate-45">+</span>
        </summary>
        <div className="mt-5">
          <NewTaskForm action={createTaskAction.bind(null, scope)} people={people} />
        </div>
      </details>

      <section aria-labelledby="tasks-heading" className="flex flex-col gap-5">
        <h2 id="tasks-heading" className="text-3xl text-on-surface">Cuaderno de tareas</h2>
        <TaskFilters
          basePath={tasksPath}
          view={view}
          assignee={assigneeFilter}
          assignees={filterPeople}
          hasUnassigned={allTasks.some((task) => task.assigneeId === null)}
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
          <TaskTable tasks={visibleTasks} basePath={tasksPath} today={today} people={peopleById} changeStatusAction={changeStatusAction} />
        ) : (
          <TaskBoard tasks={visibleTasks} basePath={tasksPath} today={today} people={peopleById} changeStatusAction={changeStatusAction} />
        )}
      </section>
    </main>
  );
}
