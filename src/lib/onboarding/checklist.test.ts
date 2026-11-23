import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checklistSteps, nextStep, showChecklist } from "./checklist.ts";

const fresh = {
  products: 0,
  hasPhoto: false,
  whatsappNumber: null,
  deliveryOptions: 0,
  shopSharedAt: null,
};
const done = {
  products: 1,
  hasPhoto: true,
  whatsappNumber: "+233244000000",
  deliveryOptions: 1,
  shopSharedAt: new Date(),
};
const visible = { setupHiddenAt: null };

describe("first-day checklist", () => {
  it("a new shop starts at its first product", () => {
    const steps = checklistSteps(fresh);
    assert.equal(steps.filter((s) => s.done).length, 0);
    assert.equal(nextStep(steps), "product");
    assert.equal(showChecklist(steps, visible, false), true);
  });
  it("points at the first unfinished step, in order", () => {
    assert.equal(nextStep(checklistSteps({ ...fresh, products: 2, hasPhoto: true })), "whatsapp");
    assert.equal(nextStep(checklistSteps({ ...done, deliveryOptions: 0 })), "delivery");
  });
  it("a blank WhatsApp number doesn't count", () => {
    assert.equal(nextStep(checklistSteps({ ...done, whatsappNumber: "  " })), "whatsapp");
  });
  it("disappears when finished, hidden or lapsed", () => {
    assert.equal(nextStep(checklistSteps(done)), null);
    assert.equal(showChecklist(checklistSteps(done), visible, false), false);
    assert.equal(showChecklist(checklistSteps(fresh), { setupHiddenAt: new Date() }, false), false);
    assert.equal(showChecklist(checklistSteps(fresh), visible, true), false);
  });
});
