# equipo-invitaciones

## Objective

Let the owner invite people to the workspace. Invited people are admins (same access as the owner, in
Marketing and Organización) and cannot be removed from the app.

## Done

- Migration `20261003120000_team_invitations.sql` (applied to the Supabase project): `team_members`,
  `team_invitations`, `is_client_member()`, `invitation_status()`, `accept_invitation()`; the owner is
  backfilled as a member; the 28 workspace policies now use `is_client_member(c.id)`; `clients` stays
  owner-only to change.
- `src/modules/team` (domain, use cases, Supabase + in-memory adapters, node:crypto tokens).
- Routes: `/c/[clientId]/b/[brandId]/equipo` (create link, members, pending links, cancel link) and the public
  `/invitacion/[token]` (create account / sign in / join when already signed in).
- Access is "owner or member" (`owner-auth.ts`, `hasWorkspaceAccess`); approvals and task authorship record the
  signed-in person's email (the approve use case now takes `reviewer` per call).
- Checks passing: lint, typecheck, tests, build.

## Decisions

- Links are single use, expire after 7 days, shown once; only the hash is stored.
- No member removal anywhere. Cancelling an unused link is allowed.
- Team data is client-scoped (not brand-scoped); this is the one exception to the `{ clientId, brandId }` rule.

## Pending

- [ ] End-to-end join test with a real second account (not done: it creates an Auth user in the real project).
- [ ] If the Supabase project requires email confirmation, new members must confirm their email, then reopen
      the link and sign in ("Ya tengo cuenta"). Decide whether to disable confirmation.
- [ ] No rate limiting on the public invitation page beyond Supabase Auth's own limits.
