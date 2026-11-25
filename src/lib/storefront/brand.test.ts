import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { onBrandColor } from "./brand.ts";

describe("onBrandColor", () => {
  it("uses dark text where white would be hard to read", () => {
    for (const color of ["#14dc82", "#13dc81", "#ffff99", "#ffffff", "#f59e0b", "#22c55e"]) {
      assert.equal(onBrandColor(color), "#111111", color);
    }
  });

  it("keeps white text on darker colours", () => {
    for (const color of ["#000000", "#2563eb", "#dc2626", "#7c3aed", "#15803d"]) {
      assert.equal(onBrandColor(color), "#ffffff", color);
    }
  });

  it("falls back to white on near-black for an unusable colour", () => {
    for (const color of ["", "red", "#12"]) assert.equal(onBrandColor(color), "#ffffff");
  });
});
