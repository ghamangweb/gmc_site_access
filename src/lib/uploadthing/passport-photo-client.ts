import {
  getPassportPhotoBackgroundError,
  getPassportPhotoDimensionsError,
  getPassportPhotoFileError,
  PASSPORT_PHOTO_ERRORS,
  PASSPORT_PHOTO_SAMPLE_HEIGHT,
  PASSPORT_PHOTO_SAMPLE_WIDTH,
  type PassportPhotoError,
} from "@/lib/domain/passport-photo";

export async function validatePassportPhotoFile(
  file: File,
): Promise<PassportPhotoError | null> {
  const fileError = getPassportPhotoFileError(file.type, file.size);

  if (fileError) return fileError;

  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const dimensionError = getPassportPhotoDimensionsError(
      image.naturalWidth,
      image.naturalHeight,
    );

    if (dimensionError) return dimensionError;

    const canvas = document.createElement("canvas");
    canvas.width = PASSPORT_PHOTO_SAMPLE_WIDTH;
    canvas.height = PASSPORT_PHOTO_SAMPLE_HEIGHT;

    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return PASSPORT_PHOTO_ERRORS.unavailable;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return getPassportPhotoBackgroundError(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
    );
  } catch {
    return PASSPORT_PHOTO_ERRORS.unreadable;
  } finally {
    URL.revokeObjectURL(url);
  }
}
