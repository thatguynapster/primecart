"use server";

import { revalidatePath } from "next/cache";

import { requireMerchant } from "@/lib/merchant/current";
import { prisma } from "@/lib/prisma";

/** Called by every share and copy button. Only the first one is recorded. */
export async function markShopShared(): Promise<void> {
  const merchant = await requireMerchant();
  if (merchant.shopSharedAt) return;

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { shopSharedAt: new Date() },
  });
  revalidatePath("/dashboard");
}

export async function hideSetupChecklist(): Promise<void> {
  const merchant = await requireMerchant();

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { setupHiddenAt: new Date() },
  });
  revalidatePath("/dashboard");
}
