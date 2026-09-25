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
- TDD: off (existing project task configuration). Runner: `npm test` (`tsx --test`). RDD: off (global status verified). Delivery strategy: `exception-ok` for direct-to-main delivery of a forecast ~800 authored changed lines (actual work-unit count ~1,191, largely due reindenting the nine-section renderer); the owner explicitly confirmed a direct push to `origin/main` using this computer's configured Git session after implementation and verification, with no PR. This does not waive checks or authorize unrelated files.

## Tasks

- [x] **UX1** Establish editorial design tokens and shared primitives. Route: delegated; writer trigger (2+ non-trivial files) and preparation trigger. Checks: lint, typecheck, tests, webpack build, browser style spot check passed; standard Turbopack build pending environment fix.
- [x] **UX2** Recompose the workspace with a clear header, audience navigation, action-oriented overview, and grouped/secondary reference material. Route: delegated; writer trigger. Checks: lint, typecheck, tests, browser desktop/mobile and keyboard pass; production build pending.
- [x] **UX3** Recompose proposal detail and comparison views for quick scanning, sticky/jump navigation where useful, and accessible review actions. Route: delegated; writer trigger. Checks: lint, typecheck, tests, build, browser desktop/mobile and keyboard pass.

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
- **UX1 complete**, work-unit commit `3e0db88` (`style(ui): establish editorial workspace foundation`). Editorial tokens and primitive styles updated in `globals.css`, root layout, and Badge/Button/Card/fields atoms. Browser spot check observed updated type, pills, cards, and status badges, but workspace still has its old document-like information hierarchy (UX2). `npm run lint`, `npm run typecheck`, `npm test` (80 tests), `git diff --check`, and `npx next build --webpack` passed. Standard `npm run build` failed because Turbopack could not bind a local port (`EPERM`), even with escalation; this remains a pending check rather than a passing build. Runtime boundary: local browser rendering only; rollback boundary is the six visual source files in `3e0db88` without touching domain/use cases. RDD outcome: disabled/unmanaged (global mode off). Running authored count: 160 source lines plus 44 task-document lines = 204.
- **UX2 complete**, work-unit commit `e3f40cc` (`style(workspace): prioritize strategy and review actions`). Workspace now shows an editorial page title, audience pills, a single accent focus panel with objective/version/status/next action, grouped work cards, and collapsible brand/provenance reference material. Desktop browser showed the action and proposal status above the brand fact list. Mobile browser at 390×844 showed a stacked flow with no horizontal overflow (`scrollWidth: 375`); Tab reached the labeled client/brand selector with visible focus, and accessibility tree exposed the core links and disclosures. `npm run lint`, `npm run typecheck`, `npm test` (80/80), and `git diff --check` passed. A repeated `npx next build --webpack` failed inside Next's webpack bundle with `Cannot read properties of null (reading 'hash')`; standard Turbopack build remains pending due the earlier bind `EPERM`. This build failure is not attributed to UX2 without evidence. Runtime boundary: local browser rendering; rollback boundary is the workspace route and its seven presentation organisms. RDD: disabled/unmanaged. Running authored count: 495 (UX1 204 + UX2 291).
- **UX3 complete**, work-unit commit `871965a` (`style(proposals): make review and comparison scannable`). Proposal detail now leads with version/status/approval provenance, places owner review actions first on mobile and in a sticky aside on desktop, and adds nine working section anchors with four editorial phase dividers. Comparison has matched audience cards, status/version context, and links to each proposal. Desktop and 390×844 mobile browser spot checks passed with no horizontal overflow; a section jump to `#risks` found its target. Print route retains the document header and hides jump navigation in print CSS. Approval confirmation focus was observed on the prompt, and Cancelar returned focus to Aprobar without submitting an owner decision. `npm run lint`, `npm run typecheck`, `npm test` (80/80), `git diff --check`, and an unsandboxed `npm run build` (Turbopack) passed. Earlier sandbox `EPERM` and webpack `null.hash` failures were not reproduced in the final unsandboxed Turbopack check. Runtime boundary: local browser navigation/confirmation without state mutation; rollback boundary is proposal/compare routes and their three presentation organisms. RDD: disabled/unmanaged. Running authored count: ~1,191 (UX1 204 + UX2 291 + UX3 696).
- Local `main` and the feature branch contain the verified redesign without a merge or checkout. `git remote -v` is empty and there is no `origin/main` tracking ref, so remote publication is blocked until the owner provides the repository URL. Next: configure the owner-supplied remote and push `main`; no network operation has been attempted. User's pre-existing worktree state remains untouched.
