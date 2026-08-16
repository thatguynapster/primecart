/**
 * Paystack API client.
 *
 * PrimeCart operates one master Paystack account and each merchant is a
 * subaccount. No merchant secret keys are ever stored.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not set.");
  }
  return key;
}

async function paystackFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number } }
): Promise<PaystackResponse<T>> {
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !body.status) {
    // Paystack puts the useful detail in `message` — surface it rather than a
    // bare status code, because it names the actual problem ("Account number
    // is invalid", "Bank not supported").
    throw new PaystackError(body?.message || `Paystack returned ${response.status}`);
  }

  return body;
}

export class PaystackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackError";
  }
}

// ---------------------------------------------------------------------------
// Banks
// ---------------------------------------------------------------------------

export type PaystackBank = {
  name: string;
  code: string;
  type: string;
  currency: string;
};

/**
 * Ghanaian banks and mobile-money providers, with their Paystack codes.
 *
 * Fetched rather than hardcoded so the list stays correct as Paystack adds
 * institutions. Cached for a day — it changes rarely, and this sits in the
 * onboarding page's render path.
 *
 * Mobile money is included deliberately: for this merchant profile it is often
 * the only settlement account they have. Paystack's `type` distinguishes
 * `mobile_money` from `ghipss` (a bank), which the form uses to relabel the
 * account-number field.
 */
export async function listGhanaianBanks(): Promise<PaystackBank[]> {
  const body = await paystackFetch<PaystackBank[]>(
    "/bank?country=ghana&currency=GHS",
    { next: { revalidate: 60 * 60 * 24 } }
  );

  return body.data
    .map((bank) => ({
      name: bank.name,
      code: bank.code,
      type: bank.type,
      currency: bank.currency,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Subaccounts
// ---------------------------------------------------------------------------

type CreateSubaccountResult = {
  subaccount_code: string;
  account_number: string;
  settlement_bank: string;
};

/**
 * Creates the merchant's Paystack subaccount.
 *
 * `percentage_charge` MUST be 0. PrimeCart's 3% is applied per transaction via
 * `transaction_charge` at initialization; setting a percentage here as well
 * stacks the two and takes roughly 6% from the merchant instead of 3%.
 */
export async function createSubaccount(params: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
}): Promise<CreateSubaccountResult> {
  const body = await paystackFetch<CreateSubaccountResult>("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name: params.businessName,
      settlement_bank: params.bankCode,
      account_number: params.accountNumber,
      percentage_charge: 0,
    }),
  });

  return body.data;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/** PrimeCart's cut of a storefront sale. Manual orders never call this module. */
export const STOREFRONT_FEE_RATE = 0.03;

type InitializeTransactionParams = {
  /** Where the receipt/Paystack notifications go — the guest's own email. */
  email: string;
  amountInPesewas: number;
  subaccount: string;
  /** Must contain only `-`, `.`, `=` and alphanumerics — Paystack's own rule. */
  reference: string;
  /** Where Paystack sends the customer's browser back to after paying. */
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

type InitializeTransactionResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

/**
 * Starts a storefront checkout payment.
 *
 * The 3% is computed here, once — `transaction_charge` — and only here.
 * `createSubaccount` above sets `percentage_charge: 0` for exactly this
 * reason: applying a cut in both places stacks them, taking ~6% from the
 * merchant instead of 3% (D-6 in the project's decision log).
 */
export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<InitializeTransactionResult> {
  const body = await paystackFetch<InitializeTransactionResult>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amountInPesewas,
        subaccount: params.subaccount,
        transaction_charge: Math.round(
          params.amountInPesewas * STOREFRONT_FEE_RATE
        ),
        bearer: "account",
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    }
  );

  return body.data;
}

// ---------------------------------------------------------------------------
// Subscriptions (Phase 13) — PrimeCart's own revenue, not a merchant sale
// ---------------------------------------------------------------------------

type PaystackPlan = {
  plan_code: string;
  amount: number;
  interval: string;
  currency: string;
};

/**
 * Fetches a plan's own details from Paystack — its authoritative amount, in
 * particular. `/transaction/initialize` rejects a `plan`-linked charge that
 * has no `amount`, contrary to the docs' implication that it derives one —
 * verified live against the real test plan. Fetching it here means the
 * amount charged always matches the plan currently configured, without
 * hardcoding a price that could drift from what Paystack actually charges.
 */
export async function getPlan(planCode: string): Promise<PaystackPlan> {
  const body = await paystackFetch<PaystackPlan>(`/plan/${planCode}`);
  return body.data;
}

type InitializePlanTransactionParams = {
  /** The merchant's own account email — this charges PrimeCart's subscription fee, not a merchant sale. */
  email: string;
  /** Paystack plan code. */
  planCode: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

/**
 * Starts a PrimeCart subscription payment against the configured plan.
 *
 * Deliberately separate from `initializeTransaction`: this has no
 * `subaccount`/`transaction_charge` — the money is PrimeCart's own revenue,
 * not a merchant's storefront sale routed through their subaccount. Passing
 * `plan` here is what makes Paystack fire `subscription.create` on the first
 * successful charge; the webhook (task 13.8) reacts to that event, never to
 * this call's return value.
 */
export async function initializePlanTransaction(
  params: InitializePlanTransactionParams
): Promise<InitializeTransactionResult> {
  const plan = await getPlan(params.planCode);

  const body = await paystackFetch<InitializeTransactionResult>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: plan.amount,
        plan: params.planCode,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    }
  );

  return body.data;
}
