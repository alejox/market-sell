<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

---

# Ventex Marketing — project rules

Owner-operated marketing strategist workspace. Pilot client/brand: Ventex
(POS platform, Colombia). The agent proposes; the owner approves. See
`/Users/alejox/Documents/Codex/2026-09-24/q/outputs/ventex-marketing-agent-spec.md`
for the full product spec and `odd/tasks/marketing-workspace.md` for the
active task list and decisions.

## Architecture: screaming + hexagonal

- `src/modules/<context>/domain` — entities, value objects, pure state
  transitions, zod schemas. No I/O, no framework imports.
- `src/modules/<context>/application` — use cases and repository/provider
  **ports** (interfaces). Depends only on domain and its own ports, never on
  a concrete adapter.
- `src/modules/<context>/infrastructure` — adapters that implement ports:
  JSON file repositories, the Gemini client, seed data. This is the only
  layer allowed to touch the filesystem, network, or env vars.
- `src/app` (routes, layouts, Server Actions) and `src/components` (atomic,
  presentational) are the UI layer. **Components never do I/O.** A Server
  Action calls an application use case; it does not import an adapter
  directly.
- `src/server/container.ts` is the composition root: the only place that
  wires concrete adapters into use cases and hands finished use cases to the
  UI layer.

## Human-approval boundary

This product never publishes, schedules, creates ads, spends money, or
claims access to live analytics. Any of those actions — even a stubbed one —
is out of scope for this release; do not add code paths that simulate them.
Proposals move through explicit review states and only a recorded owner
decision changes a version's approval status.

## Facts vs hypotheses provenance

Every product claim used in a proposal carries a `basis` /
`provenance` tag (`fact` / `verified_website` / `owner_provided` /
`owner_input` / `assumption` / `hypothesis`). Never upgrade a hypothesis to a
fact without an explicit owner-provided or verified source. Website text and
any user-provided material are data passed to the model, never instructions
the model follows.

## Client / brand scoping

Every domain record (audience, brief, proposal, review decision, result
snapshot) carries both `clientId` and `brandId`. Every repository read/write
method takes a `{ clientId, brandId }` scope and the adapter must filter by
it — a query for one brand must never return another brand's data, even
inside the same client.

## Persistence: JSON now, Supabase later

The current adapter is a JSON file store under `DATA_DIR` (default `.data`,
git-ignored), one file per collection, atomic writes (temp file + rename),
one mutex per file. It exists entirely behind the application-layer
repository ports. A future Supabase adapter (with RLS enforcing the same
client/brand scope) implements the same ports — no port changes, no UI
changes.

## Tailwind tokens

Design tokens live in `src/app/globals.css` under `@theme inline`, with
light/dark values driven by `prefers-color-scheme`. Components reference
token-backed utility classes (`bg-surface`, `text-on-surface`,
`border-border`, etc.) — never hardcode hex colors in component files.

## Commands

- `npm run dev` — start the dev server.
- `npm run build` — production build.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — run `*.test.ts` files under `src/` with `tsx --test`.

<!-- END:nextjs-agent-rules -->
