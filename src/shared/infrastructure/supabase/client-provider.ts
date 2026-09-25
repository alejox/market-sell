import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A request-scoped Supabase client factory. Repository adapters take one of
 * these instead of holding a module-level singleton, so every query runs
 * under the authenticated owner's SSR session/cookies for the current
 * request only — never a shared client and never a service-role/secret key.
 *
 * In production this resolves to `createSupabaseServerClient` (see
 * `./server.ts`), which reads the request's cookies via `next/headers`. In
 * tests it resolves to a fake stub — see `./fake-supabase-client.ts`.
 */
export type SupabaseClientProvider = () => Promise<SupabaseClient>;
