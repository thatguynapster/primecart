import { prisma } from "@/lib/prisma";

/**
 * D-17 — dormant-shop detection for the weekly owner digest.
 *
 * Deliberately not scoped by merchantId — a system job over every tenant, the
 * same documented exception `expireLapsedTrials`/`expireAbandonedOrders` make
 * to "every query filters on merchantId first".
 *
 * This flags, it never acts: PrimeCart is still in the relationship-driven,
 * hand-pitched onboarding phase, and a shop silently going offline would be a
 * real trust risk. The list below is meant to prompt a conversation with the
 * merchant about their bottleneck, not to trigger anything automatic.
 */

const DORMANCY_WINDOW_DAYS = 30;

export type DormantMerchant = {
	id: string;
	businessName: string;
	email: string;
	subdomain: string;
	storefrontCreatedAt: Date;
	/** null = this shop has never had a paid order. */
	lastPaidOrderAt: Date | null;
};

/**
 * Merchants whose storefront has been live for at least
 * `DORMANCY_WINDOW_DAYS` (the grace period — a shop that hasn't had time to
 * sell anything yet is not dormant) and whose most recent paid order, if any,
 * is at least that old too.
 *
 * `storefront.createdAt` (not `Merchant.createdAt`) is the "went live"
 * timestamp — a merchant can sign up and finish onboarding days apart, and
 * the grace period should count from when the shop actually opened.
 */
export async function listDormantMerchants(): Promise<DormantMerchant[]> {
	const cutoff = new Date(Date.now() - DORMANCY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

	const merchants = await prisma.merchant.findMany({
		where: { storefront: { is: { createdAt: { lte: cutoff } } } },
		select: {
			id: true,
			email: true,
			storefront: { select: { subdomain: true, businessName: true, createdAt: true } }
		}
	});

	const dormant: DormantMerchant[] = [];
	for (const merchant of merchants) {
		if (!merchant.storefront) continue; // the where clause already guarantees this; narrows for TS

		const lastPaidOrder = await prisma.order.findFirst({
			where: { merchantId: merchant.id, paymentStatus: "PAID" },
			orderBy: { updatedAt: "desc" },
			select: { updatedAt: true }
		});

		const lastPaidOrderAt = lastPaidOrder?.updatedAt ?? null;
		if (lastPaidOrderAt && lastPaidOrderAt > cutoff) continue; // sold recently — not dormant

		dormant.push({
			id: merchant.id,
			businessName: merchant.storefront.businessName,
			email: merchant.email,
			subdomain: merchant.storefront.subdomain,
			storefrontCreatedAt: merchant.storefront.createdAt,
			lastPaidOrderAt
		});
	}

	return dormant;
}
