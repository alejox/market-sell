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
- [ ] **T5** Workspace UI: first screen (client/brand, brief view/edit, audience switch,
  generate/open proposal, compare tracks), proposal renderer with fact/assumption badges. — route: delegated (writer C)
- [ ] **T6** Review workflow: submit, approve (approver + timestamp + version), request changes
  → new draft, archive, history, Markdown export marking approval status. — route: delegated (writer C)
- [ ] **T7** Learning loop: manual result snapshots UI + inclusion in next generation. — route: delegated (writer C)
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

## Next step

T5 (writer C) — Workspace UI: first screen, proposal renderer with fact/assumption badges.
