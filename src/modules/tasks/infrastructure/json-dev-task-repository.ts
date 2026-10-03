import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { Scope } from "@/shared/scope";
import type { DevTaskRepository } from "@/modules/tasks/application/ports/dev-task-repository";
import type { DevTask } from "@/modules/tasks/domain/dev-task";

export class JsonDevTaskRepository implements DevTaskRepository {
  private readonly repo: ScopedRepository<DevTask>;

  constructor(filePath: string) {
    this.repo = new ScopedRepository<DevTask>(new JsonFileStore<DevTask>(filePath));
  }

  list(scope: Scope): Promise<DevTask[]> {
    return this.repo.list(scope);
  }

  getById(scope: Scope, id: string): Promise<DevTask | null> {
    return this.repo.getById(scope, id);
  }

  save(task: DevTask): Promise<void> {
    return this.repo.save(task);
  }

  delete(scope: Scope, id: string): Promise<void> {
    return this.repo.delete(scope, id);
  }

  /** Never overwrites an existing task — used by import, safe under concurrent serverless instances. */
  insertIfAbsent(task: DevTask): Promise<boolean> {
    return this.repo.insertIfAbsent(task);
  }
}
