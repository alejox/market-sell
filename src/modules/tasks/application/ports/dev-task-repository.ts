import type { Scope } from "@/shared/scope";
import type { DevTask } from "@/modules/tasks/domain/dev-task";

export interface DevTaskRepository {
  list(scope: Scope): Promise<DevTask[]>;
  getById(scope: Scope, id: string): Promise<DevTask | null>;
  save(task: DevTask): Promise<void>;
  /** Removes the task if it exists in this scope; a task in another scope is never touched. */
  delete(scope: Scope, id: string): Promise<void>;
}
