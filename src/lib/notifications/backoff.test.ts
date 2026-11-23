import assert from "node:assert/strict";
import { test } from "node:test";

import { nextAttemptAt } from "./backoff.ts";

test("email retries back off, then stop within 24 hours", () => {
  let now = new Date("2026-11-23T08:00:00Z");
  const start = now.getTime();
  let failures = 1;
  for (;;) {
    const next = nextAttemptAt(failures, now);
    if (!next) break;
    assert.ok(next > now);
    now = next;
    failures += 1;
  }
  assert.equal(failures, 6);
  assert.ok(now.getTime() - start < 24 * 60 * 60 * 1000);
});
