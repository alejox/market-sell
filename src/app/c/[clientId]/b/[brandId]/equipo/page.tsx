import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, listTeam, repositories } from "@/server/container";
import { Card } from "@/components/atoms/Card";
import { formatCalendarDate } from "@/components/format-date";
import { InviteLinkForm } from "@/components/organisms/InviteLinkForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { requireOwner } from "@/shared/infrastructure/supabase/owner-auth";
import { cancelInvitationAction, createInvitationAction } from "./actions";

export const metadata = { title: "Equipo — Devtecia" };

export default async function TeamPage({ params }: { params: Promise<{ clientId: string; brandId: string }> }) {
  await requireOwner();
  await ensureWorkspaceSeeded();

  const { clientId, brandId } = await params;
  const scope = { clientId, brandId };
  const brand = await repositories.brands.getById(clientId, brandId);
  if (!brand) notFound();

  const { members, pending } = await listTeam({ clientId });

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">{brand.name} · Equipo</p>
          <SignOutButton />
        </div>
        <div className="max-w-3xl">
          <h1 className="text-4xl leading-tight text-on-surface sm:text-5xl">Equipo</h1>
          <p className="mt-3 text-base text-muted-on">
            Quien entre con un enlace de invitación tiene el mismo acceso que tú a Marketing y a Organización,
            incluida la aprobación de propuestas.
          </p>
        </div>
      </header>

      <Card title="Invitar a una persona">
        <InviteLinkForm action={createInvitationAction.bind(null, scope)} />
      </Card>

      <section aria-labelledby="members-heading" className="flex flex-col gap-4">
        <h2 id="members-heading" className="text-3xl text-on-surface">Miembros</h2>
        {members.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-on">Todavía no hay miembros.</p>
          </Card>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface-raised">
            {members.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
                <span className="text-on-surface">{member.email || "Sin correo"}</span>
                <span className="text-muted-on">Desde {formatCalendarDate(member.joinedAt.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pending-heading" className="flex flex-col gap-4">
        <h2 id="pending-heading" className="text-3xl text-on-surface">Invitaciones pendientes</h2>
        {pending.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-on">No hay enlaces activos.</p>
          </Card>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface-raised">
            {pending.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <span className="text-on-surface">
                  Creado el {formatCalendarDate(invitation.createdAt.slice(0, 10))}
                  <span className="text-muted-on"> · vence el {formatCalendarDate(invitation.expiresAt.slice(0, 10))}</span>
                </span>
                <form action={cancelInvitationAction.bind(null, scope, invitation.id)}>
                  <button type="submit" className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-on-surface hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">
                    Cancelar enlace
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
