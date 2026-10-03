import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { DevTaskRepository } from "@/modules/tasks/application/ports/dev-task-repository";
import {
  normalizeAssignee,
  normalizeDueDate,
  type DevTask,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/domain/dev-task";

/** Every field is optional: `undefined` leaves it unchanged, while `null` clears `assignee`/`dueDate`. */
export interface TaskPatch {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string | null;
  dueDate?: string | null;
  notes?: string;
}

export interface UpdateTaskInput {
  scope: Scope;
  taskId: string;
  patch: TaskPatch;
}

export type UpdateTaskError = { kind: "task_not_found" } | { kind: "title_required" } | { kind: "invalid_due_date" };

export interface UpdateTaskDependencies {
  tasks: DevTaskRepository;
  clock: Clock;
}

/**
 * Edits one task — covers moving it between columns (`status`), reassigning,
 * and saving its notebook page. The task is looked up through the caller's
 * scope, so a task id from another brand resolves to `task_not_found`.
 */
export function createUpdateTask(deps: UpdateTaskDependencies) {
  return async function updateTask(input: UpdateTaskInput): Promise<Result<DevTask, UpdateTaskError>> {
    const current = await deps.tasks.getById(input.scope, input.taskId);
    if (!current) {
      return err({ kind: "task_not_found" });
    }

    const { patch } = input;
    const next: DevTask = { ...current };

    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (title.length === 0) {
        return err({ kind: "title_required" });
      }
      next.title = title;
    }
    if (patch.status !== undefined) next.status = patch.status;
    if (patch.priority !== undefined) next.priority = patch.priority;
    if (patch.assignee !== undefined) next.assignee = normalizeAssignee(patch.assignee);
    if (patch.dueDate !== undefined) {
      const dueDate = normalizeDueDate(patch.dueDate);
      if (dueDate === "invalid") {
        return err({ kind: "invalid_due_date" });
      }
      next.dueDate = dueDate;
    }
    if (patch.notes !== undefined) next.notes = patch.notes;

    next.updatedAt = deps.clock.now();
    await deps.tasks.save(next);
    return ok(next);
  };
}
