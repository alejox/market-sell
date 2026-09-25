import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabaseClient } from "./fake-supabase-client";
import { ScopedSupabaseRepository } from "./scoped-supabase-repository";

interface WidgetRow {
  id: string;
  client_id: string;
  brand_id: string;
  label: string;
  ref_id: string;
}

interface Widget {
  id: string;
  clientId: string;
  brandId: string;
  label: string;
  refId: string;
}

function fromRow(row: WidgetRow): Widget {
  return { id: row.id, clientId: row.client_id, brandId: row.brand_id, label: row.label, refId: row.ref_id };
}

function toRow(widget: Widget): WidgetRow {
  return { id: widget.id, client_id: widget.clientId, brand_id: widget.brandId, label: widget.label, ref_id: widget.refId };
}

const SCOPE_A = { clientId: "client-1", brandId: "brand-a" };
const SCOPE_B = { clientId: "client-1", brandId: "brand-b" };

function makeRepo(fake: FakeSupabaseClient) {
  return new ScopedSupabaseRepository<WidgetRow, Widget>(
    async () => fake as unknown as SupabaseClient,
    "widgets",
    fromRow,
    toRow,
  );
}

test("save upserts the mapped row and list reads it back mapped to the domain shape", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  const widget: Widget = { id: "w1", clientId: SCOPE_A.clientId, brandId: SCOPE_A.brandId, label: "First", refId: "ref-1" };

  await repo.save(widget);

  assert.deepEqual(fake.rowsOf("widgets"), [toRow(widget)]);
  assert.deepEqual(await repo.list(SCOPE_A), [widget]);
});

test("save on an existing id updates in place instead of duplicating", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  const widget: Widget = { id: "w1", clientId: SCOPE_A.clientId, brandId: SCOPE_A.brandId, label: "First", refId: "ref-1" };
  await repo.save(widget);

  await repo.save({ ...widget, label: "Updated" });

  const rows = await repo.list(SCOPE_A);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.label, "Updated");
});

test("list, getById, findOneBy, and listBy all filter by client_id and brand_id, not just by id", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  const widgetA: Widget = { id: "same-id", clientId: SCOPE_A.clientId, brandId: SCOPE_A.brandId, label: "A", refId: "shared-ref" };
  const widgetB: Widget = { id: "same-id", clientId: SCOPE_B.clientId, brandId: SCOPE_B.brandId, label: "B", refId: "shared-ref" };
  fake.seed("widgets", [toRow(widgetA), toRow(widgetB)]);

  assert.deepEqual(await repo.list(SCOPE_A), [widgetA]);
  assert.deepEqual(await repo.list(SCOPE_B), [widgetB]);
  assert.deepEqual(await repo.getById(SCOPE_A, "same-id"), widgetA);
  assert.deepEqual(await repo.getById(SCOPE_B, "same-id"), widgetB);
  assert.deepEqual(await repo.findOneBy(SCOPE_A, "ref_id", "shared-ref"), widgetA);
  assert.deepEqual(await repo.listBy(SCOPE_B, "ref_id", "shared-ref"), [widgetB]);
});

test("getById returns null when the row exists but not in this scope, even with the exact id", async () => {
  const fake = new FakeSupabaseClient();
  const repo = makeRepo(fake);
  const widgetA: Widget = { id: "only-in-a", clientId: SCOPE_A.clientId, brandId: SCOPE_A.brandId, label: "A", refId: "r" };
  fake.seed("widgets", [toRow(widgetA)]);

  assert.equal(await repo.getById(SCOPE_B, "only-in-a"), null);
  assert.deepEqual(await repo.findOneBy(SCOPE_B, "ref_id", "r"), null);
  assert.deepEqual(await repo.listBy(SCOPE_B, "ref_id", "r"), []);
});

test("a Postgres error on write is thrown with operation context, not swallowed", async () => {
  const fake = new FakeSupabaseClient();
  fake.failWritesOn("widgets");
  const repo = makeRepo(fake);

  await assert.rejects(
    () => repo.save({ id: "w1", clientId: SCOPE_A.clientId, brandId: SCOPE_A.brandId, label: "x", refId: "r" }),
    /widgets\.save failed/,
  );
});
