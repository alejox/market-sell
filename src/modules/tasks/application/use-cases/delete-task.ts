import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { DevTaskRepository } from "@/modules/tasks/application/ports/dev-task-repository";

export interface DeleteTaskInput {
  scope: Scope;
  taskId: string;
}

export interface DeleteTaskDependencies {
  tasks: DevTaskRepository;
}

export function createDeleteTask(deps: DeleteTaskDependencies) {
  return async function deleteTask(input: DeleteTaskInput): Promise<Result<void, { kind: "task_not_found" }>> {
    const current = await deps.tasks.getById(input.scope, input.taskId);
    if (!current) {
      return err({ kind: "task_not_found" });
    }
    await deps.tasks.delete(input.scope, input.taskId);
    return ok(undefined);
  };
}
