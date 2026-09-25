# supabase-production-persistence

## Objective

Replace Vercel-incompatible local JSON persistence with Supabase Postgres, protect the workspace with single-owner Supabase Auth, and enforce client/brand scoping with database RLS.

## Problem and why

Vercel production logs show workspace requests failing when `JsonFileStore` attempts to write under `/var/task`. Supabase has been created for this project, and the owner authorized integrating it with owner authentication and RLS. `OWNER_NAME` is attribution only, not authentication; connecting a server key without an auth boundary would expose public Server Actions and workspace data.

## Authorized scope

- Implement local application changes for Supabase Auth, SSR session handling, owner-only authorization, Postgres migrations/RLS, repository adapters for all seven domain record types, and safe migration of existing local JSON data.
- Target Supabase project ref: `xbduwatnllbwpvcyxkha`.
- The owner has not authorized use of an ambient Supabase/Vercel session, remote schema changes, transferring `.data` records, changing Vercel settings, pushing, or deploying. Stop before any such remote operation and request explicit authorization for the destination, operation, data, and session.
- Preserve existing owner data; importer must never overwrite a remote row silently.

## Constraints and decisions

- Preserve existing application repository ports and domain contracts; infrastructure adapters and the composition root own Supabase I/O.
- Use request-scoped Supabase SSR clients and authenticated identity. Do not put a service-role/secret key in browser code or `NEXT_PUBLIC_*`; do not rely on Proxy/UI visibility alone for authorization.
- RLS must bind each workspace client and its child records to the authenticated owner; verify scope on reads and writes at both adapter and database layers.
- Owner access uses email/password sign-in (no email-delivery/SMTP dependency) and a server-only `SUPABASE_OWNER_ID` allow-list; fail closed when it is missing or does not match the verified Supabase `sub`. No public registration flow is added; public sign-up stays disabled in Supabase. RLS ties the owner UUID to the client root and verifies child rows through that relationship. `OWNER_NAME` remains review attribution, not an auth mechanism.
- Seed/import must be idempotent and safe with concurrent serverless instances. Existing `.data` currently contains 1 client, 1 brand, 2 audiences, 2 briefs, and 1 proposal; there are no review-decision or result-snapshot collection files.
- UI copy remains professional Spanish; identifiers/comments/technical docs remain English.
- TDD: off (source: `odd/tasks/marketing-workspace.md`, no project/session override). Runner: `npm test` (`tsx --test "src/**/*.test.ts"`). Use ordinary focused functional checks.
- RDD: off (global, verified); no review ceremony.
- Route: delegated direct. Mapping trigger: seven ports/adapters, seed, composition root, auth surface span 4+ files; read-only map delegated. Writer trigger: implementation spans multiple non-trivial files; delegate each bounded work unit. Preparation trigger: Next 16/Supabase SSR documentation research delegated before source writes.
- Delivery forecast: approximately 1,000 authored changed lines; strategy `ask-on-risk` (default). Ask once for PR chain strategy before the first work-unit commit; no push or PR is authorized.
- Pre-existing worktree state to preserve: deleted `.env.example`; untracked `.atl/` and `.codegraph/`.

## Tasks

- [x] **SB1** Add single-owner Supabase Auth and enforce authenticated access in server-rendered data reads, Server Actions, and route handlers. Include auth/session tests and login/logout UX. Route: delegated; writer trigger (multi-file auth boundary). Checks: lint, typecheck, focused auth tests, build.
- [x] **SB2** Add versioned Postgres schema and least-privilege grants/RLS policies for clients, brands, audiences, briefs, proposals, review decisions, and result snapshots. Include scope/ownership policy tests. Route: delegated; writer trigger (migration, policy tests, and docs). Checks: SQL/static checks and Supabase local DB tests if available.
- [ ] **SB3** Implement Supabase adapters for all seven repository ports with scoped query/write behavior and adapter tests; keep domain/application ports unchanged. Route: delegated; writer trigger. Checks: focused adapter/isolation tests, lint, typecheck.
- [ ] **SB4** Make workspace seeding concurrency-safe and add a non-overwriting, idempotent importer for existing `.data` collections with data-preservation tests. Route: delegated; writer trigger. Checks: seed/import tests and dry-run verification without remote credentials.
- [ ] **SB5** Wire server-side Supabase clients/adapters through `src/server/container.ts`, document required env names and owner account bootstrap, remove production dependence on local writes, and complete local verification. Route: delegated; writer trigger. Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`, local login/workspace smoke check where credentials are available.

## Acceptance criteria

- The canonical workspace route loads without writing to the Vercel function filesystem.
- Unauthenticated users cannot read workspace data or invoke mutations; each server entry point authorizes the owner independently of UI or Proxy checks.
- Every persisted record is scoped to its client and brand in repository queries and RLS policies; cross-scope reads/writes are denied.
- All seven existing repository ports continue to work without domain/application changes.
- Local seed/import can be rerun without duplicating or silently overwriting records; existing data is preserved.
- No Supabase secret is exposed to the browser; remote configuration/import/deployment remain pending separate user authorization.

## Progress and evidence

- Confirmed Vercel logs show `ENOENT` creating `/var/task/.data` and earlier `EROFS` writing JSON temp files under `/var/task`.
- Confirmed current project has no auth middleware/proxy or action guard; `OWNER_NAME` is only approver attribution.
- Mapped all seven ports/adapters, `JsonFileStore`, seed initialization, and composition root. Read-only map did not inspect row contents or credentials.
- Official/current guidance gathered before writing: Next 16 auth and Server Actions require authorization at each server entry point; Proxy is only an optimistic routing layer. Supabase SSR uses request-scoped cookie clients; verified claims (`getClaims`) rather than trusting `getSession` for auth checks.
- The user supplied project ref `xbduwatnllbwpvcyxkha` and authorized owner Auth + RLS. No remote Supabase/Vercel changes have been made.
- **SB1 implementation:** added email/password owner login and logout, Supabase SSR cookie client, Next 16 `proxy.ts` session refresh, fail-closed verified-claims owner allow-list, and explicit authorization on workspace reads, Server Actions, and proposal export. No service-role key or public signup flow was added.
- **SB1 checks observed:** `npm run lint` passed; `npm run typecheck` passed; full suite passed 82/82 with `node --import tsx --test 'src/**/*.test.ts'`; `git diff --check` passed. The project-standard `npm test` invocation previously failed before tests due sandbox `listen EPERM`; equivalent runner passed. Production build remains unverified: Turbopack reruns failed on sandbox IPC `EPERM`, and webpack fallback failed with `Cannot read properties of null (reading 'hash')`.
- **Progress:** SB1 code is implemented and locally verified except build; checkbox and task closure remain pending work-unit commit. User's unrelated `.env.example` deletion and `.atl/` / `.codegraph/` remain untouched. Active branch: `feat/supabase-production-persistence`.
- **SB2 implementation:** ran `supabase init --with-vscode-settings=false --with-intellij-settings=false` (no remote link/push) to scaffold `supabase/config.toml`. Added `supabase/migrations/20260925053019_workspace_schema.sql` with all seven record tables (`clients`, `brands`, `audiences`, `campaign_briefs`, `proposals`, `review_decisions`, `result_snapshots`) mirroring the domain interfaces in `src/modules/*/domain` field-for-field: `text` primary keys (domain ids are opaque strings, not guaranteed UUIDs — see `src/shared/infrastructure/uuid-id-generator.ts` and the seeded ids in `src/shared/infrastructure/seed/ventex-seed.ts`), `jsonb` for nested structures (`product_facts`, `pains`/`objections`, `budget_range`, proposal `content`/`generation`, `period`, `metrics`), and `text[]` for flat string arrays (`constraints`, `assets`, `missing_information`, `source_references`). `clients.owner_id uuid not null references auth.users(id)` carries the verified Supabase auth subject (the `SUPABASE_OWNER_ID` allow-list from SB1) — a separate infra-only column from the domain's `owner` display-name field. Every child table below `clients` carries both `client_id` and `brand_id` and a composite foreign key `(client_id, brand_id) references brands(client_id, id)`, so a row can never be attached to a brand belonging to a different client; `audiences`, `campaign_briefs`, and `proposals` additionally expose a `unique (client_id, brand_id, id)` so `campaign_briefs`, `proposals`, `review_decisions`, and `result_snapshots` can composite-FK into their parent (audience/brief/proposal) scoped by the same client+brand. RLS is enabled on all seven tables; `anon` is explicitly revoked (and `public` revoked first) on every table; `authenticated` is granted select/insert/update/delete only. `clients` policies bind directly on `owner_id = (select auth.uid())`; every child table's four policies (select/insert/update/delete, with `using`/`with check` as applicable per Postgres semantics) use an inline `exists` against `brands`/`clients` checking both `brand_id` and `client_id` match and `clients.owner_id = (select auth.uid())` — no `security definer` functions were used (unnecessary here since the exists check runs as the invoking role and is itself subject to the same RLS). Indexes were added on `owner_id`, `client_id`, and every child table's `(client_id, brand_id)` plus its most-queried foreign key (`audience_id`, `proposal_thread_id`, `brief_id`, `proposal_id`) to support both the RLS `exists` checks and the repository ports' scoped list/thread queries (`listByThread`, `listByProposal`, `getByAudience`).
- **SB2 tests:** added `src/shared/infrastructure/supabase/migration-schema.test.ts` — a static, Docker-free test that parses the migration SQL and asserts (41 assertions): all seven tables are defined; RLS is enabled on each; `anon` has no grants anywhere in the file and is explicitly revoked per table; every table has select/insert/update/delete policies referencing `auth.uid()`; insert policies carry `with check` and update policies carry both `using` and `with check`; and the five scoped child tables carry `client_id`+`brand_id` with the composite brand-scoping foreign key. `docker info` was checked first and is unavailable in this sandbox, so no local Supabase DB was started and `supabase db reset` was not run — this is purely static SQL-text verification, not a live-schema test.
- **SB2 checks observed:** `node --import tsx --test 'src/**/*.test.ts'` — 123/123 passed (82 pre-existing + 41 new). `npm test` (project-standard runner) — also passed 123/123 in this run (no sandbox `listen EPERM` this time). `npm run typecheck` — passed, no errors. `npm run lint` — passed, no errors/warnings. `git diff --check` — passed, no whitespace errors. No remote Supabase operations were run (no `db push`, `link`, `--linked`, or remote schema changes); the CLI project was only locally scaffolded and the migration file only exists on disk pending the parent's push.
- **SB2 decision gaps / assumptions:** (1) `result_snapshots.period` was modeled as a single `jsonb` column mirroring the domain's nested `{ from, to }` object rather than two `date`/`text` columns — flagged for SB3/review in case the adapter would prefer flat columns. (2) `review_decisions.feedback`'s "required for changes_requested" invariant is left to the domain/application layer, not duplicated as a DB `check` constraint, consistent with "preserve existing application repository ports and domain contracts." (3) `budget_range` and `generation` are nullable `jsonb` (not `not null default '{}'`) since the domain models them as `T | null`, not empty structures. None of these required an owner decision on their own — they follow directly from the existing domain shapes — but SB3 adapters should read this migration's column list before mapping.

## Next step

Before the first work-unit commit, ask the owner once for the PR chain strategy because the forecast exceeds ~400 authored lines. After that answer, close SB1 with a Conventional Commit on the feature branch; then proceed to SB2. Pause before remote project changes, data transfer, Vercel secrets, push, or deployment until separately authorized.

## Session 2026-09-25 updates

- Supabase CLI logged in by the owner in their own terminal; repo linked to `xbduwatnllbwpvcyxkha`; `supabase/.temp/` git-ignored.
- `npm run build` passed locally (resolves SB1's previously unverified build).
- SB1 closed in commit `bf53f5e`.
- SB2: parent reviewed the migration SQL; `supabase db push --dry-run` listed only `20260925053019_workspace_schema.sql`. The owner applied `supabase db push` themselves and confirmed via dashboard screenshot that all 7 tables exist in `public` without the "Unrestricted" (RLS-off) badge.
- Delivery decision: the owner chose to finish SB3–SB5 on this branch and then send everything to `main` together (replaces the chained-PR question).
- Env vars belong in Vercel / `.env.local` only: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_OWNER_ID` (+ existing Gemini/owner vars). Owner-side Supabase setup: create owner user (auto-confirm), disable public sign-ups, set Site URL.
