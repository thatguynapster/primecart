import type { Merchant } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

/**
 * Resolving the signed-in Clerk user to a Merchant.
 *
 * This is the only supported way to obtain a merchantId. It is derived from the
 * session server-side and never accepted from the client — the proxy's checks
 * are a first line of defense, not the authorization boundary, so every page,
 * route handler and Server Action calls through here (task 3.12).
 */

/**
 * The current merchant, creating the record on first sign-in.
 *
 * Clerk owns the account; the Merchant row is created lazily the first time a
 * signed-in user reaches the app. That avoids depending on a webhook being
 * configured and delivered before the user's first request.
 *
 * Returns null when nobody is signed in.
 */
export async function getCurrentMerchant(): Promise<Merchant | null> {
	const { userId } = await auth();
	if (!userId) return null;

	const existing = await prisma.merchant.findUnique({
		where: { clerkUserId: userId }
	});
	if (existing) return existing;

	const user = await currentUser();
	if (!user) return null;

	const email =
		user.primaryEmailAddress?.emailAddress ??
		user.emailAddresses[0]?.emailAddress;

	if (!email) {
		throw new Error(
			`Clerk user ${userId} has no email address; cannot create a merchant.`
		);
	}

	const name =
		[user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
		email.split("@")[0];

	try {
		return await prisma.merchant.create({
			data: {
				clerkUserId: userId,
				email,
				name
				// storefront is set during onboarding, not here — its absence is what
				// marks onboarding as incomplete.
			}
		});
	} catch {
		// Two parallel requests can both miss the lookup and race to create. The
		// unique index on clerkUserId means one loses; re-read rather than fail.
		const raced = await prisma.merchant.findUnique({
			where: { clerkUserId: userId }
		});
		if (raced) return raced;

		// Not a race. The other unique field is email, so the likeliest cause is a
		// second Clerk account reusing an email that already belongs to a merchant.
		throw new Error(
			`Could not create a merchant for Clerk user ${userId}. The email ${email} may already belong to another account.`
		);
	}
}

/** As above, but throws when signed out. For routes the proxy already guards. */
export async function requireMerchant(): Promise<Merchant> {
	const merchant = await getCurrentMerchant();
	if (!merchant) {
		throw new Error("Not signed in.");
	}
	return merchant;
}

/** True once the merchant has completed onboarding and has a storefront. */
export function hasCompletedOnboarding(merchant: Merchant): boolean {
	return Boolean(merchant.storefront?.subdomain);
}
