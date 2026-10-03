import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { AssigneeDirectory } from "@/modules/tasks/application/ports/assignee-directory";
import type { DevTaskRepository } from "@/modules/tasks/application/ports/dev-task-repository";
import {
  normalizeAssigneeId,
  normalizeDueDate,
  type DevTask,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/domain/dev-task";

export interface CreateTaskInput {
  scope: Scope;
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  /** User id of a team member of this client, or empty/null for unassigned. */
  assigneeId?: string | null;
  dueDate?: string | null;
  notes?: string;
  createdBy: string;
}

export type CreateTaskError = { kind: "title_required" } | { kind: "invalid_due_date" } | { kind: "assignee_not_member" };

export interface CreateTaskDependencies {
  tasks: DevTaskRepository;
  assignees: AssigneeDirectory;
  clock: Clock;
  ids: IdGenerator;
}

export function createCreateTask(deps: CreateTaskDependencies) {
  return async function createTask(input: CreateTaskInput): Promise<Result<DevTask, CreateTaskError>> {
    const title = input.title.trim();
    if (title.length === 0) {
      return err({ kind: "title_required" });
    }

    const dueDate = normalizeDueDate(input.dueDate);
    if (dueDate === "invalid") {
      return err({ kind: "invalid_due_date" });
    }

    const assigneeId = normalizeAssigneeId(input.assigneeId);
    if (assigneeId !== null && !(await deps.assignees.isMember(input.scope.clientId, assigneeId))) {
      return err({ kind: "assignee_not_member" });
    }

    const now = deps.clock.now();
    const task: DevTask = {
      id: deps.ids.next(),
      clientId: input.scope.clientId,
      brandId: input.scope.brandId,
      title,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      assigneeId,
      dueDate,
      notes: input.notes ?? "",
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await deps.tasks.save(task);
    return ok(task);
  };
}
