import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static checks over the team_invitations migration (same approach as
 * `dev-tasks-migration.test.ts`): invitations are single-use hashed tokens,
 * memberships are only created by accept_invitation(), no member can be
 * removed, and every ownership check in the workspace now goes through
 * is_client_member().
 */

const MIGRATIONS_DIR = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../supabase/migrations");

function load(suffix: string): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(suffix));
  assert.equal(files.length, 1, `expected exactly one *${suffix} migration, found ${files.length}`);
  return readFileSync(path.join(MIGRATIONS_DIR, files[0]), "utf8");
}

const sql = load("_team_invitations.sql");

test("both new tables have row level security and no anon access", () => {
  for (const table of ["team_members", "team_invitations"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon`));
  }
  assert.doesNotMatch(sql, /grant[^;]*on public\.team_\w+ to anon/i);
});

test("invitations store only a unique token hash and always expire", () => {
  assert.match(sql, /token_hash text not null unique/);
  assert.match(sql, /expires_at timestamptz not null/);
  assert.match(sql, /check \(expires_at > created_at\)/);
  assert.doesNotMatch(sql, /\btoken text\b/);
});

test("team_members: members can only read; nothing grants insert, update or delete on it", () => {
  assert.match(sql, /grant select on public\.team_members to authenticated/);
  assert.doesNotMatch(sql, /grant[^;]*(insert|update|delete)[^;]*on public\.team_members/i);
  assert.doesNotMatch(sql, /create policy "[^"]+" on public\.team_members\s+for (insert|update|delete)/);
});

test("there is no way to remove a member anywhere in the migration", () => {
  assert.doesNotMatch(sql, /delete from public\.team_members/i);
});

test("invitations cannot be updated by clients and only unused ones can be cancelled", () => {
  assert.match(sql, /grant select, insert, delete on public\.team_invitations to authenticated/);
  assert.doesNotMatch(sql, /grant[^;]*update[^;]*on public\.team_invitations/i);
  const cancel = sql.match(/create policy "team_invitations_delete_unused"[\s\S]*?;\n/);
  assert.ok(cancel);
  assert.match(cancel[0], /used_at is null/);
});

test("accept_invitation is security definer, authenticated-only, and checks every failure mode", () => {
  const fn = sql.match(/create function public\.accept_invitation[\s\S]*?\$\$;\n/);
  assert.ok(fn);
  assert.match(fn[0], /security definer/);
  assert.match(fn[0], /set search_path = ''/);
  for (const reason of ["not_authenticated", "invitation_invalid", "invitation_used", "invitation_expired"]) {
    assert.match(fn[0], new RegExp(reason));
  }
  assert.match(sql, /revoke all on function public\.accept_invitation\(text\) from anon/);
  assert.match(sql, /grant execute on function public\.accept_invitation\(text\) to authenticated/);
});

test("invitation_status is the only function callable before sign-in", () => {
  assert.match(sql, /grant execute on function public\.invitation_status\(text\) to anon, authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.(accept_invitation|is_client_member)\([^)]*\) to[^;]*anon/);
});

test("every workspace policy now uses is_client_member, and clients stay owner-only to change", () => {
  const original = load("_workspace_schema.sql") + load("_dev_tasks.sql");
  const originalPolicies = [...original.matchAll(/create policy "([^"]+)" on public\.(\w+)/g)].filter(([, , table]) => table !== "clients");
  assert.equal(originalPolicies.length, 28);

  for (const [, name, table] of originalPolicies) {
    const redefined = sql.match(new RegExp(`drop policy "${name}" on public\\.${table};\\ncreate policy "${name}" on public\\.${table}[\\s\\S]*?;\\n`));
    assert.ok(redefined, `${name} must be dropped and recreated`);
    assert.match(redefined[0], /public\.is_client_member\(c\.id\)/);
    assert.doesNotMatch(redefined[0], /owner_id/, `${name} must no longer compare owner_id`);
  }

  const clientsSelect = sql.match(/create policy "clients_select_own" on public\.clients[\s\S]*?;\n/);
  assert.ok(clientsSelect);
  assert.match(clientsSelect[0], /is_client_member\(id\)/);
  for (const kind of ["insert", "update", "delete"]) {
    assert.doesNotMatch(sql, new RegExp(`drop policy "clients_${kind}_own"`), `clients ${kind} must stay owner-only`);
  }
});
