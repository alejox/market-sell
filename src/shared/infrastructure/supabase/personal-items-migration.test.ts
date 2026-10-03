import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Static checks over the personal_items migration: private per user, scoped, no anon access. */

const MIGRATIONS_DIR = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../supabase/migrations");
const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith("_personal_items.sql"));
assert.equal(files.length, 1, "expected exactly one *_personal_items.sql migration");
const sql = readFileSync(path.join(MIGRATIONS_DIR, files[0]), "utf8");

test("personal_items: row level security is enabled and anon is revoked", () => {
  assert.match(sql, /alter table public\.personal_items enable row level security/);
  assert.match(sql, /revoke all on public\.personal_items from anon/);
  assert.doesNotMatch(sql, /grant[^;]*to anon/i);
});

test("personal_items: scoped by client and brand through the composite brand foreign key", () => {
  assert.match(sql, /foreign key \(client_id, brand_id\) references public\.brands \(client_id, id\)/);
  assert.match(sql, /user_id uuid not null default auth\.uid\(\) references auth\.users/);
});

test("personal_items: every operation is bound to the row's own user and to client membership", () => {
  for (const kind of ["select", "insert", "update", "delete"]) {
    const policy = sql.match(new RegExp(`create policy "personal_items_${kind}_own"[\\s\\S]*?;\\n`));
    assert.ok(policy, `missing ${kind} policy`);
    assert.match(policy[0], /user_id = \(select auth\.uid\(\)\)/, `${kind} must bind to the user`);
    assert.match(policy[0], /public\.is_client_member\(client_id\)/, `${kind} must require membership`);
    // The owner gets no special access to other people's items.
    assert.doesNotMatch(policy[0], /owner_id/);
  }
});

test("personal_items: kind is constrained and a note can never be done", () => {
  assert.match(sql, /kind in \('task', 'note'\)/);
  assert.match(sql, /check \(kind = 'task' or done = false\)/);
});
