import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static checks over the Supabase workspace migration SQL. No Docker/local
 * Supabase is required — this test only parses the migration file's text,
 * so it always runs in CI and in sandboxes without a local Postgres.
 *
 * It exists to catch the two mistakes that matter most for this
 * single-owner, client/brand-scoped workspace (see AGENTS.md "Human-approval
 * boundary" and "Client / brand scoping", and
 * odd/tasks/supabase-production-persistence.md SB2): a table left without
 * row level security, or a policy that does not actually bind to the
 * authenticated owner.
 */

const MIGRATIONS_DIR = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../supabase/migrations");

const ALL_TABLES = [
  "clients",
  "brands",
  "audiences",
  "campaign_briefs",
  "proposals",
  "review_decisions",
  "result_snapshots",
] as const;

/** Every record except clients/brands is scoped by both clientId and brandId (see src/shared/scope.ts). */
const SCOPED_CHILD_TABLES = ["audiences", "campaign_briefs", "proposals", "review_decisions", "result_snapshots"] as const;

const REQUIRED_POLICY_KINDS = ["select", "insert", "update", "delete"] as const;

function loadWorkspaceSchemaMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith("_workspace_schema.sql"));
  assert.equal(files.length, 1, `expected exactly one *_workspace_schema.sql migration in ${MIGRATIONS_DIR}, found ${files.length}`);
  return readFileSync(path.join(MIGRATIONS_DIR, files[0]), "utf8");
}

/** The slice of the migration between `create table public.<table> (` and the start of the next table (or EOF). */
function extractTableSection(sql: string, table: string): string {
  const startMarker = `create table public.${table} (`;
  const start = sql.indexOf(startMarker);
  assert.notEqual(start, -1, `migration does not define table "${table}"`);

  const nextTableStarts = ALL_TABLES.filter((t) => t !== table)
    .map((t) => sql.indexOf(`create table public.${t} (`, start + startMarker.length))
    .filter((index) => index !== -1);

  const end = nextTableStarts.length > 0 ? Math.min(...nextTableStarts) : sql.length;
  return sql.slice(start, end);
}

function policyKindsInSection(section: string): Set<string> {
  const kinds = new Set<string>();
  const regex = /for (select|insert|update|delete)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(section)) !== null) {
    kinds.add(match[1]);
  }
  return kinds;
}

const sql = loadWorkspaceSchemaMigration();

test("migration defines all seven workspace record tables", () => {
  for (const table of ALL_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table} \\(`), `missing table "${table}"`);
  }
});

test("clients carries owner_id referencing auth.users", () => {
  const section = extractTableSection(sql, "clients");
  assert.match(section, /owner_id uuid not null references auth\.users/);
});

for (const table of ALL_TABLES) {
  test(`${table}: row level security is enabled`, () => {
    const section = extractTableSection(sql, table);
    assert.match(section, new RegExp(`alter table public\\.${table} enable row level security`));
  });

  test(`${table}: no grant to anon, and anon is explicitly revoked`, () => {
    const section = extractTableSection(sql, table);
    assert.match(section, new RegExp(`revoke all on public\\.${table} from anon`));
    assert.doesNotMatch(section, /grant[^;]*to anon/i);
  });

  test(`${table}: has select/insert/update/delete policies binding to auth.uid()`, () => {
    const section = extractTableSection(sql, table);
    const kinds = policyKindsInSection(section);
    for (const kind of REQUIRED_POLICY_KINDS) {
      assert.ok(kinds.has(kind), `missing a "${kind}" policy on ${table}`);
    }
    const authUidReferences = section.match(/auth\.uid\(\)/g) ?? [];
    assert.ok(
      authUidReferences.length >= REQUIRED_POLICY_KINDS.length,
      `expected at least one auth.uid() reference per policy on ${table}, found ${authUidReferences.length}`,
    );
  });

  test(`${table}: insert policy has a WITH CHECK, update policy has both USING and WITH CHECK`, () => {
    const section = extractTableSection(sql, table);
    const insertPolicy = section.match(/create policy "[^"]*insert[^"]*"[\s\S]*?;/);
    assert.ok(insertPolicy, `no insert policy found on ${table}`);
    assert.match(insertPolicy![0], /with check/);

    const updatePolicy = section.match(/create policy "[^"]*update[^"]*"[\s\S]*?;/);
    assert.ok(updatePolicy, `no update policy found on ${table}`);
    assert.match(updatePolicy![0], /using/);
    assert.match(updatePolicy![0], /with check/);
  });
}

for (const table of SCOPED_CHILD_TABLES) {
  test(`${table}: carries both client_id and brand_id`, () => {
    const section = extractTableSection(sql, table);
    assert.match(section, /client_id text not null/);
    assert.match(section, /brand_id text not null/);
  });

  test(`${table}: composite foreign key scopes brand_id within client_id`, () => {
    const section = extractTableSection(sql, table);
    assert.match(section, /foreign key \(client_id, brand_id\) references public\.brands \(client_id, id\)/);
  });
}

test("no grant to anon appears anywhere in the migration", () => {
  assert.doesNotMatch(sql, /grant[^;]*to anon/i);
});
