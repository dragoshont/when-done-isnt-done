import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluate } from "./verify.mjs";

const file = path => fileURLToPath(new URL(path, import.meta.url));
const source = path => readFile(file(path));

test("M1: replacing the route retires the old endpoint and monitors both requests", async () => {
  const baseline = evaluate("M1", await source("./inputs/M1/routes.json"));
  assert.equal(baseline.verdict, "HOLD");
  assert.equal(baseline.smoke, false);
  assert.equal(baseline.retired, false);
  const fixed = evaluate("M1", Buffer.from('{"/v2/orders":"monitored"}'));
  assert.equal(fixed.verdict, "READY");
  assert.equal(fixed.retired, true);
  assert.equal(new Set(fixed.requests.map(request => request.id)).size, 2);
  for (const request of fixed.requests) {
    assert.equal(request.status, 200);
    assert.deepEqual(request.observedRequestIds, [request.id]);
  }
});

test("M2: green smoke with two missing monitor events", async () => {
  const observed = evaluate("M2", await source("./inputs/M2/routes.json"));
  assert.equal(observed.smoke, true);
  assert.equal(observed.verdict, "HOLD");
  assert.deepEqual(observed.requests.map(request => request.observedRequestIds), [[], []]);
  assert.deepEqual(observed.requests.map(request => request.matchingEvent), [false, false]);
});

test("M2: route substitution does not score the fixed review case", () => {
  const altered = evaluate("M2", Buffer.from('{"/v2/orders":"monitored"}'));
  assert.equal(altered.verdict, "INVALID_INPUT");
});

test("CLI separates a failed file read from a scored HOLD", () => {
  const actual = spawnSync(process.execPath, [file("./verify.mjs"), "M2", file("./inputs/M2/routes.json")],
    { encoding: "utf8" });
  assert.equal(actual.status, 1, actual.stderr);
  assert.equal(JSON.parse(actual.stdout).verdict, "HOLD");
  const missing = spawnSync(process.execPath, [file("./verify.mjs"), "M2", file("./missing.json")],
    { encoding: "utf8" });
  assert.equal(missing.status, 3, missing.stderr);
  assert.equal(missing.stdout, "");
  assert.match(missing.stderr, /ENOENT/);
});
