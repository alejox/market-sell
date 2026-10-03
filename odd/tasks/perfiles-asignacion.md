# perfiles-asignacion

Delivery 1 of 3 of the "company activities" roadmap (profiles + real assignment, then comments/history,
then the Inicio page).

## Done

- Migration `20261005120000_profiles_and_assignees.sql` (applied): `profiles` (RLS: team reads, each person
  writes their own), backfill for the current team, `accept_invitation()` creates the newcomer's profile,
  `dev_tasks.assignee_id` (composite FK to `team_members`) replaces the free-text `assignee`.
- `src/modules/team`: `Profile`/`Person`, `listPeople`, `updateProfile`, Supabase + in-memory adapters.
- Tasks: `assigneeId`, `AssigneeDirectory` port (assignee must be a member), summary keyed by user id.
- UI: Avatar, "Mi perfil" page, team list with name/title/email, Responsable select with members,
  filters "Mis tareas" + per person, load by person with avatars.

## Notes

- A legacy `.data/dev-tasks.json` with the old `assignee` text imports with no assignee (the field is ignored).
- `currentUserName()` (recorded on approvals and task authorship) is still the email; switching it to the
  profile's display name is a small follow-up.

## Next

- Delivery 2: comments with @mentions + automatic change history on tasks.
- Delivery 3: Inicio (my tasks, mentions, what changed since my last visit).
