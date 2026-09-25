import { signOutOwner } from "@/app/auth-actions";

export function SignOutButton() {
  return (
    <form action={signOutOwner}>
      <button type="submit" className="inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-on-surface hover:bg-muted">
        Cerrar sesión
      </button>
    </form>
  );
}
