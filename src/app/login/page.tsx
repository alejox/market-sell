import { redirect } from "next/navigation";
import { isAuthenticatedOwner } from "@/shared/infrastructure/supabase/owner-auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await isAuthenticatedOwner()) redirect("/");
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-[24px] border border-border bg-surface-raised p-7 shadow-sm sm:p-9">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">Ventex · Espacio privado</p>
        <h1 className="mt-3 text-3xl text-on-surface">Ingresá a tu espacio</h1>
        <p className="mb-7 mt-3 text-sm leading-relaxed text-muted-on">Este espacio está reservado para su propietario.</p>
        <LoginForm />
      </section>
    </main>
  );
}
