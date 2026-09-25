import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { JsonFileStore } from "./json-file-store";

interface Widget {
  id: string;
  label: string;
}

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ventex-json-store-"));
}

const cleanupDirs: string[] = [];
after(async () => {
  await Promise.all(cleanupDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

test("readAll returns an empty array when the file does not exist yet", async () => {
  const dir = await makeTempDir();
  cleanupDirs.push(dir);
  const store = new JsonFileStore<Widget>(join(dir, "widgets.json"));
  assert.deepEqual(await store.readAll(), []);
});

test("mutate creates the file (and parent dir) and round-trips data", async () => {
  const dir = await makeTempDir();
  cleanupDirs.push(dir);
  const filePath = join(dir, "nested", "widgets.json");
  const store = new JsonFileStore<Widget>(filePath);

  await store.mutate((items) => [...items, { id: "w1", label: "First" }]);
  const reloaded = new JsonFileStore<Widget>(filePath);
  assert.deepEqual(await reloaded.readAll(), [{ id: "w1", label: "First" }]);
});

test("concurrent mutations are serialized and none are lost", async () => {
  const dir = await makeTempDir();
  cleanupDirs.push(dir);
  const store = new JsonFileStore<Widget>(join(dir, "widgets.json"));

  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      store.mutate((items) => [...items, { id: `w${i}`, label: `Widget ${i}` }]),
    ),
  );

  const final = await store.readAll();
  assert.equal(final.length, 20);
  const ids = new Set(final.map((item) => item.id));
  assert.equal(ids.size, 20);
});
