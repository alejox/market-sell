/**
 * A development task tracked in the workspace's "Tareas" notebook. Like every
 * other domain record it carries both `clientId` and `brandId`, so one
 * brand's board never shows another brand's tasks.
 *
 * The assignee is a team member of the same client, referenced by user id
 * (their name comes from their profile); `null` means unassigned.
 */
export const TASK_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface DevTask {
  id: string;
  clientId: string;
  brandId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  /** ISO calendar date (`YYYY-MM-DD`), or null when the task has no deadline. */
  dueDate: string | null;
  /** The task's notebook page, written as lightweight Markdown. */
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && (TASK_PRIORITIES as readonly string[]).includes(value);
}

/** An empty id means "unassigned". */
export function normalizeAssigneeId(raw: string | null | undefined): string | null {
  const id = (raw ?? "").trim();
  return id.length > 0 ? id : null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True only for a real calendar date in `YYYY-MM-DD` form (rejects `2026-02-31`). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
  );
}

/** Empty string and null both mean "no deadline"; anything else must be a real ISO date. */
export function normalizeDueDate(raw: string | null | undefined): string | null | "invalid" {
  const value = (raw ?? "").trim();
  if (value.length === 0) return null;
  return isIsoDate(value) ? value : "invalid";
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Board order inside one column: higher priority first, then the nearest
 * deadline (tasks without one last), then the oldest first so nothing sinks.
 */
export function compareTasks(a: DevTask, b: DevTask): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  }
  return a.createdAt.localeCompare(b.createdAt);
}

export function groupTasksByStatus(tasks: readonly DevTask[]): Record<TaskStatus, DevTask[]> {
  const groups: Record<TaskStatus, DevTask[]> = { todo: [], in_progress: [], in_review: [], done: [] };
  for (const task of [...tasks].sort(compareTasks)) {
    groups[task.status].push(task);
  }
  return groups;
}

/** A task is overdue when it has a deadline before `today` and is not done. `today` is passed in (never read from a clock here). */
export function isOverdue(task: DevTask, today: string): boolean {
  return task.status !== "done" && task.dueDate !== null && task.dueDate < today;
}

export interface TaskSummary {
  total: number;
  byStatus: Record<TaskStatus, number>;
  overdue: number;
  unassigned: number;
  /** Open (not done) tasks per assignee id, busiest first; unassigned tasks are excluded. */
  openByAssignee: Array<{ assigneeId: string; open: number }>;
}

export function summarizeTasks(tasks: readonly DevTask[], today: string): TaskSummary {
  const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  const open = new Map<string, number>();
  let overdue = 0;
  let unassigned = 0;

  for (const task of tasks) {
    byStatus[task.status] += 1;
    if (isOverdue(task, today)) overdue += 1;
    if (task.status === "done") continue;
    if (task.assigneeId === null) {
      unassigned += 1;
    } else {
      open.set(task.assigneeId, (open.get(task.assigneeId) ?? 0) + 1);
    }
  }

  const openByAssignee = [...open.entries()]
    .map(([assigneeId, count]) => ({ assigneeId, open: count }))
    .sort((a, b) => b.open - a.open || a.assigneeId.localeCompare(b.assigneeId));

  return { total: tasks.length, byStatus, overdue, unassigned, openByAssignee };
}
