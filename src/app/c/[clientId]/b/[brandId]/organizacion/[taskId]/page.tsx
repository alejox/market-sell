import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, listPeople, repositories } from "@/server/container";
import { Badge } from "@/components/atoms/Badge";
import { DeleteTaskForm } from "@/components/organisms/DeleteTaskForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { TaskEditor } from "@/components/organisms/TaskEditor";
import { TASK_STATUS_LABELS, TASK_STATUS_TONES } from "@/components/labels";
import { requireOwner } from "@/shared/infrastructure/supabase/owner-auth";
import { deleteTaskAction, updateTaskAction } from "../actions";

export const metadata = { title: "Tarea — Devtecia" };

export default async function TaskPage({
  params,
}: {
  params: Promise<{ clientId: string; brandId: string; taskId: string }>;
}) {
  await requireOwner();
  await ensureWorkspaceSeeded();

  const { clientId, brandId, taskId } = await params;
  const scope = { clientId, brandId };

  const task = await repositories.devTasks.getById(scope, taskId);
  if (!task) {
    notFound();
  }

  const people = await listPeople({ clientId });
  const tasksPath = `/c/${clientId}/b/${brandId}/organizacion`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={tasksPath} className="w-fit text-sm font-medium text-on-surface underline underline-offset-4">
          ← Volver a Organización
        </Link>
        <SignOutButton />
      </div>

      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">Tarea de desarrollo</p>
        <h1 className="text-4xl leading-tight text-on-surface sm:text-5xl">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-on">
          <Badge tone={TASK_STATUS_TONES[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
          <span>Creada por {task.createdBy} el {task.createdAt.slice(0, 10)}</span>
        </div>
      </header>

      <TaskEditor task={task} people={people} action={updateTaskAction.bind(null, scope, task.id)} />

      <section aria-label="Zona de peligro" className="border-t border-border pt-6">
        <DeleteTaskForm action={deleteTaskAction.bind(null, scope, task.id)} />
      </section>
    </main>
  );
}
