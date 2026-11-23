import assert from "node:assert/strict";
import { test } from "node:test";

import { windowFor } from "./rate-window.ts";

test("moments in the same window share a bucket, the next window gets a new one", () => {
  const a = windowFor(new Date("2026-11-23T10:00:00Z"), 10);
  const b = windowFor(new Date("2026-11-23T10:09:59Z"), 10);
  const c = windowFor(new Date("2026-11-23T10:10:00Z"), 10);
  assert.equal(a.bucket, b.bucket);
  assert.equal(c.bucket, a.bucket + 1);
  assert.equal(a.expiresAt.toISOString(), "2026-11-23T10:10:00.000Z");
});
