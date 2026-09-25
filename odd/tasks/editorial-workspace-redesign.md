# editorial-workspace-redesign

## Objective

Turn the Ventex marketing workspace from a dense document-like interface into an editorial, scannable working surface inspired by the [Steep style reference](https://styles.refero.design/style/75fdb89f-ca64-41b3-af36-7a78bd09448e).

## Problem and why

The current dark, narrow, single-column pages give a brand fact list the first screen and present the proposal's nine sections as a long text document. The owner cannot quickly locate the current audience, next action, proposal status, or review controls.

## Authorized scope

Visual hierarchy, navigation, spacing, responsive layout, and presentational components for the workspace, proposal detail, and comparison page. Preserve existing data, generation, review, export, and manual-results behavior. No new publication, advertising, analytics, or remote integrations.

## Design constraints

- Adapt, do not copy: paper/ink neutrals, one restrained peach accent per view, regular serif display type, sans UI, pill actions, 16–24px soft surfaces, hairline borders, little shadow.
- Keep UI text in professional Spanish and source identifiers/comments in English.
- Colors remain in `src/app/globals.css` tokens; components use token-backed utilities.
- Preserve provenance and approval status semantics, keyboard focus, readable contrast, and mobile flow.
- Current `.env.example` deletion and untracked `.atl/`/`.codegraph/` are pre-existing user/worktree state; do not include or revert them.
- TDD: off (existing project task configuration). Runner: `npm test` (`tsx --test`). RDD: off (global status verified). Delivery strategy: `exception-ok` for direct-to-main delivery of a forecast ~800 authored changed lines; the owner explicitly confirmed a direct push to `origin/main` using this computer's configured Git session after implementation and verification, with no PR. This does not waive checks or authorize unrelated files.

## Tasks

- [ ] **UX1** Establish editorial design tokens and shared primitives. Route: delegated; writer trigger (2+ non-trivial files) and preparation trigger. Checks: lint, typecheck, build, browser style spot check.
- [ ] **UX2** Recompose the workspace with a clear header, audience navigation, action-oriented overview, and grouped/secondary reference material. Route: delegated; writer trigger. Checks: lint, typecheck, browser desktop/mobile and keyboard pass.
- [ ] **UX3** Recompose proposal detail and comparison views for quick scanning, sticky/jump navigation where useful, and accessible review actions. Route: delegated; writer trigger. Checks: lint, typecheck, tests, build, browser desktop/mobile and keyboard pass.

## Acceptance criteria

- Current audience, proposal state, and primary next action are visible without scanning the brand fact list.
- Brand facts and provenance remain accessible but do not dominate the landing view.
- Proposal sections are navigable and visually differentiated while retaining all nine sections and status/review controls.
- Desktop and mobile layouts remain legible with no horizontal overflow; focus is visible and keyboard actions work.
- Existing functional checks pass; no change to domain/use-case behavior.

## Progress and evidence

- Reference inspected on 2026-09-24: Steep's paper/ink palette, peach callout, serif headings, pill controls, soft cards, quiet elevation.
- Current desktop browser inspected: workspace and proposal are narrow, dark, single-column stacks; action flow is buried below long content.
- CodeGraph map identifies workspace page, proposal page, comparison page, `globals.css`, atoms, and presentation organisms as the bounded UI surface.
- **UX1 implementation pending commit.** Editorial tokens and primitive styles updated in `globals.css`, root layout, and Badge/Button/Card/fields atoms. Browser spot check observed updated type, pills, cards, and status badges, but workspace still has its old document-like information hierarchy (UX2). `npm run lint`, `npm run typecheck`, `npm test` (80 tests), `git diff --check`, and `npx next build --webpack` passed. Standard `npm run build` failed because Turbopack could not bind a local port (`EPERM`), even with escalation; this remains a pending check rather than a passing build.
- Owner confirmed direct-to-main delivery without a PR. Next: commit UX1 as its own work unit, then continue UX2. User's pre-existing worktree state remains untouched.
