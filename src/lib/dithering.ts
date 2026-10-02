/**
 * Dithering and Color Quantization algorithms for retro displays
 */

import { DitherMethod, RGBColor } from '../types';

// Bayer 4x4 threshold matrix normalized to 0..1
const BAYER_4X4 = [
  [ 0/16,  8/16,  2/16, 10/16],
  [12/16,  4/16, 14/16,  6/16],
  [ 3/16, 11/16,  1/16,  9/16],
  [15/16,  7/16, 13/16,  5/16],
];

// Bayer 8x8 threshold matrix normalized to 0..1
const BAYER_8X8 = [
  [ 0/64, 32/64,  8/64, 40/64,  2/64, 34/64, 10/64, 42/64],
  [48/64, 16/64, 56/64, 24/64, 50/64, 18/64, 58/64, 26/64],
  [12/64, 44/64,  4/64, 36/64, 14/64, 46/64,  6/64, 38/64],
  [60/64, 28/64, 52/64, 20/64, 62/64, 30/64, 54/64, 22/64],
  [ 3/64, 35/64, 11/64, 43/64,  1/64, 33/64,  9/64, 41/64],
  [51/64, 19/64, 59/64, 27/64, 49/64, 17/64, 57/64, 25/64],
  [15/64, 47/64,  7/64, 39/64, 13/64, 45/64,  5/64, 37/64],
  [63/64, 31/64, 55/64, 23/64, 61/64, 29/64, 53/64, 21/64],
];

/**
 * Finds the index of the closest color in the palette using weighted perceptual distance
 */
export function findClosestPaletteIndex(
  r: number,
  g: number,
  b: number,
  palette: RGBColor[]
): number {
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = r - p.r;
    const dg = g - p.g;
    const db = b - p.b;

    // Perceptually weighted Euclidean distance (Redmean metric)
    const rMean = (r + p.r) / 2;
    const dist = (2 + rMean / 256) * dr * dr +
                 4 * dg * dg +
                 (2 + (255 - rMean) / 256) * db * db;

    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Applies brightness, contrast, and saturation adjustments
 */
export function adjustColor(
  r: number,
  g: number,
  b: number,
  brightness: number, // -100 to 100
  contrast: number,   // -100 to 100
  saturation: number  // -100 to 100
): [number, number, number] {
  // Brightness: -100..100 -> offset -255..255
  let adjR = r + (brightness * 2.55);
  let adjG = g + (brightness * 2.55);
  let adjB = b + (brightness * 2.55);

  // Contrast: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  if (contrast !== 0) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    adjR = factor * (adjR - 128) + 128;
    adjG = factor * (adjG - 128) + 128;
    adjB = factor * (adjB - 128) + 128;
  }

  // Saturation
  if (saturation !== 0) {
    const gray = 0.299 * adjR + 0.587 * adjG + 0.114 * adjB;
    const satFactor = 1 + (saturation / 100);
    adjR = gray + satFactor * (adjR - gray);
    adjG = gray + satFactor * (adjG - gray);
    adjB = gray + satFactor * (adjB - gray);
  }

  return [
    Math.max(0, Math.min(255, adjR)),
    Math.max(0, Math.min(255, adjG)),
    Math.max(0, Math.min(255, adjB)),
  ];
}

export interface DitherOptions {
  width: number;
  height: number;
  method: DitherMethod;
  strength: number; // 0 to 1
  palette: RGBColor[];
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

/**
 * Quantizes and dithers an ImageData buffer into palette indices and returns:
 * - indexedPixels: Uint8Array of palette indices (size = width * height)
 * - outputImageData: ImageData of RGB preview
 */
export function ditherImage(
  sourceData: ImageData,
  options: DitherOptions
): { indexedPixels: Uint8Array; outputImageData: ImageData } {
  const {
    width,
    height,
    method,
    strength,
    palette,
    brightness = 0,
    contrast = 0,
    saturation = 0,
  } = options;

  const totalPixels = width * height;
  const indexedPixels = new Uint8Array(totalPixels);
  const outputImageData = new ImageData(width, height);
  const outData = outputImageData.data;

  // Working float arrays for error diffusion
  const bufR = new Float32Array(totalPixels);
  const bufG = new Float32Array(totalPixels);
  const bufB = new Float32Array(totalPixels);

  const src = sourceData.data;

  // Copy and adjust source colors
  for (let i = 0; i < totalPixels; i++) {
    const srcIdx = i * 4;
    const [ar, ag, ab] = adjustColor(
      src[srcIdx],
      src[srcIdx + 1],
      src[srcIdx + 2],
      brightness,
      contrast,
      saturation
    );
    bufR[i] = ar;
    bufG[i] = ag;
    bufB[i] = ab;
  }

  // Pre-calculate Bayer threshold scale
  const ditherScale = strength * 64; // error distribution amplitude

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let currR = bufR[idx];
      let currG = bufG[idx];
      let currB = bufB[idx];

      // Ordered dithering modification
      if (method === 'bayer4' || method === 'bayer8') {
        const matrixVal = method === 'bayer4' 
          ? BAYER_4X4[y % 4][x % 4] 
          : BAYER_8X8[y % 8][x % 8];
        const offset = (matrixVal - 0.5) * ditherScale;
        currR = Math.max(0, Math.min(255, currR + offset));
        currG = Math.max(0, Math.min(255, currG + offset));
        currB = Math.max(0, Math.min(255, currB + offset));
      }

      // Find closest color in palette
      const colorIndex = findClosestPaletteIndex(currR, currG, currB, palette);
      indexedPixels[idx] = colorIndex;

      const chosen = palette[colorIndex];
      const outIdx = idx * 4;
      outData[outIdx] = chosen.r;
      outData[outIdx + 1] = chosen.g;
      outData[outIdx + 2] = chosen.b;
      outData[outIdx + 3] = 255;

      // Error diffusion
      if (method !== 'none' && method !== 'bayer4' && method !== 'bayer8') {
        const errR = (currR - chosen.r) * strength;
        const errG = (currG - chosen.g) * strength;
        const errB = (currB - chosen.b) * strength;

        const distribute = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            bufR[nIdx] += errR * factor;
            bufG[nIdx] += errG * factor;
            bufB[nIdx] += errB * factor;
          }
        };

        if (method === 'floyd-steinberg') {
          distribute(1, 0, 7 / 16);
          distribute(-1, 1, 3 / 16);
          distribute(0, 1, 5 / 16);
          distribute(1, 1, 1 / 16);
        } else if (method === 'atkinson') {
          // Atkinson distributes 1/8 to 6 neighbors (keeps highlights crisp!)
          distribute(1, 0, 1 / 8);
          distribute(2, 0, 1 / 8);
          distribute(-1, 1, 1 / 8);
          distribute(0, 1, 1 / 8);
          distribute(1, 1, 1 / 8);
          distribute(0, 2, 1 / 8);
        } else if (method === 'sierra-lite') {
          distribute(1, 0, 2 / 4);
          distribute(-1, 1, 1 / 4);
          distribute(0, 1, 1 / 4);
        }
      }
    }
  }

  return { indexedPixels, outputImageData };
}
