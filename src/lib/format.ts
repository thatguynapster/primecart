/** Ghana cedi, as a merchant would read it on a receipt. */
export function formatGhs(amount: number): string {
	return new Intl.NumberFormat("en-GH", {
		style: "currency",
		currency: "GHS",
		minimumFractionDigits: 2
	}).format(amount);
}

/**
 * Whole days from now until `date`, floored at zero.
 *
 * Reading the clock lives here rather than in a component body: React's purity
 * rule rejects `Date.now()` during render, and a per-request value belongs in a
 * helper rather than inline in JSX regardless.
 */
export function daysUntil(date: Date): number {
	const msPerDay = 86_400_000;
	return Math.max(0, Math.ceil((date.getTime() - Date.now()) / msPerDay));
}

/** Whether `date` has already passed. Same purity reasoning as `daysUntil`. */
export function isPast(date: Date): boolean {
	return date.getTime() < Date.now();
}

/**
 * "5 minutes ago", "Yesterday", "Last week" — how a merchant actually reads
 * a timestamp at a glance, rather than parsing "16 Aug". Falls back to a
 * plain date past a year, where "14 months ago" stops being more readable
 * than the date itself.
 *
 * Reads the clock at call time — same reasoning as `daysUntil` above, so this
 * is called from a Server Component's render, not `new Date()` inline in JSX.
 */
export function formatRelativeDate(date: Date | string): string {
	const target = typeof date === "string" ? new Date(date) : date;
	const seconds = Math.max(
		0,
		Math.floor((Date.now() - target.getTime()) / 1000)
	);

	if (seconds < 45) return "Just now";

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

	const days = Math.floor(hours / 24);
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 14) return "Last week";
	if (days < 30) return `${Math.floor(days / 7)} weeks ago`;

	const months = Math.floor(days / 30);
	if (months < 12)
		return months === 1 ? "Last month" : `${months} months ago`;

	// const years = Math.floor(days / 365);
	// if (years === 1) return "Last year";
	// if (years < 5) return `${years} years ago`;

	return target.toLocaleDateString("en-GH", {
		day: "numeric",
		month: "short",
		year: "numeric"
	});
}
