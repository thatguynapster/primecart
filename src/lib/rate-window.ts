/** Which fixed window a moment falls in, and when its counter can be dropped. */
export function windowFor(
  now: Date,
  windowMinutes: number
): { bucket: number; expiresAt: Date } {
  const size = windowMinutes * 60 * 1000;
  const bucket = Math.floor(now.getTime() / size);
  return { bucket, expiresAt: new Date((bucket + 1) * size) };
}
