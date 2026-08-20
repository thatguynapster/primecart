import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Raw aggregation pipelines against MongoDB, shared by dashboard reporting
 * (src/lib/dashboard/queries.ts) and any other read that needs to roll up
 * numbers server-side rather than loading whole collections into JavaScript.
 *
 * MongoDB's extended JSON is required here — object ids are `{ $oid }` and
 * dates `{ $date }` — Prisma passes the command through untouched rather than
 * serialising native values.
 */

export const oid = (id: string) => ({ $oid: id });
export const isoDate = (date: Date) => ({ $date: date.toISOString() });

type AggregateResult<T> = {
	cursor?: { firstBatch?: T[] };
};

/**
 * A pooled MongoDB connection that has sat idle can be reset by the network
 * path (a NAT/router timeout, or Atlas's own idle-connection handling on
 * shared tiers) between one request and the next. The driver only discovers
 * this when it tries to use the connection, so the request that draws the
 * dead connection fails outright — the *next* request gets a fresh one and
 * succeeds, which is why reloading a page "fixes" it.
 *
 * $runCommandRaw sits outside Prisma's typed-query retry path, so this one
 * chokepoint gets its own: one retry, only for this specific transient
 * pattern, never for a real query error (bad pipeline, auth, etc.) — those
 * fail the same way twice, so retrying them would just double the latency
 * before an inevitable failure.
 */
function isResetConnectionError(error: unknown): boolean {
	if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
	return /forcibly closed|ECONNRESET|connection reset|os error 10054/i.test(
		error.message
	);
}

export async function aggregate<T>(
	collection: string,
	pipeline: Prisma.InputJsonValue[]
): Promise<T[]> {
	const command: Prisma.InputJsonObject = {
		aggregate: collection,
		pipeline,
		cursor: {}
	};

	let result: AggregateResult<T>;
	try {
		result = (await prisma.$runCommandRaw(command)) as AggregateResult<T>;
	} catch (error) {
		if (!isResetConnectionError(error)) throw error;
		result = (await prisma.$runCommandRaw(command)) as AggregateResult<T>;
	}

	return result.cursor?.firstBatch ?? [];
}
