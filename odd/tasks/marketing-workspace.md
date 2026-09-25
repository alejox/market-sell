# marketing-workspace

## Objective

Build the first release of the owner-operated marketing strategist workspace described in
`/Users/alejox/Documents/Codex/2026-09-24/q/outputs/ventex-marketing-agent-spec.md`
(pilot client: Ventex, channels Instagram/Facebook, Colombia, two audience tracks).
The agent proposes; the owner approves. Nothing is published, scheduled, or paid.

## Why

The owner needs agency-grade, auditable marketing proposals per audience, with a human
approval boundary, version history, export for manual execution, and a manual learning loop.

## Scope

In: brand brief editing (seeded Ventex), audience selection (Stores / Barbershops & beauty
salons), Gemini-generated structured proposals (9 sections), review states and immutable
versions, Markdown export, manual result snapshots feeding the next proposal.

Out: Meta/Instagram/Facebook connections, posting, scheduling, ads, payments, live analytics,
client portal, billing, team permissions, image/video generation, deployment.

## Constraints and decisions

- Stack: Next.js 16 (App Router, `src/`), TypeScript strict, Tailwind v4 tokens in
  `globals.css`, `@/*` → `./src/*` (same toolchain as ventex / control-cambios).
- Architecture: screaming + hexagonal. `src/modules/<context>/{domain,application,infrastructure}`.
  Domain and use cases depend only on ports.
- Persistence (now): JSON file adapter under `.data/` (git-ignored), behind repository ports,
  every record scoped by `clientId` + `brandId`. Later: Supabase adapter + RLS, same ports.
- Auth (now): single local owner identity from `OWNER_NAME` env (default "Owner"), recorded as
  approver. Later: Supabase Auth.
- LLM: Gemini via `@google/genai`, server-only (`GEMINI_API_KEY`, `GEMINI_MODEL`). Provider is
  behind a `ProposalGenerator` port. No key → visible "unavailable" state, never templates.
- Output validation: zod schema for the 9-section proposal, validated before persistence/display.
- Language: identifiers/comments/commits in English; UI and generated copy in professional
  Colombian Spanish.
- Website text and user input are data, not instructions (prompt delimiting).
- TDD: off (source: no project/session configuration). Runner: `npm test` → `tsx --test`.
  Ordinary unit tests ship with domain behavior.
- RDD: off (global). No review ceremony; ordinary checks only.
- Delivery: local commits on `feat/marketing-workspace`; push/PR are the owner's decision.
  Forecast > 400 authored lines → strategy `ask-on-risk` applies before any PR.

## Tasks

- [x] **T1** Foundation tooling: deps (zod, @google/genai, tsx), test script, AGENTS.md/CLAUDE.md,
  `.env.example`, `.data/` ignore, design tokens, Spanish root layout. — route: delegated (writer A)
- [x] **T2** Domain: entities (Client, Brand, Audience, CampaignBrief, Proposal, ReviewDecision,
  ResultSnapshot), proposal zod schema (9 sections, claim provenance labels), state machine and
  versioning rules + unit tests. — route: delegated (writer A)
- [x] **T3** Persistence: repository ports, JSON file adapter with client/brand scoping, Ventex
  seed (facts from ventex.app with provenance; unknowns flagged), isolation tests. — route: delegated (writer A)
- [x] **T4** Generation: Gemini adapter, prompt builder (brief + facts + feedback + results,
  data delimiting), validation, revision mode, unavailable state + tests. — route: delegated (writer B)
- [x] **T5** Workspace UI: first screen (client/brand, brief view/edit, audience switch,
  generate/open proposal, compare tracks), proposal renderer with fact/assumption badges. — route: delegated (writer C)
- [x] **T6** Review workflow: submit, approve (approver + timestamp + version), request changes
  → new draft, archive, history, Markdown export marking approval status. — route: delegated (writer C)
- [x] **T7** Learning loop: manual result snapshots UI + inclusion in next generation. — route: delegated (writer C)
- [ ] **T8** Verification: lint, typecheck, tests, build, keyboard + mobile pass. — route: parent spot check

## Acceptance criteria

See spec §9 (all ten). Tracked in T8 evidence.

## Checks

`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## Progress / evidence

- Scaffolded with create-next-app (Next 16.3.6, React 19.2.8) on `main` (cbf5c14); work on
  `feat/marketing-workspace`.

- **T1** done. `npm i zod @google/genai` (zod 4.6.5, @google/genai 2.24.0) + `npm i -D tsx`
  (4.23.15). Verified `gemini-3.8-flash` is a literal in the installed package's `Model` type
  union (`node_modules/@google/genai/dist/node/node.d.ts`) — kept `GEMINI_MODEL` configurable
  via `.env.example` regardless, per the constraint that a missing key must show "unavailable",
  never a template. Added `test`/`typecheck` npm scripts. `.gitignore`: `.env*` stays ignored,
  `!.env.example` un-ignores the example file, `/.data/` added. AGENTS.md: kept the
  auto-generated Next block, appended project rules (architecture, human-approval boundary,
  provenance, client/brand scoping, persistence plan, Tailwind tokens, commands). `globals.css`:
  `@theme inline` tokens (surface/on-surface/primary/muted/border/success/warning/danger/info)
  with dark values under `prefers-color-scheme`. Root layout: `lang="es-CO"`, Spanish metadata
  title/description. `page.tsx`: create-next-app boilerplate replaced with a minimal Spanish
  placeholder (real UI is T5).
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run typecheck`: clean.
  - `npm run build`: succeeded (Next 16.3.6, Turbopack, static `/`).

- **T2** done. Domain split across screaming contexts: `src/modules/clients/domain`
  (`client.ts`, `brand.ts` with `ProductFact`/`FactProvenance`), `src/modules/strategy/domain`
  (`claim.ts` — shared `ClaimBasis`/`Claim<T>` + zod `claimSchema`, `audience.ts`,
  `campaign-brief.ts`, `proposal.ts` entity, `proposal-content.schema.ts` — the 9-section zod
  schema, `json-schema-sanitizer.ts`), `src/modules/review/domain` (`review-decision.ts`,
  `proposal-lifecycle.ts` — pure `submitForReview`/`approve`/`requestChanges`/`archive`/
  `createRevision`), `src/modules/results/domain` (`result-snapshot.ts`). Shared `Result<T,E>`
  type in `src/shared/result.ts` (cross-cutting kernel, not a bounded context). Every
  Audience/CampaignBrief/Proposal/ReviewDecision/ResultSnapshot carries `clientId` + `brandId`.
  `proposalContentSchema` covers all 9 sections from spec §4 with `basis`-tagged claims on the
  fields that matter (audience insight, positioning, campaign concept core message/CTA, creative
  concept, paid-promotion audience hypothesis); content plan enforces all 4 weeks present via
  `.refine`; creative briefs enforce at least one `short_video`/`carousel`/`static_or_story` via
  `.refine`; `budgetRange` stays nullable (owner-only). `getProposalContentJsonSchema()` exports
  a Gemini-safe JSON Schema — `json-schema-sanitizer.ts` inlines `$defs`/`$ref` (only emitted by
  zod on cycles), and collapses both of zod's `.nullable()` shapes (`anyOf:[T,{type:"null"}]`
  for object/array branches, `type:[T,"null"]` for zod's own pre-collapsed primitive branches)
  into `{ ...T, nullable: true }`; drops `$schema`/`$id`/`additionalProperties`. Lifecycle
  functions return `Result`, never throw; `approve` records `approvedBy`/`approvedAt` and keeps
  `version` unchanged; `createRevision` only allowed from `changes_requested`/`approved`, returns
  a brand-new object (verified via a frozen-copy equality check in the test) at `version + 1`
  with `parentVersion` set and `state: "draft"`.
  - `npm test`: 18/18 passing (`proposal-lifecycle.test.ts`,
    `proposal-content.schema.test.ts`, `json-schema-sanitizer.test.ts`).
  - `npm run typecheck`: clean.
  - `npm run lint`: 0 errors, 0 warnings.
  - Commit `cbe9d2b` (foundation) precedes this task's commit.

- **T3** done. Ports in `src/modules/<context>/application/ports/`: `ClientRepository` (no
  scope — Client is the scope root), `BrandRepository` (scoped by `clientId` only,
  `listByClient` is the one exception), `AudienceRepository`, `BriefRepository` (+
  `getByAudience`), `ProposalRepository` (+ `listByThread`), `ReviewDecisionRepository`,
  `ResultSnapshotRepository` (both + `listByProposal`) — all scoped by `{ clientId, brandId }`.
  Shared infra in `src/shared/infrastructure/`: `CollectionStore<T>` interface implemented by
  `JsonFileStore` (atomic write: temp file + `rename`; one in-process write queue per instance
  serializes read-modify-write cycles) and `InMemoryStore` (tests); `ScopedRepository<T>` and
  `IdentifiedRepository<T>` implement the list/getById/save logic once and are reused by every
  JSON and in-memory adapter to avoid 14 near-duplicate classes — `getById` re-checks the found
  record's `clientId`/`brandId` against the requested scope (not just matching by id), which is
  what makes a cross-scope read return nothing rather than merely "not queried for". Seed
  (`src/shared/infrastructure/seed/ventex-seed.ts`) is idempotent on a fixed Ventex client id
  (`client-ventex-owner`), not on "store is empty" — safe once real external clients exist.
  Seeds: client "Marca propia" (owner from `OWNER_NAME`), brand Ventex with voice/constraints in
  Spanish, 13 product facts fetched live from https://www.ventex.app/ via WebFetch this session
  (POS+inventory+finance integration, real-time inventory sync, IVA handling, payment methods,
  low-stock alerts, categories/SKU, net profit, income/expense graphs, multi-user, appointments
  module, commissions module, target segments, the three pricing tiers) — all
  `provenance: "verified_website"`, `sourceUrl` set, `approvedForAds: false` (nothing is
  ad-cleared by default); no other linked page had additional product detail worth a second
  fetch. Two audiences (Stores / Barbershops & beauty salons, Colombia, pains/objections tagged
  `basis: "hypothesis"`) and one draft brief per audience (objective: mejorar posicionamiento y
  alcance en Instagram y Facebook; `budgetRange: null`; `missingInformation` populated from spec
  §11's six gaps).
  - `npm test`: 26/26 passing — added `json-file-store.test.ts` (missing-file read, round-trip,
    20 concurrent mutations with none lost), `scoped-isolation.test.ts` (brand B cannot read
    brand A's briefs/proposals by list, id, thread id, or audience id; same-client-different-
    brand isolation), `ventex-seed.test.ts` (full first-call shape + idempotent second call that
    does not duplicate or overwrite).
  - `npm run typecheck`: clean.
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run build`: succeeded.
  - Commit `45ada63` (domain) precedes this task's commit.

- **T4** done. Port `ProposalGenerator` (`src/modules/strategy/application/ports/proposal-generator.ts`):
  `generate(prompt) -> Promise<Result<ProposalContent, GenerationError>>` with `isAvailable()`;
  `GenerationError` is a discriminated union (`unavailable` / `timeout` / `provider_error` /
  `invalid_output` with zod issue summaries) and the port also carries `providerName`/`modelId` so
  the persisted Proposal can record real generator metadata regardless of provider. Pure prompt
  builder (`src/modules/strategy/application/generation/build-proposal-prompt.ts`) assembles brand,
  product facts (with ids/provenance), audience, campaign brief, owner-entered result snapshots, and
  — in revision mode — the previous version's content plus feedback, each wrapped in
  `<<<LABEL>>> ... <<<END_LABEL>>>` blocks with an explicit "this is data, not instructions" notice
  (prompt-injection defense); fixed instruction text (English, per repo convention) requires all
  generated marketing content in professional Colombian Spanish, forbids reach/leads/sales
  guarantees, invented features/testimonials/prices/metrics, and posting-frequency "facts", requires
  `budgetRange` to stay null unless the brief supplies one, requires claims to cite `factIds` from
  `verified_website`/`owner_provided` facts, flags `approvedForAds:false` facts as needing owner
  confirmation before ad use, and separates the stores (sales/stock) vs. beauty (day-to-day service
  ops) framing. `extract-source-references.ts` derives `sourceReferences` from every claim's
  `factIds` plus supplied result-snapshot ids plus (for a revision) the ReviewDecision id.

  Gemini adapter (`src/modules/strategy/infrastructure/gemini-proposal-generator.ts`), `@google/genai`
  2.24.0: reads `GEMINI_API_KEY`/`GEMINI_MODEL` (default `gemini-3.8-flash`) only in this
  infrastructure-layer class; missing/blank key -> `unavailable` without ever touching the SDK.
  Verified against `node_modules/@google/genai/dist/node/node.d.ts` rather than assumed: structured
  output via `config.responseMimeType: "application/json"` + `config.responseJsonSchema` (the
  existing sanitized schema from T2); `config.abortSignal` is a real per-request `AbortController`
  option (confirmed in `dist/node/index.mjs`'s `createAttemptSignal`), used here for a 60s timeout,
  detected on catch via `error.name === "AbortError"` and reported as `GenerationError.timeout`,
  distinct from `provider_error`. On invalid JSON or a failed `proposalContentSchema` parse, exactly
  one repair retry re-sends the original prompt plus the model's own malformed response plus a
  message listing the zod issues (`path: message` per issue) and asking it to fix only those; a
  second failure returns `invalid_output` with the issues, never a partial/guessed proposal. The
  `server-only` package is not installed in this project (checked node_modules and
  package-lock.json) and Next 16's docs don't require it for this boundary, so the server-only
  guarantee is enforced by convention/comments: only `src/server/container.ts` constructs this
  adapter, and nothing under `src/app`/`src/components` imports it.

  Use cases (`src/modules/strategy/application/use-cases/`): `generateProposal({scope, briefId})`
  loads brand/audience/brief, checks `generator.isAvailable()` before any generation call, computes
  the next version in the brief's thread (`proposalThreadId = brief.id`; version = latest + 1,
  `parentVersion: null` — a fresh/regenerated draft is not a feedback-linked revision, only
  `reviseProposal` sets `parentVersion`), and persists a new `draft` Proposal with `sourceReferences`
  and `generation: {provider, model, generatedAt}` only once generation succeeds and validates.
  `reviseProposal({scope, proposalId, feedback, reviewer})` loads the current proposal, calls the
  review module's pure `requestChanges` (in_review -> changes_requested) to validate the transition
  *without persisting it yet*, then loads brand/audience/brief and calls the generator with revision
  context; only after a valid revised proposal exists does it persist, in order: the state
  transition, a `ReviewDecision` (kind `changes_requested`), and the new draft `v(n+1)` from the
  review module's `createRevision` (parentVersion set, generation metadata attached) — so
  `unavailable`/`timeout`/`provider_error`/`invalid_output` from generation, and `feedback_required`
  from empty feedback, all leave every repository untouched. `Clock`/`IdGenerator` ports
  (`src/shared/application/ports/`, backed by `SystemClock`/`UuidIdGenerator` in
  `src/shared/infrastructure/`) make both use cases deterministic under test.

  Domain: `Proposal` (`src/modules/strategy/domain/proposal.ts`) gained
  `generation: ProposalGenerationMetadata | null` (provider/model/generatedAt) — T2 didn't have a
  place to record which model produced a version, and this release requires that generator metadata
  is persisted; `review/domain/proposal-lifecycle.ts`'s `createRevision` sets `generation: null` by
  construction (the caller — `reviseProposal` — overwrites it with the real metadata after a
  successful generation), and the two existing T2/T3 test fixtures that construct a full `Proposal`
  literal were updated with `generation: null` for type-checking; no other behavior in those files
  changed.

  Composition root `src/server/container.ts` (server-only by the same
  convention/no-package approach): wires the JSON repositories + `GeminiProposalGenerator` +
  `SystemClock`/`UuidIdGenerator` into both use cases, exposes `repositories` and
  `isGenerationAvailable()` for later UI tasks, and lazily runs `ensureVentexSeed` at most once per
  process (memoized promise) before either exported use case executes.

  Decision gap for the owner/T6: `reviseProposal` only revises a proposal that is currently
  `in_review` (via `requestChanges`), per this task's literal instruction ("uses lifecycle
  requestChanges"). Starting a *new* iteration directly from an already-`approved` version (e.g.
  after entering new result snapshots, without an in-between review cycle) is not wired up here —
  the review-lifecycle primitive (`createRevision` from `"approved"`) supports it, but no use case
  calls it that way yet. Flagging rather than guessing; likely belongs to T6/T7.

  - `npm test`: 54/54 passing (16 new: 12 prompt-builder + 5 use-case tests trimmed/plus adapter
    tests — see file list below). No real network calls: the adapter's own tests only exercise
    `isAvailable()`/the no-key `unavailable` path; use-case tests use a fake `ProposalGenerator`.
  - `npm run typecheck`: clean.
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run build`: succeeded (Next 16.3.6, Turbopack, static `/`).
  - New/changed files: `src/modules/strategy/application/ports/proposal-generator.ts`,
    `src/modules/strategy/application/generation/{proposal-generation-context,build-proposal-prompt,
    build-proposal-prompt.test,extract-source-references}.ts`,
    `src/modules/strategy/application/use-cases/{generate-proposal,generate-proposal.test,
    revise-proposal,revise-proposal.test,test-fixtures}.ts`,
    `src/modules/strategy/infrastructure/{gemini-proposal-generator,gemini-proposal-generator.test}.ts`,
    `src/shared/application/ports/{clock,id-generator}.ts`,
    `src/shared/infrastructure/{system-clock,uuid-id-generator}.ts`, `src/server/container.ts`;
    modified `src/modules/strategy/domain/proposal.ts`, `src/modules/review/domain/proposal-lifecycle.ts`,
    `src/modules/review/domain/proposal-lifecycle.test.ts`, `src/modules/strategy/infrastructure/scoped-isolation.test.ts`.

- **T5** done. No landing page: `/` (`src/app/page.tsx`) awaits `ensureWorkspaceSeeded()` (renamed/exported
  from the former private `ensureSeeded` in the container so a Server Component can read `repositories`
  directly for a pure listing) and redirects to `/c/[clientId]/b/[brandId]` for the first seeded
  client/brand. Audience selection is a `?audience=<id>` search param (`AudienceTabs`, plain `next/link`
  segmented control, no client JS needed). `ClientBrandSelector` (client component, native `<select>`)
  reads the real client/brand list via `repositories.clients.list()` / `listByClient` — only Ventex is
  seeded, but it is not hardcoded.

  New use cases (with tests): `updateBrand` (`src/modules/clients/application/use-cases/update-brand.ts`)
  edits voice/constraints/assets/productFacts and enforces the domain invariant added to
  `clients/domain/brand.ts` (`findHypothesisApprovedForAds` — a `hypothesis` fact can never be
  `approvedForAds: true`); `updateAudience` edits pains/objections/hypotheses; `updateCampaignBrief` edits
  objective/timeframe/valueProposition/budgetRange(min/max/COP)/missingInformation. All three only touch
  their own repository — never proposals — so saving a brief can never affect an existing proposal version.

  UI: atomic components under `src/components/{atoms,molecules,organisms}` (Badge/Button/fields/Card;
  ClaimText/StatusMessage/RepeatableTextField/ClaimListField; BrandBriefSection/AudienceSection/
  CampaignBriefSection each pairing a read-only view with a `<details>`-collapsed edit form —
  `BrandEditForm`/`AudienceEditForm`/`CampaignBriefEditForm`, all client components using
  `useActionState` against a bound Server Action prop, so `src/components` never imports a route's
  actions module directly). `ProposalThreadSection` lists versions with state badges plus
  `GenerateProposalForm` ("Generar propuesta"/"Generar nueva propuesta"); on success the action redirects
  to the new version's page, on `unavailable`/`timeout`/`provider_error`/`invalid_output` it shows the
  exact Spanish message inline (never template content presented as AI output).
  `ProposalDocument` renders all 9 sections (claim basis badges via `ClaimText`, cited `factIds` resolved
  to their statements, missing information and risks sections prominent, version/state/generation
  metadata in the header). `CompareAudiences` (`/c/[clientId]/b/[brandId]/compare`) shows both tracks'
  latest positioning/campaign concept/creative briefs side by side (`grid-cols-1 lg:grid-cols-2`, stacks
  on mobile), or "Sin propuesta aún."

  Server Actions live in the route's colocated `actions.ts` (`"use server"`), each validating input with
  zod and calling a container-exposed use case — never an adapter. `ActionState`/`BoundFormAction` live in
  `src/components/action-state.ts` (outside any `"use server"` file) so presentational components can
  import the type without pulling in server-action module semantics; route Server Components bind
  `scope`/id args via `.bind(null, ...)` before passing the action down as a plain prop.
  `eslint.config.mjs` gained one rule override (`argsIgnorePattern`/`varsIgnorePattern: "^_"`) because a
  Server Action's fixed `(prevState, formData)` shape sometimes leaves one arg intentionally unused.

  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run typecheck`: clean.
  - `npm test`: all use-case tests passing (see full count in T7 evidence — T5/T6/T7 landed together and
    were verified once against the final combined tree; per-task commits are still split by file
    ownership, see commit hashes below).
  - New files: see `git show --stat` on this commit; key ones listed above.
  - Work-unit commit: `e28f526` (`feat(workspace): add owner workspace UI with brief editing and
    proposal generation`).

- **T6** done. New use cases (`src/modules/review/application/use-cases/`, all with tests):
  `submitForReview` (draft → in_review), `approveProposal` (in_review → approved; records a
  `ReviewDecision` with `reviewer` = `OWNER_NAME` sourced once in the container and threaded through as a
  plain string dependency — never re-read from env inside the use case), `archiveProposal` (any
  non-archived state → archived; archiving is not a review decision, so no `ReviewDecision` is written),
  `listReviewHistory` (every decision across every version in one thread, oldest first). `requestChanges`
  reuses the existing T4 `reviseProposal` use case unchanged, per the task's own instruction.

  Resolved the T4 decision gap: `iterateFromApproved`
  (`src/modules/strategy/application/use-cases/iterate-from-approved.ts`) starts a new draft directly from
  an `approved` version — fails fast with `invalid_transition` if the source proposal is not `approved`,
  loads brief/audience/brand, checks generator availability, builds a *non*-revision prompt (no
  `OWNER_FEEDBACK`/`PREVIOUS_PROPOSAL` blocks — this is not owner feedback, it is "regenerate with what we
  now know"), and calls `review/domain/proposal-lifecycle`'s `createRevision` (already supported
  `"approved"` as a source state since T2) to get `parentVersion` set and a fresh `draft`. No
  `ReviewDecision` is recorded and the approved source proposal is never re-saved — verified in the test by
  asserting the persisted v1 is `deepEqual` to its original content after the call. This needed
  `ResultSnapshotRepository.listByThread` (added to the port + both adapters here, one commit ahead of its
  full T7 payoff) so the new iteration sees every result recorded anywhere in the thread, not one exact
  proposal id.

  Export: `renderProposalMarkdown` (`src/modules/strategy/application/export/render-proposal-markdown.ts`)
  is a pure function — header states brand/audience/version/state, `**Aprobado por:**`+timestamp when
  approved, otherwise a `> **BORRADOR — NO APROBADO**` marker at the very top; every claim line resolves
  cited `factIds` to their statements and tags `[Hecho]`/`[Dato del propietario]`/`[Supuesto]`/`[Hipótesis]`;
  a closing "Referencias de origen" section lists every source reference (also fact-resolved where
  possible). `GET .../proposals/[proposalId]/export/route.ts` returns it as `text/markdown` with
  `Content-Disposition: attachment`. `.../proposals/[proposalId]/print/page.tsx` reuses the same
  `ProposalDocument` component the interactive page uses, adds a `PrintTriggerButton` (`window.print()`,
  `print:hidden`), and `globals.css` gained a `@media print` block that pins the color tokens to their
  light values regardless of the viewer's OS theme (no dark-background page eating ink).

  UI: `ReviewControls` (client, state-aware: draft→"Enviar a revisión"; in_review→"Aprobar" behind an
  explicit two-step confirmation panel, plus "Solicitar cambios" with a required feedback textarea;
  approved→export/print links, "Iniciar nueva iteración", "Archivar"; changes_requested/archived→status
  text only) and `ReviewHistoryTimeline` (ordered list, decision/reviewer/version/feedback/date, rendered
  both on the proposal page for its own thread and on the workspace page below the version list). Viewing
  any old version works because every version is its own `Proposal` id/route —
  `.../proposals/[proposalId]` has no "only latest" restriction.

  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run typecheck`: clean.
  - `npm test`: passing (full count in T7 evidence — verified once against the final combined tree; see
    commit hashes below for the per-task split).
  - Work-unit commit: `eb4729b` (`feat(review): add review workflow, approved-version iteration,
    and export`).

- **T7** done. Domain rename (`src/modules/results/domain/result-snapshot.ts`): `ResultMetric.metric` →
  `.name` (matches the spec's `{name, value, unit}` shape for the dynamic metrics list) and `source`
  widened from the single literal `"manual_owner_entry"` to `ResultSnapshotSource =
  "manual_owner_entry" | "manual_meta_export" | "manual_other"` — every option is still a manual entry
  (`RESULT_SOURCE_LABELS` in `src/components/labels.ts`: "Ingreso manual del propietario" / "Exportación de
  Meta Business Suite (manual)" / "Otro"); the UI never uses the word "sincronizado". New use cases (with
  tests): `recordResultSnapshot` (resolves `proposalThreadId` from the given proposal id, so a result
  survives being tied to "this thread", not one exact version) and `listResultSnapshots`
  (thread-scoped, oldest first).

  Verified whether generation already included the latest snapshots and fixed two real scoping bugs found
  in the process (not template placeholders — actual bugs from T4):
  1. `generateProposal` was calling `resultSnapshots.list(scope)` — every snapshot for the whole
     client+brand, i.e. a Stores proposal could pick up Salons' results and vice versa, since `Scope` is
     only `{clientId, brandId}` and has no audience dimension.
  2. `reviseProposal` was calling `resultSnapshots.listByProposal(scope, current.id)` — only the results
     recorded against that *one exact proposal version*, missing anything recorded against an earlier or
     later version in the same thread.
  Fixed both by adding `listByThread(scope, proposalThreadId)` to `ResultSnapshotRepository` (port + both
  adapters — landed in the T6 commit because `iterateFromApproved` needed it a task earlier) and switching
  `generateProposal`/`reviseProposal` to call it with the thread id instead of the whole scope or one
  proposal id. `extractSourceReferences` already included every supplied snapshot's id in
  `sourceReferences` (verified via the existing revise-proposal test's assertion plus the new
  iterate-from-approved test) — no changes needed there once the input list was correctly scoped.

  UI: `ResultSnapshotForm` (client, dynamic metrics list via one hidden JSON field, `<input type="date">`
  period, fixed source `<select>`, an explicit "se registra manualmente" notice) and
  `ResultSnapshotsSection` (list + collapsed form, only rendered on the workspace page once at least one
  proposal exists for the thread — recording a result needs a proposal id to resolve the thread from).

  - `npm run lint`: 0 errors, 0 warnings.
  - `npm run typecheck`: clean.
  - `npm test`: **80/80 passing** (final combined tree, T2–T7).
  - `npm run build`: succeeded (Next 16.3.6, Turbopack).
  - Smoke test: `GEMINI_API_KEY= DATA_DIR=<temp dir> npm run dev -p <free port>`, `curl -sL /` → HTTP 200,
    followed the `/` → `/c/client-ventex-owner/b/brand-ventex` redirect, response contains
    `lang="es-CO"`, "Marca: Ventex", "Tiendas / comercio minorista", "Verificado en sitio web", "Generar
    propuesta"; no Gemini call was triggered (GET only). Server stopped afterward.
  - Work-unit commit: `73fbb32` (`feat(results): record manual campaign outcomes by audience thread`).
    Focused tests: `npm test` 80/80; runtime smoke test as above. Rollback boundary: this commit's
    result-entry UI/use cases and thread-scoped generation changes, without removing T5/T6.

## Delivery note

This branch (T5+T6+T7 combined, on top of T4's `9d48aae`) is **4,203 authored changed lines**
(`git diff --shortstat 9d48aae..73fbb32`: 4,170 additions + 33 deletions), well past the ~400-line
per-task advisory heuristic — expected here since the three tasks are tightly coupled (workspace UI,
review workflow, and the learning loop all
share the same route files and composition root) and were delivered as one coherent slice per the original
task assignment. Per the constraints section, forecast > 400 authored lines means strategy `ask-on-risk`
applies before any PR: **the delivery-strategy decision (stacked-to-main vs. feature-branch-chain, or a
single PR) has not been made and no PR has been opened or requested.** All work is local commits on
`feat/marketing-workspace`; push/PR remain the owner's decision.

## Next step

T8 — Verification (already substantially covered above: lint/typecheck/test/build all clean, smoke test
passed). Remaining for a full T8 pass: a manual keyboard-only and 375px-mobile walkthrough of the real
browser UI (this session only verified server-rendered HTML via curl, not interactive keyboard/focus
behavior), and the owner's decision on delivery strategy per the note above.
