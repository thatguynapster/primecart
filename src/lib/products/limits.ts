/**
 * Product limits shared between the server actions and the forms.
 *
 * Kept out of `actions.ts` because a `"use server"` module may only export
 * async functions — exporting a constant from one is a build error.
 */

/**
 * Photos per product.
 *
 * The picker enforces this for convenience; the server action enforces it for
 * real, since a form can be submitted without the client component.
 */
export const MAX_IMAGES_PER_PRODUCT = 5;
