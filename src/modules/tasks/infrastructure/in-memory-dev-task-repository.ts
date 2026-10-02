import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { Scope } from "@/shared/scope";
import type { DevTaskRepository } from "@/modules/tasks/application/ports/dev-task-repository";
import type { DevTask } from "@/modules/tasks/domain/dev-task";

export class InMemoryDevTaskRepository implements DevTaskRepository {
  private readonly repo = new ScopedRepository<DevTask>(new InMemoryStore<DevTask>());

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

  insertIfAbsent(task: DevTask): Promise<boolean> {
    return this.repo.insertIfAbsent(task);
  }
}
