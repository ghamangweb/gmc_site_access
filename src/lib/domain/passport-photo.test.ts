import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getPassportPhotoBackgroundError,
  getPassportPhotoDimensionsError,
  getPassportPhotoFileError,
  PASSPORT_PHOTO_ERRORS,
  PASSPORT_PHOTO_MAX_BYTES,
  PASSPORT_PHOTO_SAMPLE_HEIGHT,
  PASSPORT_PHOTO_SAMPLE_WIDTH,
} from "./passport-photo";

function background(
  red: number,
  green: number,
  blue: number,
  alpha = 255,
): Uint8Array {
  const pixels = new Uint8Array(
    PASSPORT_PHOTO_SAMPLE_WIDTH * PASSPORT_PHOTO_SAMPLE_HEIGHT * 4,
  );

  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels.set([red, green, blue, alpha], offset);
  }

  return pixels;
}

test("photo file limits allow supported images at the limit and reject PDFs, empty and oversized files", () => {
  for (const contentType of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(
      getPassportPhotoFileError(contentType, PASSPORT_PHOTO_MAX_BYTES),
      null,
    );
  }

  assert.equal(
    getPassportPhotoFileError("application/pdf", 1024),
    PASSPORT_PHOTO_ERRORS.format,
  );
  assert.equal(
    getPassportPhotoFileError("image/png", 0),
    PASSPORT_PHOTO_ERRORS.unreadable,
  );
  assert.equal(
    getPassportPhotoFileError("image/jpeg", PASSPORT_PHOTO_MAX_BYTES + 1),
    PASSPORT_PHOTO_ERRORS.size,
  );
});

test("photo dimensions require sufficient resolution and portrait proportions with rounding tolerance", () => {
  assert.equal(getPassportPhotoDimensionsError(350, 450), null);
  assert.equal(getPassportPhotoDimensionsError(413, 531), null);
  assert.equal(getPassportPhotoDimensionsError(700, 900), null);
  assert.equal(
    getPassportPhotoDimensionsError(349, 450),
    PASSPORT_PHOTO_ERRORS.resolution,
  );
  assert.equal(
    getPassportPhotoDimensionsError(450, 450),
    PASSPORT_PHOTO_ERRORS.ratio,
  );
  assert.equal(
    getPassportPhotoDimensionsError(900, 700),
    PASSPORT_PHOTO_ERRORS.ratio,
  );
  assert.equal(
    getPassportPhotoDimensionsError(7000, 9000),
    PASSPORT_PHOTO_ERRORS.pixels,
  );
  assert.equal(
    getPassportPhotoDimensionsError(Number.NaN, 450),
    PASSPORT_PHOTO_ERRORS.unreadable,
  );
});

test("white and near-white backgrounds pass, including a central subject and dark clothing at the bottom", () => {
  const pixels = background(245, 240, 238);

  for (let y = 22; y < PASSPORT_PHOTO_SAMPLE_HEIGHT; y++) {
    for (let x = 0; x < PASSPORT_PHOTO_SAMPLE_WIDTH; x++) {
      if ((x >= 30 && x < 110) || y >= 110) {
        pixels.set(
          [40, 30, 20, 255],
          (y * PASSPORT_PHOTO_SAMPLE_WIDTH + x) * 4,
        );
      }
    }
  }

  assert.equal(
    getPassportPhotoBackgroundError(
      pixels,
      PASSPORT_PHOTO_SAMPLE_WIDTH,
      PASSPORT_PHOTO_SAMPLE_HEIGHT,
    ),
    null,
  );
  assert.equal(
    getPassportPhotoBackgroundError(
      background(255, 255, 255),
      PASSPORT_PHOTO_SAMPLE_WIDTH,
      PASSPORT_PHOTO_SAMPLE_HEIGHT,
    ),
    null,
  );
});

test("dark, coloured and transparent backgrounds are rejected", () => {
  for (const pixels of [
    background(180, 180, 180),
    background(225, 230, 255),
    background(255, 255, 255, 0),
  ]) {
    assert.equal(
      getPassportPhotoBackgroundError(
        pixels,
        PASSPORT_PHOTO_SAMPLE_WIDTH,
        PASSPORT_PHOTO_SAMPLE_HEIGHT,
      ),
      PASSPORT_PHOTO_ERRORS.background,
    );
  }
});

test("each sampled background region must pass independently", () => {
  const pixels = background(255, 255, 255);

  for (let y = 20; y < 99; y++) {
    for (let x = 0; x < 12; x++) {
      pixels.set([20, 80, 180, 255], (y * PASSPORT_PHOTO_SAMPLE_WIDTH + x) * 4);
    }
  }

  assert.equal(
    getPassportPhotoBackgroundError(
      pixels,
      PASSPORT_PHOTO_SAMPLE_WIDTH,
      PASSPORT_PHOTO_SAMPLE_HEIGHT,
    ),
    PASSPORT_PHOTO_ERRORS.background,
  );
  assert.equal(
    getPassportPhotoBackgroundError(new Uint8Array(4), 140, 180),
    PASSPORT_PHOTO_ERRORS.unreadable,
  );
});
