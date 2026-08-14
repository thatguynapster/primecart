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
