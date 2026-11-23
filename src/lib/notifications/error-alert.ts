import { sendEmailOnce } from "@/lib/notifications/resend";
import { withinLimit } from "@/lib/rate-limit";

/**
 * Emails the owner about an unhandled server error, at most once an hour per
 * route and 20 an hour in all, so an outage isn't an inbox flood (or the end
 * of the day's email allowance, which order emails share).
 *
 * Sends the route pattern and the error's type and digest only. The message
 * and the real URL can hold customer details; those stay in Vercel's logs,
 * which the digest finds.
 */
export async function reportServerError(
  error: unknown,
  method: string,
  routePath: string,
  routeType: string
): Promise<void> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development" || !to) return;

  const name = error instanceof Error ? error.name : "Unknown error";
  const code = detail(error, "code");
  const digest = detail(error, "digest");

  try {
    const first = await withinLimit({
      name: "error-route",
      identifier: `${routeType}:${routePath}`,
      limit: 1,
      windowMinutes: 60,
    });
    if (!first) return;
    const room = await withinLimit({
      name: "error-all",
      identifier: "all",
      limit: 20,
      windowMinutes: 60,
    });
    if (!room) return;

    const lines = [
      `Environment: ${process.env.VERCEL_ENV}`,
      `Where: ${method} ${routePath} (${routeType})`,
      `Error: ${name}${code ? ` ${code}` : ""}`,
      digest ? `Digest: ${digest}` : null,
      "Search Vercel's logs for the digest or route. Further errors on this route are not emailed this hour.",
    ].filter((line): line is string => line !== null);

    await sendEmailOnce({
      to,
      subject: `PrimeCart error (${process.env.VERCEL_ENV}): ${routePath}`,
      html: lines.map((line) => `<p>${escape(line)}</p>`).join(""),
    });
  } catch (alertError) {
    console.error("Error alert could not be sent:", alertError);
  }
}

function detail(error: unknown, key: "code" | "digest"): string | null {
  if (typeof error !== "object" || error === null || !(key in error)) return null;
  return String((error as Record<string, unknown>)[key]).slice(0, 60);
}

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
