import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Static checks over the profiles_and_assignees migration. */

const MIGRATIONS_DIR = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../supabase/migrations");
const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith("_profiles_and_assignees.sql"));
assert.equal(files.length, 1, "expected exactly one *_profiles_and_assignees.sql migration");
const sql = readFileSync(path.join(MIGRATIONS_DIR, files[0]), "utf8");

test("profiles: RLS on, anon revoked, readable by the team, writable only by oneself, never deletable", () => {
  assert.match(sql, /alter table public\.profiles enable row level security/);
  assert.match(sql, /revoke all on public\.profiles from anon/);
  assert.match(sql, /grant select, insert, update on public\.profiles to authenticated/);
  assert.doesNotMatch(sql, /grant[^;]*delete[^;]*on public\.profiles/i);

  const select = sql.match(/create policy "profiles_select_member"[\s\S]*?;\n/);
  assert.ok(select);
  assert.match(select[0], /public\.is_client_member\(client_id\)/);

  for (const name of ["profiles_insert_self", "profiles_update_self"]) {
    const policy = sql.match(new RegExp(`create policy "${name}"[\\s\\S]*?;\\n`));
    assert.ok(policy, `missing ${name}`);
    assert.match(policy[0], /user_id = \(select auth\.uid\(\)\)/);
    assert.match(policy[0], /public\.is_client_member\(client_id\)/);
  }
});

test("profiles: tied to team membership and constrained in size", () => {
  assert.match(sql, /foreign key \(client_id, user_id\) references public\.team_members \(client_id, user_id\)/);
  assert.match(sql, /length\(btrim\(display_name\)\) between 1 and 80/);
  assert.match(sql, /length\(job_title\) <= 80/);
});

test("accept_invitation still checks every failure mode and now creates the profile", () => {
  const fn = sql.match(/create or replace function public\.accept_invitation[\s\S]*?\$\$;\n/);
  assert.ok(fn);
  assert.match(fn[0], /security definer/);
  assert.match(fn[0], /set search_path = ''/);
  for (const reason of ["not_authenticated", "invitation_invalid", "invitation_used", "invitation_expired"]) {
    assert.match(fn[0], new RegExp(reason));
  }
  assert.match(fn[0], /insert into public\.profiles/);
});

test("dev_tasks: assignee_id must be a member of the same client, and the old text column is dropped safely", () => {
  assert.match(sql, /add column assignee_id uuid/);
  assert.match(sql, /foreign key \(client_id, assignee_id\) references public\.team_members \(client_id, user_id\)/);
  const guard = sql.indexOf("raise exception 'dev_tasks still has free-text assignees");
  const drop = sql.indexOf("alter table public.dev_tasks drop column assignee");
  assert.ok(guard > -1 && drop > guard, "the guard must run before the column is dropped");
});
