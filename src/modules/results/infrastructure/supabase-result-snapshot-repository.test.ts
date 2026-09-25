import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "@/shared/infrastructure/supabase/fake-supabase-client";
import type { ResultSnapshot } from "@/modules/results/domain/result-snapshot";
import { SupabaseResultSnapshotRepository } from "./supabase-result-snapshot-repository";

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeSnapshot(overrides: Partial<ResultSnapshot> = {}): ResultSnapshot {
  return {
    id: "snapshot-1",
    clientId: SCOPE_A.clientId,
    brandId: SCOPE_A.brandId,
    proposalId: "proposal-1",
    proposalThreadId: "thread-1",
    period: { from: "2026-01-01", to: "2026-01-31" },
    metrics: [{ name: "reach", value: 1000, unit: "personas" }],
    notes: "notas",
    source: "manual_owner_entry",
    recordedBy: "Owner",
    recordedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

test("save round-trips nested period and metrics jsonb exactly", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseResultSnapshotRepository(async () => fake as unknown as SupabaseClient);
  const snapshot = makeSnapshot();

  await repo.save(snapshot);

  const row = fake.rowsOf("result_snapshots")[0] as Record<string, unknown>;
  assert.deepEqual(row.period, snapshot.period);
  assert.deepEqual(row.metrics, snapshot.metrics);
  assert.deepEqual((await repo.listByProposal(SCOPE_A, "proposal-1"))[0], snapshot);
});

test("listByProposal and listByThread filter within scope", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseResultSnapshotRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeSnapshot({ id: "s1", proposalId: "proposal-1", proposalThreadId: "thread-1" }));
  await repo.save(makeSnapshot({ id: "s2", proposalId: "proposal-2", proposalThreadId: "thread-1" }));

  assert.deepEqual(
    (await repo.listByProposal(SCOPE_A, "proposal-2")).map((s) => s.id),
    ["s2"],
  );
  assert.deepEqual(
    (await repo.listByThread(SCOPE_A, "thread-1")).map((s) => s.id).sort(),
    ["s1", "s2"],
  );
});

test("brand B cannot read brand A's result snapshots", async () => {
  const fake = new FakeSupabaseClient();
  const repo = new SupabaseResultSnapshotRepository(async () => fake as unknown as SupabaseClient);
  await repo.save(makeSnapshot({}));

  assert.deepEqual(await repo.list(SCOPE_B), []);
  assert.deepEqual(await repo.listByProposal(SCOPE_B, "proposal-1"), []);
  assert.deepEqual(await repo.listByThread(SCOPE_B, "thread-1"), []);
});
