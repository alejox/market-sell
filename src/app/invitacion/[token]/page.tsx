import { checkInvitation } from "@/server/container";
import { InvitationForms, JoinButton } from "@/components/organisms/InvitationForms";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";
import { joinAsCurrentUserAction, signInAndJoinAction, signUpAndJoinAction } from "./actions";

export const metadata = { title: "Invitación — Devtecia", robots: { index: false, follow: false } };

const DEAD_LINK_MESSAGES = {
  invalid: "Este enlace de invitación no es válido.",
  used: "Este enlace ya fue usado. Pide uno nuevo a quien te invitó.",
  expired: "Este enlace venció. Pide uno nuevo a quien te invitó.",
} as const;

async function signedInEmail(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || typeof data?.claims?.sub !== "string") return null;
    return typeof data.claims.email === "string" ? data.claims.email : "";
  } catch {
    return null;
  }
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await checkInvitation({ token });
  const email = status === "valid" ? await signedInEmail() : null;

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-7 sm:p-9">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">Devtecia · Invitación</p>
        <h1 className="mt-3 text-3xl text-on-surface">Únete al equipo</h1>
        {status === "valid" ? (
          <>
            <p className="mb-7 mt-3 text-sm leading-relaxed text-muted-on">
              Te invitaron a trabajar en el espacio de Devtecia, con el mismo acceso que el resto del equipo.
            </p>
            {email !== null ? (
              <JoinButton action={joinAsCurrentUserAction.bind(null, token)} email={email} />
            ) : (
              <InvitationForms
                signUp={signUpAndJoinAction.bind(null, token)}
                signIn={signInAndJoinAction.bind(null, token)}
              />
            )}
          </>
        ) : (
          <p role="alert" className="mt-3 text-sm leading-relaxed text-muted-on">{DEAD_LINK_MESSAGES[status]}</p>
        )}
      </section>
    </main>
  );
}
