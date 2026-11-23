import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addGhs,
  chooseDelivery,
  deliveryFeeUnagreed,
  deliveryLine,
  parseDeliveryForm,
  parseFee,
  type DeliveryOption,
} from "./delivery.ts";

const form = (areas: { id?: string; name: string; fee: string }[], extra = {}) => ({
  areas: areas.map((a) => ({ id: "", ...a })),
  pickup: false,
  pickupNote: "",
  quote: false,
  ...extra,
});
let n = 0;
const newId = () => `new-${++n}`;

describe("parseFee", () => {
  it("accepts whole and 2-decimal amounts, including 0", () => {
    assert.equal(parseFee("25"), 25);
    assert.equal(parseFee(" 25.50 "), 25.5);
    assert.equal(parseFee("0"), 0);
  });
  it("rejects everything else", () => {
    for (const bad of ["", "-1", "1e3", "abc", "1.234", "10001", "Infinity", null, undefined]) {
      assert.equal(parseFee(bad), null, String(bad));
    }
  });
});

describe("parseDeliveryForm", () => {
  it("drops blank rows and adds the extras", () => {
    const r = parseDeliveryForm(
      form([{ name: "Accra", fee: "25" }, { name: " ", fee: "" }], {
        pickup: true,
        pickupNote: " Osu, 9-5 ",
        quote: true,
      }),
      new Set(),
      newId
    );
    assert.ok(r.ok);
    assert.deepEqual(r.options.map((o) => [o.kind, o.fee]), [["AREA", 25], ["PICKUP", 0], ["QUOTE", 0]]);
    assert.equal(r.options[1].note, "Osu, 9-5");
  });
  it("keeps known ids, replaces unknown and repeated ones", () => {
    const r = parseDeliveryForm(
      form([
        { id: "a", name: "Accra", fee: "25" },
        { id: "a", name: "Tema", fee: "40" },
        { id: "pickup", name: "Kumasi", fee: "50" },
      ]),
      new Set(["a"]),
      newId
    );
    assert.ok(r.ok);
    assert.equal(r.options[0].id, "a");
    assert.equal(new Set(r.options.map((o) => o.id)).size, 3);
    assert.notEqual(r.options[2].id, "pickup");
  });
  it("rejects missing names, missing fees and duplicates", () => {
    assert.equal(parseDeliveryForm(form([{ name: "", fee: "5" }]), new Set(), newId).ok, false);
    assert.equal(parseDeliveryForm(form([{ name: "Accra", fee: "" }]), new Set(), newId).ok, false);
    assert.equal(
      parseDeliveryForm(form([{ name: "Accra", fee: "1" }, { name: "accra", fee: "2" }]), new Set(), newId).ok,
      false
    );
  });
});

describe("chooseDelivery", () => {
  const options: DeliveryOption[] = [
    { id: "a", kind: "AREA", name: "Accra", fee: 25, note: null },
    { id: "pickup", kind: "PICKUP", name: "Pickup", fee: 0, note: null },
  ];
  it("no options: no choice needed, no fee", () => {
    assert.deepEqual(chooseDelivery([], undefined, undefined), { ok: true, option: null, fee: 0 });
  });
  it("prices from the shop's list", () => {
    const r = chooseDelivery(options, "a", 25);
    assert.ok(r.ok && r.fee === 25);
  });
  it("refuses no choice, an unknown id, a tampered or stale fee, and removed options", () => {
    assert.equal(chooseDelivery(options, undefined, 0).ok, false);
    assert.equal(chooseDelivery(options, "zzz", 0).ok, false);
    assert.equal(chooseDelivery(options, "a", 0).ok, false);
    assert.equal(chooseDelivery(options, "a", 20).ok, false);
    assert.equal(chooseDelivery([], "a", 25).ok, false);
  });
});

describe("order display", () => {
  const order = (deliveryKind: string | null, deliveryFee: number | null, deliveryName: string | null = null) => ({
    deliveryKind,
    deliveryFee,
    deliveryName,
  });
  it("shows nothing for orders without delivery", () => {
    assert.equal(deliveryLine(order(null, null)), null);
  });
  it("area, pickup, manual fee", () => {
    assert.deepEqual(deliveryLine(order("AREA", 25, "Accra")), { label: "Delivery: Accra", amount: 25 });
    assert.deepEqual(deliveryLine(order("PICKUP", 0, "Pickup")), { label: "Pickup", amount: 0 });
    assert.deepEqual(deliveryLine(order(null, 15)), { label: "Delivery", amount: 15 });
  });
  it("an agreed fee is unagreed until the merchant sets it", () => {
    assert.equal(deliveryFeeUnagreed(order("QUOTE", null)), true);
    assert.equal(deliveryFeeUnagreed(order("QUOTE", 0)), false);
  });
  it("adds without floating point tails", () => {
    assert.equal(addGhs(0.1, 0.2), 0.3);
    assert.equal(addGhs(50, 30), 80);
  });
});
