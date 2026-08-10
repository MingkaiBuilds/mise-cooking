import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Mise product experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Mise — TikTok recipes, made cookable<\/title>/i);
  assert.match(html, /Your saved recipe/);
  assert.match(html, /What are we cooking/);
  assert.match(html, /Gochujang butter noodles/);
  assert.match(html, /Whole Foods/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships a hard budget ledger, quotas, caching, and optimized indexes", async () => {
  const guardrails = await readFile(new URL("../lib/guardrails.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../drizzle/0000_greedy_cable.sql", import.meta.url), "utf8");

  assert.match(guardrails, /positiveNumber\(process\.env\.PILOT_BUDGET_USD, 200\)/);
  assert.match(guardrails, /founding-pilot-2026/);
  assert.match(guardrails, /WHERE budget_ledger\.spent_micros \+ budget_ledger\.reserved_micros/);
  assert.match(guardrails, /allowUserGeneration/);
  assert.match(migration, /CREATE TABLE `recipe_cache`/);
  assert.match(migration, /CREATE TABLE `quota_counters`/);
  assert.match(migration, /CREATE TABLE `budget_ledger`/);
  assert.match(migration, /PRAGMA optimize;/);
});
