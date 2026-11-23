import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_IMAGES_PER_PRODUCT } from "../products/limits.ts";
import { BRANDING_IMAGE, PRODUCT_PHOTO, fitWithin } from "./fit.ts";
import { sniffImageType } from "./sniff.ts";

const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024;

test("a full set of product photos fits in one Vercel request", () => {
  assert.ok(
    PRODUCT_PHOTO.maxBytes * MAX_IMAGES_PER_PRODUCT < VERCEL_BODY_LIMIT - 512 * 1024
  );
  assert.ok(BRANDING_IMAGE.maxBytes < VERCEL_BODY_LIMIT);
});

test("fitWithin keeps proportions and never scales up", () => {
  assert.deepEqual(fitWithin(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(fitWithin(3000, 4000, 1600), { width: 1200, height: 1600 });
  assert.deepEqual(fitWithin(300, 200, 1600), { width: 300, height: 200 });
  assert.deepEqual(fitWithin(10000, 1, 1600), { width: 1600, height: 1 });
});

test("image types come from the bytes, not the name", () => {
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(
    sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png"
  );
  assert.equal(sniffImageType(new TextEncoder().encode("RIFF1234WEBP")), "image/webp");
  assert.equal(sniffImageType(new TextEncoder().encode("<svg xmlns=")), null);
  assert.equal(sniffImageType(new TextEncoder().encode("xxxxftypavif")), null);
  assert.equal(sniffImageType(new Uint8Array()), null);
});
