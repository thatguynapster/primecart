import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_RETURNS_POLICY, cleanReturnsPolicy } from "./returns-policy.ts";

describe("cleanReturnsPolicy", () => {
  it("treats empty, blank and non-text input as no policy", () => {
    for (const input of ["", "  \r\n ", null, undefined, 5]) {
      assert.deepEqual(cleanReturnsPolicy(input), { ok: true, policy: null });
    }
  });

  it("keeps paragraphs and tidies line breaks", () => {
    assert.deepEqual(cleanReturnsPolicy(" One.\r\nTwo.\r\n\r\n\r\n\r\nThree. "), {
      ok: true,
      policy: "One.\nTwo.\n\nThree.",
    });
  });

  it("counts a line break as one character, as the browser does", () => {
    const text = "a\r\n".repeat(MAX_RETURNS_POLICY / 2 - 1) + "aa";
    assert.equal(cleanReturnsPolicy(text).ok, true);
  });

  it("rejects text over the limit", () => {
    assert.equal(cleanReturnsPolicy("a".repeat(MAX_RETURNS_POLICY)).ok, true);
    assert.equal(cleanReturnsPolicy("a".repeat(MAX_RETURNS_POLICY + 1)).ok, false);
  });
});
