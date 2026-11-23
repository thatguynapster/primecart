import { fitWithin, type ImageTarget } from "./fit";

/**
 * Re-encodes a picked photo in the browser until it fits the target. Always
 * re-encodes, even small files: that also drops EXIF, so a phone photo's GPS
 * position never ends up on a public shop page.
 *
 * Throws when the browser can't decode the file.
 */
export async function shrinkImage(file: File, target: ImageTarget): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    // An <img> rather than createImageBitmap: it applies the EXIF rotation
    // when drawn, in every browser.
    const image = new Image();
    image.src = url;
    await image.decode();

    // Safari can't write WebP and silently returns a PNG, hence the checks on
    // blob.type. JPEG is the last resort and the only one sure to shrink.
    const types =
      file.type === "image/jpeg"
        ? ["image/jpeg"]
        : ["image/webp", "image/png", "image/jpeg"];

    let edge = target.maxEdge;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      for (const type of types) {
        const canvas = draw(image, edge, type === "image/jpeg");
        for (const quality of type === "image/png" ? [1] : [0.85, 0.72, 0.6]) {
          const blob = await toBlob(canvas, type, quality);
          if (blob && blob.type === type && blob.size <= target.maxBytes) {
            return new File([blob], rename(file.name, type), {
              type,
              lastModified: file.lastModified,
            });
          }
        }
      }
      edge = Math.round(edge * 0.75);
    }
    throw new Error("Image could not be made small enough.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function draw(
  image: HTMLImageElement,
  maxEdge: number,
  opaque: boolean
): HTMLCanvasElement {
  const size = fitWithin(image.naturalWidth, image.naturalHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");
  if (opaque) {
    // JPEG has no transparency; unpainted pixels would come out black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size.width, size.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function rename(name: string, type: string): string {
  const extension = type === "image/jpeg" ? "jpg" : type.slice("image/".length);
  return `${name.replace(/\.[^.]*$/, "") || "photo"}.${extension}`;
}
