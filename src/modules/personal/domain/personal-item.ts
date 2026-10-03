/**
 * A person's private task or note. Nobody else sees it — not other team
 * members and not the owner — and every user starts with none. Like every
 * other record it carries `clientId` and `brandId`, plus the `userId` of the
 * only person who can read it.
 */
export const PERSONAL_KINDS = ["task", "note"] as const;
export type PersonalKind = (typeof PERSONAL_KINDS)[number];

export interface PersonalItem {
  id: string;
  clientId: string;
  brandId: string;
  userId: string;
  kind: PersonalKind;
  title: string;
  /** The item's page, written as lightweight Markdown. */
  body: string;
  /** Only meaningful for tasks; always false for notes. */
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isPersonalKind(value: unknown): value is PersonalKind {
  return typeof value === "string" && (PERSONAL_KINDS as readonly string[]).includes(value);
}

/** Open tasks first, then notes, then finished tasks. */
function rank(item: PersonalItem): number {
  if (item.kind === "note") return 1;
  return item.done ? 2 : 0;
}

/** Order inside each group is newest-edited first. */
export function comparePersonalItems(a: PersonalItem, b: PersonalItem): number {
  return rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
}

export interface PersonalGroups {
  openTasks: PersonalItem[];
  notes: PersonalItem[];
  doneTasks: PersonalItem[];
}

export function groupPersonalItems(items: readonly PersonalItem[]): PersonalGroups {
  const groups: PersonalGroups = { openTasks: [], notes: [], doneTasks: [] };
  for (const item of [...items].sort(comparePersonalItems)) {
    if (item.kind === "note") groups.notes.push(item);
    else if (item.done) groups.doneTasks.push(item);
    else groups.openTasks.push(item);
  }
  return groups;
}
