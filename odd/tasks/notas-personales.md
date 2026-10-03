# notas-personales

## Objective

A private section ("Mis notas") where each person keeps their own tasks and notes. Every user starts empty.

## Done

- Migration `20261004120000_personal_items.sql` (applied): `personal_items`, RLS on `user_id = auth.uid()` + client
  membership, 4 policies; the owner has no special access.
- `src/modules/personal` (domain, use cases, Supabase + in-memory adapters, isolation tests).
- Routes `/c/[clientId]/b/[brandId]/personal` and `/personal/[itemId]`; sidebar item "Mis notas".
- Shared `NotesEditor` extracted from `TaskEditor` (toolbar, preview) and reused here.
- App branding changed to "Devtecia" in titles, sidebar, login and invitation pages. The seeded Ventex
  client/brand (the marketed product, its site and facts) was NOT renamed.

## Pending

- [ ] Decide whether the brand record itself ("Ventex") should also be renamed; that changes the data the
      proposals are generated from.
- [ ] `package.json` name and `supabase/config.toml` project_id still say `ventex-marketing` (technical ids).
