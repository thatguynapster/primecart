/**
 * The first-day checklist on the dashboard overview. Pure: unit-tested with
 * `node --test`. Every step is derived from real data except sharing, which
 * can only be recorded when the merchant uses a share or copy button.
 */

export type ChecklistStepId = "product" | "photo" | "whatsapp" | "delivery" | "share";

export type ChecklistInput = {
  products: number;
  /** Any active product with at least one photo. */
  hasPhoto: boolean;
  whatsappNumber: string | null;
  deliveryOptions: number;
  shopSharedAt: Date | null;
};

export type ChecklistStep = { id: ChecklistStepId; done: boolean };

export function checklistSteps(input: ChecklistInput): ChecklistStep[] {
  return [
    { id: "product", done: input.products > 0 },
    { id: "photo", done: input.hasPhoto },
    { id: "whatsapp", done: Boolean(input.whatsappNumber?.trim()) },
    { id: "delivery", done: input.deliveryOptions > 0 },
    { id: "share", done: input.shopSharedAt != null },
  ];
}

/** Gone once everything is done, or the merchant hides it. */
export function showChecklist(
  steps: ChecklistStep[],
  merchant: { setupHiddenAt: Date | null },
  lapsed: boolean
): boolean {
  return !lapsed && merchant.setupHiddenAt == null && steps.some((step) => !step.done);
}

/** The first unfinished step: the one to point the merchant at. */
export function nextStep(steps: ChecklistStep[]): ChecklistStepId | null {
  return steps.find((step) => !step.done)?.id ?? null;
}
