/**
 * Pure repository-backend selection, factored out of `container.ts` so this
 * fail-closed decision (see `odd/tasks/supabase-production-persistence.md`)
 * is unit-testable without constructing any real adapter, Gemini client, or
 * Supabase client.
 */
export type RepositoryBackend = "supabase" | "json" | "unconfigured-production";

export interface RepositoryBackendEnv {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  /** Vercel sets this on every deployment, including preview deployments. */
  VERCEL?: string;
  NODE_ENV?: string;
  /** Set by Next.js itself — see the build-phase note on `resolveRepositoryBackend` below. */
  NEXT_PHASE?: string;
}

const NEXT_PHASE_PRODUCTION_BUILD = "phase-production-build";

/**
 * - `"supabase"`: both `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are set
 *   — used regardless of environment, so a developer can also point their
 *   local machine at Supabase.
 * - `"json"`: Supabase is not configured and this is not a production
 *   runtime — the local JSON file store is a local-development-only
 *   fallback.
 * - `"unconfigured-production"`: Supabase is not configured and this *is* a
 *   production runtime (Vercel, or `NODE_ENV === "production"`). The caller
 *   must fail closed here — Vercel's function filesystem is
 *   read-only/ephemeral, so silently falling back to the JSON store would
 *   resurface the `ENOENT`/`EROFS` failures this migration exists to fix.
 *
 * One deliberate carve-out: `next build`'s "Collecting page data" step
 * imports every route module (this composition root included) purely for
 * static analysis, with `NODE_ENV=production` set exactly like the deployed
 * runtime — but it never serves a real request or writes real data. Next.js
 * marks that step with `NEXT_PHASE=phase-production-build`; excluding it
 * here (falling back to `"json"`) is what makes `npm run build` reproducible
 * without live Supabase credentials. The deployed Vercel *runtime*
 * (`phase-production-server`, no build-phase marker) still resolves to
 * `"unconfigured-production"` exactly as required.
 */
export function resolveRepositoryBackend(env: RepositoryBackendEnv): RepositoryBackend {
  const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY);
  if (supabaseConfigured) return "supabase";

  if (env.NEXT_PHASE === NEXT_PHASE_PRODUCTION_BUILD) return "json";

  const isProductionRuntime = Boolean(env.VERCEL) || env.NODE_ENV === "production";
  return isProductionRuntime ? "unconfigured-production" : "json";
}
