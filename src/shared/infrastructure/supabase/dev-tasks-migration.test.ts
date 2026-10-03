import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static checks over the dev_tasks migration (same approach as
 * `migration-schema.test.ts`): the table must have row level security, no
 * anon access, owner-bound policies for every operation, and the composite
 * client/brand foreign key every scoped table carries.
 */

const MIGRATIONS_DIR = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../supabase/migrations");

function loadMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith("_dev_tasks.sql"));
  assert.equal(files.length, 1, `expected exactly one *_dev_tasks.sql migration, found ${files.length}`);
  return readFileSync(path.join(MIGRATIONS_DIR, files[0]), "utf8");
}

const sql = loadMigration();

test("dev_tasks: row level security is enabled and anon is revoked", () => {
  assert.match(sql, /alter table public\.dev_tasks enable row level security/);
  assert.match(sql, /revoke all on public\.dev_tasks from anon/);
  assert.doesNotMatch(sql, /grant[^;]*to anon/i);
});

test("dev_tasks: scoped by client_id and brand_id through the composite brand foreign key", () => {
  assert.match(sql, /client_id text not null/);
  assert.match(sql, /brand_id text not null/);
  assert.match(sql, /foreign key \(client_id, brand_id\) references public\.brands \(client_id, id\)/);
});

test("dev_tasks: status and priority are constrained to the domain's values", () => {
  assert.match(sql, /status in \('todo', 'in_progress', 'in_review', 'done'\)/);
  assert.match(sql, /priority in \('low', 'medium', 'high'\)/);
});

test("dev_tasks: one owner-bound policy per operation, with the right USING / WITH CHECK clauses", () => {
  for (const kind of ["select", "insert", "update", "delete"]) {
    const policy = sql.match(new RegExp(`create policy "dev_tasks_${kind}_own"[\\s\\S]*?;\\n`));
    assert.ok(policy, `missing ${kind} policy`);
    assert.match(policy[0], /c\.owner_id = \(select auth\.uid\(\)\)/, `${kind} policy must bind to auth.uid()`);
    assert.match(policy[0], /b\.client_id = dev_tasks\.client_id/, `${kind} policy must check the client scope`);
    if (kind === "insert") assert.match(policy[0], /with check/);
    if (kind === "update") {
      assert.match(policy[0], /using/);
      assert.match(policy[0], /with check/);
    }
  }
});
