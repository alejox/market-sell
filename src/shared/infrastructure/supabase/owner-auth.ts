import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedOwner } from "./owner-policy";
import { createSupabaseServerClient } from "./server";

export async function isAuthenticatedOwner(): Promise<boolean> {
  // Read request state even when deployment configuration is missing so
  // protected routes are never prerendered as anonymous static responses.
  await cookies();
  if (!process.env.SUPABASE_OWNER_ID || !process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    return !error && isAllowedOwner(data?.claims, process.env.SUPABASE_OWNER_ID);
  } catch {
    return false;
  }
}

export async function requireOwner(): Promise<void> {
  if (!(await isAuthenticatedOwner())) redirect("/login");
}
