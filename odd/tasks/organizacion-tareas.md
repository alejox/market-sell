# organizacion-tareas

## Objective

Split the workspace into two top-level tabs — **Marketing** (existing strategist workspace) and
**Organización** (team's own work) — and ship the first Organización feature: a Notion-style
development task notebook (table + board + per-task Markdown notes, free-text assignees).

## Done (branch `claude/busy-tesla-mzbf8n`)

- `src/modules/tasks` (domain, use cases create/update/delete, JSON + in-memory + Supabase adapters).
- Migration `supabase/migrations/20261002120000_dev_tasks.sql` (RLS bound to client owner). **Not applied yet.**
- Routes: `/c/[clientId]/b/[brandId]/organizacion` and `/organizacion/[taskId]`; tabs shell in
  `[brandId]/layout.tsx` + `components/organisms/WorkspaceSidebar.tsx`.
- Superhuman-style tokens in `src/app/globals.css` (parchment/wine/violet/lilac, light only, weight 460).
- Checks passing at hand-off: `npm run lint`, `npm test` (220), `npm run build`.

## Done since hand-off

- `dev_tasks` migration applied to the Supabase project (table, RLS enabled, 4 policies verified).
- Browser pass on desktop and a 390px frame: Marketing intact; Organización create / table / owner filter /
  task page (notes toolbar, preview, save) / delete with confirmation; visible focus on every control.
- Board cards drag between columns (native HTML5 DnD, optimistic via `useOptimistic`); the per-card status
  select was removed from the board (the table and the task page still have one).
- Top tabs replaced by a sidebar (`WorkspaceSidebar`): fixed column from `md`, horizontal strip below it.

## Pending

- [ ] Drag and drop is mouse/touch-only on the board; status change by keyboard is only via the table or the
      task page. Add a keyboard path if that matters.
- [ ] Optional: deep-lagoon feature band / wine footer from the design.
- [ ] If `.data/` JSON was used, `npm run import:data -- --dry-run` now also covers `dev-tasks.json`.
