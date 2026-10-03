import type { DevTaskRepository } from "@/modules/tasks/application/ports/dev-task-repository";
import type { DevTask, TaskPriority, TaskStatus } from "@/modules/tasks/domain/dev-task";
import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { ScopedSupabaseRepository } from "@/shared/infrastructure/supabase/scoped-supabase-repository";

const TABLE = "dev_tasks";

/** Row shape of `public.dev_tasks` (see the dev_tasks migration). */
interface DevTaskRow {
  id: string;
  client_id: string;
  brand_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function fromRow(row: DevTaskRow): DevTask {
  return {
    id: row.id,
    clientId: row.client_id,
    brandId: row.brand_id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(task: DevTask): DevTaskRow {
  return {
    id: task.id,
    client_id: task.clientId,
    brand_id: task.brandId,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assigneeId,
    due_date: task.dueDate,
    notes: task.notes,
    created_by: task.createdBy,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export class SupabaseDevTaskRepository implements DevTaskRepository {
  private readonly repo: ScopedSupabaseRepository<DevTaskRow, DevTask>;

  constructor(getClient: SupabaseClientProvider) {
    this.repo = new ScopedSupabaseRepository<DevTaskRow, DevTask>(getClient, TABLE, fromRow, toRow);
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
