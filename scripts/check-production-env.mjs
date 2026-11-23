/**
 * Fails a production deploy when email can't reach merchants. New orders are
 * announced by email only, and without a verified sender Resend delivers to
 * nobody but the account owner, silently.
 *
 * Prints variable names only, never values (the repository is public).
 */
if (process.env.VERCEL_ENV === "production") {
  const missing = ["RESEND_API_KEY", "NOTIFICATIONS_FROM_EMAIL", "ADMIN_NOTIFICATION_EMAIL"].filter(
    (name) => !process.env[name]
  );
  if (missing.length > 0) {
    console.error(`Production is missing ${missing.join(", ")}. Set them in Vercel (Production).`);
    process.exit(1);
  }
  if (/@resend\.dev/i.test(process.env.NOTIFICATIONS_FROM_EMAIL)) {
    console.error("NOTIFICATIONS_FROM_EMAIL is Resend's test sender, which can't email merchants.");
    process.exit(1);
  }
}
