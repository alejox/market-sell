"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as container from "@/server/container";
import type { ActionState } from "@/components/action-state";
import { requireOwner } from "@/shared/infrastructure/supabase/owner-auth";
import { isTaskPriority, isTaskStatus, type TaskPriority, type TaskStatus } from "@/modules/tasks/domain/dev-task";
import type { CreateTaskError } from "@/modules/tasks/application/use-cases/create-task";
import type { UpdateTaskError } from "@/modules/tasks/application/use-cases/update-task";

type Scope = { clientId: string; brandId: string };

const tasksPath = (scope: Scope) => `/c/${scope.clientId}/b/${scope.brandId}/organizacion`;

function text(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

/** Unknown values fall back to the field's default rather than reaching the use case — form input is untrusted. */
function statusField(formData: FormData): TaskStatus | undefined {
  const raw = text(formData, "status");
  return isTaskStatus(raw) ? raw : undefined;
}

function priorityField(formData: FormData): TaskPriority | undefined {
  const raw = text(formData, "priority");
  return isTaskPriority(raw) ? raw : undefined;
}

function describeError(error: CreateTaskError | UpdateTaskError): string {
  switch (error.kind) {
    case "title_required":
      return "La tarea necesita un título.";
    case "invalid_due_date":
      return "La fecha límite no es válida.";
    case "task_not_found":
      return "No se encontró la tarea.";
  }
}

export async function createTaskAction(scope: Scope, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();

  const result = await container.createTask({
    scope,
    title: text(formData, "title"),
    status: statusField(formData),
    priority: priorityField(formData),
    assignee: text(formData, "assignee"),
    dueDate: text(formData, "dueDate"),
    createdBy: container.currentOwnerName(),
  });

  if (!result.ok) {
    return { status: "error", message: describeError(result.error) };
  }

  revalidatePath(tasksPath(scope));
  return { status: "success", message: "Tarea creada." };
}

export async function updateTaskAction(
  scope: Scope,
  taskId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();

  const result = await container.updateTask({
    scope,
    taskId,
    patch: {
      title: text(formData, "title"),
      status: statusField(formData),
      priority: priorityField(formData),
      assignee: text(formData, "assignee"),
      dueDate: text(formData, "dueDate"),
      notes: text(formData, "notes"),
    },
  });

  if (!result.ok) {
    return { status: "error", message: describeError(result.error) };
  }

  revalidatePath(tasksPath(scope));
  revalidatePath(`${tasksPath(scope)}/${taskId}`);
  return { status: "success", message: "Cambios guardados." };
}

/** Quick move between columns from the board / table — only the status changes. */
export async function changeTaskStatusAction(scope: Scope, taskId: string, status: string): Promise<void> {
  await requireOwner();
  if (!isTaskStatus(status)) return;

  await container.updateTask({ scope, taskId, patch: { status } });
  revalidatePath(tasksPath(scope));
  revalidatePath(`${tasksPath(scope)}/${taskId}`);
}

export async function deleteTaskAction(scope: Scope, taskId: string): Promise<void> {
  await requireOwner();

  await container.deleteTask({ scope, taskId });
  revalidatePath(tasksPath(scope));
  redirect(tasksPath(scope));
}
