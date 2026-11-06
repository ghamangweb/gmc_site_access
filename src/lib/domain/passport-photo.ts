export const PASSPORT_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PASSPORT_PHOTO_MAX_BYTES = 16 * 1024 * 1024;

export const PASSPORT_PHOTO_MAX_PIXELS = 40_000_000;

export const PASSPORT_PHOTO_SAMPLE_WIDTH = 140;

export const PASSPORT_PHOTO_SAMPLE_HEIGHT = 180;

export const PASSPORT_PHOTO_ERRORS = {
  format: "Choose a JPEG, PNG or WebP passport photograph",
  size: "Passport photograph must be 16 MB or smaller",
  resolution: "Passport photograph must be at least 350 × 450 pixels",
  ratio: "Use a portrait photograph with a 35:45 width-to-height ratio",
  pixels: "Passport photograph must not exceed 40 megapixels",
  background:
    "Use a plain white or near-white background for the passport photograph",
  unreadable: "The passport photograph could not be read. Choose another image",
  animated: "Choose a still passport photograph, not an animated image",
  unavailable:
    "The passport photograph could not be validated. Please try again",
} as const;

export type PassportPhotoError =
  (typeof PASSPORT_PHOTO_ERRORS)[keyof typeof PASSPORT_PHOTO_ERRORS];

export function getPassportPhotoFileError(
  contentType: string,
  size: number,
): PassportPhotoError | null {
  if (!PASSPORT_PHOTO_MIME_TYPES.some((type) => type === contentType)) {
    return PASSPORT_PHOTO_ERRORS.format;
  }

  if (size <= 0) return PASSPORT_PHOTO_ERRORS.unreadable;

  if (size > PASSPORT_PHOTO_MAX_BYTES) return PASSPORT_PHOTO_ERRORS.size;

  return null;
}

export function getPassportPhotoDimensionsError(
  width: number,
  height: number,
): PassportPhotoError | null {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return PASSPORT_PHOTO_ERRORS.unreadable;
  }

  if (width * height > PASSPORT_PHOTO_MAX_PIXELS)
    return PASSPORT_PHOTO_ERRORS.pixels;

  if (width < 350 || height < 450) return PASSPORT_PHOTO_ERRORS.resolution;

  // Two percent accommodates pixel rounding without accepting square or landscape images.
  if (Math.abs(width / height / (7 / 9) - 1) > 0.02) {
    return PASSPORT_PHOTO_ERRORS.ratio;
  }

  return null;
}

export function getPassportPhotoBackgroundError(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): PassportPhotoError | null {
  if (width <= 0 || height <= 0 || pixels.length !== width * height * 4) {
    return PASSPORT_PHOTO_ERRORS.unreadable;
  }

  // Sample three background regions separately. The lower portion is excluded
  // because a valid head-and-shoulders photograph has clothing along that edge.
  const regions = [
    { left: 0, right: width, top: 0, bottom: Math.ceil(height * 0.08) },
    {
      left: 0,
      right: Math.ceil(width * 0.08),
      top: 0,
      bottom: Math.ceil(height * 0.55),
    },
    {
      left: Math.floor(width * 0.92),
      right: width,
      top: 0,
      bottom: Math.ceil(height * 0.55),
    },
  ];

  for (const region of regions) {
    let whitePixels = 0;
    let totalPixels = 0;

    for (let y = region.top; y < region.bottom; y++) {
      for (let x = region.left; x < region.right; x++) {
        const offset = (y * width + x) * 4;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        const alpha = pixels[offset + 3];
        const darkest = Math.min(red, green, blue);
        const lightest = Math.max(red, green, blue);

        // Near-white permits light shadows and JPEG noise. Transparency is not
        // counted as white, even if the browser happens to display it on white.
        if (alpha >= 250 && darkest >= 220 && lightest - darkest <= 25) {
          whitePixels++;
        }

        totalPixels++;
      }
    }

    if (whitePixels / totalPixels < 0.85)
      return PASSPORT_PHOTO_ERRORS.background;
  }

  return null;
}
