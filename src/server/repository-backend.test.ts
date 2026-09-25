import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveRepositoryBackend } from "./repository-backend";

test("uses Supabase whenever both env vars are set, regardless of environment", () => {
  assert.equal(resolveRepositoryBackend({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "key" }), "supabase");
  assert.equal(
    resolveRepositoryBackend({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "key", VERCEL: "1" }),
    "supabase",
  );
});

test("falls back to the local JSON store only outside a production runtime", () => {
  assert.equal(resolveRepositoryBackend({}), "json");
  assert.equal(resolveRepositoryBackend({ NODE_ENV: "development" }), "json");
  assert.equal(resolveRepositoryBackend({ NODE_ENV: "test" }), "json");
});

test("fails closed instead of falling back when Supabase is unconfigured on Vercel", () => {
  assert.equal(resolveRepositoryBackend({ VERCEL: "1" }), "unconfigured-production");
});

test("fails closed instead of falling back when Supabase is unconfigured with NODE_ENV=production", () => {
  assert.equal(resolveRepositoryBackend({ NODE_ENV: "production" }), "unconfigured-production");
});

test("a partially configured Supabase (only one of the two env vars) is treated as unconfigured", () => {
  assert.equal(resolveRepositoryBackend({ SUPABASE_URL: "https://x.supabase.co", VERCEL: "1" }), "unconfigured-production");
  assert.equal(resolveRepositoryBackend({ SUPABASE_PUBLISHABLE_KEY: "key" }), "json");
});

test("falls back to json (not unconfigured-production) during next build's page-data-collection phase", () => {
  // `next build` sets NODE_ENV=production and, on Vercel, VERCEL=1 — but
  // also NEXT_PHASE=phase-production-build, which is never set at request
  // time on the deployed runtime.
  assert.equal(resolveRepositoryBackend({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }), "json");
  assert.equal(resolveRepositoryBackend({ VERCEL: "1", NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }), "json");
});

test("still fails closed at the deployed runtime, where NEXT_PHASE is not the build phase", () => {
  assert.equal(resolveRepositoryBackend({ VERCEL: "1", NODE_ENV: "production", NEXT_PHASE: "phase-production-server" }), "unconfigured-production");
  assert.equal(resolveRepositoryBackend({ NODE_ENV: "production" }), "unconfigured-production");
});
