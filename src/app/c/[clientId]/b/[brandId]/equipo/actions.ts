"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import * as container from "@/server/container";
import type { InviteState } from "@/components/invite-state";
import { requireOwner } from "@/shared/infrastructure/supabase/owner-auth";

type Scope = { clientId: string; brandId: string };

const teamPath = (scope: Scope) => `/c/${scope.clientId}/b/${scope.brandId}/equipo`;

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/** Creates a single-use link. The raw token is returned once here and never stored. */
export async function createInvitationAction(scope: Scope, _prev: InviteState, _formData: FormData): Promise<InviteState> {
  await requireOwner();

  try {
    const created = await container.createInvitation({ clientId: scope.clientId });
    revalidatePath(teamPath(scope));
    return {
      status: "created",
      message: null,
      link: `${await requestOrigin()}/invitacion/${created.token}`,
      expiresAt: created.expiresAt,
    };
  } catch {
    return { status: "error", message: "No se pudo crear el enlace. Intenta de nuevo.", link: null, expiresAt: null };
  }
}

/** Cancels a link that has not been used. Members are never removed. */
export async function cancelInvitationAction(scope: Scope, invitationId: string): Promise<void> {
  await requireOwner();
  await container.cancelInvitation({ clientId: scope.clientId, invitationId });
  revalidatePath(teamPath(scope));
}
