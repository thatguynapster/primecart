export type ImageTarget = { maxEdge: number; maxBytes: number };

/**
 * Vercel rejects a request body over about 4.5 MB before our code runs, and a
 * product form can carry five photos. Each photo is therefore shrunk in the
 * browser to at most this, so a full form stays well under the limit.
 */
export const PRODUCT_PHOTO: ImageTarget = { maxEdge: 1600, maxBytes: 700 * 1024 };
/** Hero, banner and logo forms send one file, so it can be larger. */
export const BRANDING_IMAGE: ImageTarget = { maxEdge: 2400, maxBytes: 1500 * 1024 };

/** Scales down to fit `maxEdge`, keeping proportions. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
