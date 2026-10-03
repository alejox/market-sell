/**
 * What a team member shows to the rest of the team. Email is deliberately not
 * part of it: task screens show a name and a job title, nothing more.
 */
export const DISPLAY_NAME_MAX = 80;
export const JOB_TITLE_MAX = 80;

export interface Profile {
  clientId: string;
  userId: string;
  displayName: string;
  jobTitle: string | null;
  updatedAt: string;
}

/** A team member as task screens need them. */
export interface Person {
  userId: string;
  displayName: string;
  jobTitle: string | null;
}

/** Name to show when someone has no profile yet: the part of their email before the @. */
export function fallbackDisplayName(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  return local.length > 0 ? local : "Sin nombre";
}

/** One or two capital letters for the avatar: first letters of the first two words. */
export function initialsOf(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? Array.from(words[0]).slice(0, 2) : [Array.from(words[0])[0], Array.from(words[1])[0]];
  return letters.join("").toLocaleUpperCase("es");
}

export type ProfileInputError = { kind: "display_name_required" } | { kind: "display_name_too_long" } | { kind: "job_title_too_long" };

export interface ProfileFields {
  displayName: string;
  jobTitle: string | null;
}

/** Collapses whitespace; an empty job title means "none". */
export function normalizeProfileFields(input: { displayName: string; jobTitle?: string | null }): ProfileFields | ProfileInputError {
  const displayName = input.displayName.replace(/\s+/g, " ").trim();
  if (displayName.length === 0) return { kind: "display_name_required" };
  if (displayName.length > DISPLAY_NAME_MAX) return { kind: "display_name_too_long" };

  const jobTitle = (input.jobTitle ?? "").replace(/\s+/g, " ").trim();
  if (jobTitle.length > JOB_TITLE_MAX) return { kind: "job_title_too_long" };
  return { displayName, jobTitle: jobTitle.length > 0 ? jobTitle : null };
}

export function isProfileInputError(value: ProfileFields | ProfileInputError): value is ProfileInputError {
  return "kind" in value;
}

export function sortPeople(people: readonly Person[]): Person[] {
  return [...people].sort((a, b) => a.displayName.localeCompare(b.displayName, "es") || a.userId.localeCompare(b.userId));
}
