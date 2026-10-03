import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasWorkspaceAccess, isAllowedOwner } from "./owner-policy";
import { createSupabaseServerClient } from "./server";

export interface WorkspaceUser {
  id: string;
  email: string;
}

/**
 * Resolves who is signed in on this client, or null when they have no access:
 * the allow-listed owner, or a member who joined through an invitation. The
 * membership lookup runs as the user under RLS, so a stranger sees no rows.
 */
export async function workspaceUserFor(supabase: SupabaseClient): Promise<WorkspaceUser | null> {
  const ownerId = process.env.SUPABASE_OWNER_ID;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || typeof claims?.sub !== "string") return null;

  let isTeamMember = false;
  if (!isAllowedOwner(claims, ownerId)) {
    const lookup = await supabase.from("team_members").select("user_id").eq("user_id", claims.sub).limit(1);
    isTeamMember = !lookup.error && (lookup.data?.length ?? 0) > 0;
  }
  if (!hasWorkspaceAccess(claims, ownerId, isTeamMember)) return null;

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}

/** Memoized per request: layouts, pages and actions can all ask without repeating the lookup. */
export const getWorkspaceUser = cache(async (): Promise<WorkspaceUser | null> => {
  // Read request state even when deployment configuration is missing so
  // protected routes are never prerendered as anonymous static responses.
  await cookies();
  if (!process.env.SUPABASE_OWNER_ID || !process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    return await workspaceUserFor(await createSupabaseServerClient());
  } catch {
    return null;
  }
});

/** True for the owner and for invited team members (the name is historical). */
export async function isAuthenticatedOwner(): Promise<boolean> {
  return (await getWorkspaceUser()) !== null;
}

/** Redirects to /login unless the request belongs to the owner or an invited member. */
export async function requireOwner(): Promise<void> {
  if (!(await isAuthenticatedOwner())) redirect("/login");
}

/** Who to record as the approver / author of an action: the signed-in person's email. */
export async function currentUserName(): Promise<string> {
  const user = await getWorkspaceUser();
  return user?.email || process.env.OWNER_NAME || "Equipo";
}
