import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, listPeople, repositories } from "@/server/container";
import { Avatar } from "@/components/atoms/Avatar";
import { Card } from "@/components/atoms/Card";
import { ProfileForm } from "@/components/organisms/ProfileForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { requireWorkspaceUser } from "@/shared/infrastructure/supabase/owner-auth";
import { updateProfileAction } from "./actions";

export const metadata = { title: "Mi perfil — Devtecia" };

export default async function ProfilePage({ params }: { params: Promise<{ clientId: string; brandId: string }> }) {
  const user = await requireWorkspaceUser();
  await ensureWorkspaceSeeded();

  const { clientId, brandId } = await params;
  const brand = await repositories.brands.getById(clientId, brandId);
  if (!brand) notFound();

  const people = await listPeople({ clientId });
  const me = people.find((person) => person.userId === user.id);
  const teamPath = `/c/${clientId}/b/${brandId}/equipo`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={teamPath} className="w-fit text-sm font-medium text-on-surface underline underline-offset-4">
          ← Volver a Equipo
        </Link>
        <SignOutButton />
      </div>

      <header className="flex items-center gap-4">
        <Avatar name={me?.displayName ?? user.email} size="md" />
        <div>
          <h1 className="text-4xl leading-tight text-on-surface">Mi perfil</h1>
          <p className="mt-1 text-sm text-muted-on">{user.email}</p>
        </div>
      </header>

      <Card title="Cómo te ve el equipo">
        <ProfileForm
          action={updateProfileAction.bind(null, { clientId, brandId })}
          displayName={me?.displayName ?? ""}
          jobTitle={me?.jobTitle ?? null}
        />
        <p className="text-xs text-muted-on">
          Tu correo no se muestra junto a las tareas: el equipo ve solo tu nombre y tu cargo.
        </p>
      </Card>
    </main>
  );
}
