# organizacion-tareas

## Objective

Split the workspace into two top-level tabs — **Marketing** (existing strategist workspace) and
**Organización** (team's own work) — and ship the first Organización feature: a Notion-style
development task notebook (table + board + per-task Markdown notes, free-text assignees).

## Done (branch `claude/busy-tesla-mzbf8n`)

- `src/modules/tasks` (domain, use cases create/update/delete, JSON + in-memory + Supabase adapters).
- Migration `supabase/migrations/20261002120000_dev_tasks.sql` (RLS bound to client owner). **Not applied yet.**
- Routes: `/c/[clientId]/b/[brandId]/organizacion` and `/organizacion/[taskId]`; tabs shell in
  `[brandId]/layout.tsx` + `components/organisms/WorkspaceTabs.tsx`.
- Superhuman-style tokens in `src/app/globals.css` (parchment/wine/violet/lilac, light only, weight 460).
- Checks passing at hand-off: `npm run lint`, `npm test` (220), `npm run build`.

## Pending

- [ ] Apply the `dev_tasks` migration to the real Supabase project.
- [ ] Configure `.env.local` (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_OWNER_ID) and log in.
- [ ] Browser pass (desktop + mobile, keyboard): Marketing tab, Organización tab, board/table, filters,
      status select, notes editor toolbar + preview, delete confirm.
- [ ] Fix visual issues vs the Superhuman design.md (not yet visually verified).
- [ ] Optional: drag-and-drop between board columns; deep-lagoon feature band / wine footer from the design.
- [ ] If `.data/` JSON was used, `npm run import:data -- --dry-run` now also covers `dev-tasks.json`.
