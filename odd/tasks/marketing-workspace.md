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
- [ ] **T3** Persistence: repository ports, JSON file adapter with client/brand scoping, Ventex
  seed (facts from ventex.app with provenance; unknowns flagged), isolation tests. — route: delegated (writer A)
- [ ] **T4** Generation: Gemini adapter, prompt builder (brief + facts + feedback + results,
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

## Next step

T3 (writer A) — persistence ports, JSON file adapter, Ventex seed.
