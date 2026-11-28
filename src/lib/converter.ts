/**
 * Shared image conversion pipeline and DOS 8.3 filename utilities
 */

import { CompressionType, ConversionResult, EditorSettings } from '../types';
import { getPaletteByPreset } from './palettes';
import { ditherImage } from './dithering';
import { encodeBmp } from './bmpEncoder';

/**
 * Generates a valid MS-DOS 8.3 filename (up to 8 uppercase alphanumeric chars + .BMP)
 * and ensures uniqueness within an existing set of filenames.
 */
export function toDos83Filename(originalName: string, existingNames: Set<string>): string {
  const baseRaw = originalName
    .replace(/\.[^/.]+$/, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '');

  const base = (baseRaw || 'IMAGE').slice(0, 8);
  let candidate = `${base}.BMP`;

  if (!existingNames.has(candidate)) {
    return candidate;
  }

  let counter = 1;
  while (counter < 999) {
    const suffix = String(counter);
    const prefix = base.slice(0, Math.max(1, 8 - suffix.length));
    candidate = `${prefix}${suffix}.BMP`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
    counter++;
  }

  return `IMG${Date.now().toString().slice(-5)}.BMP`;
}

/**
 * Reads a File object into a Data URL and natural image dimensions.
 */
export function readImageFile(
  file: File
): Promise<{ dataUrl: string; width: number; height: number; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error(`Empty file data for ${file.name}`));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error(`Invalid image format: ${file.name}`));
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          name: file.name,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts an image Data URL into a full ConversionResult using the provided settings.
 * When `respectPerImageAspect` is true and `settings.maintainAspect` is enabled,
 * target height is computed from `settings.width` and the image's natural aspect ratio.
 */
export function convertImageToBmp(
  dataUrl: string,
  settings: EditorSettings,
  options?: { respectPerImageAspect?: boolean }
): Promise<{ result: ConversionResult; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to decode source image'));
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        const targetWidth = Math.max(8, Math.min(800, settings.width));
        let targetHeight = Math.max(8, Math.min(600, settings.height));

        if (
          options?.respectPerImageAspect &&
          settings.maintainAspect &&
          naturalWidth > 0 &&
          naturalHeight > 0
        ) {
          targetHeight = Math.max(
            8,
            Math.min(600, Math.round((targetWidth * naturalHeight) / naturalWidth))
          );
        }

        const offCanvas = document.createElement('canvas');
        offCanvas.width = targetWidth;
        offCanvas.height = targetHeight;
        const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const rawImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        // 1. Target Palette
        const palette = getPaletteByPreset(settings.palettePreset, rawImageData);

        // 2. Dither & Quantize
        const { indexedPixels, outputImageData } = ditherImage(rawImageData, {
          width: targetWidth,
          height: targetHeight,
          method: settings.ditherMethod,
          strength: settings.ditherStrength,
          palette,
          brightness: settings.brightness,
          contrast: settings.contrast,
          saturation: settings.saturation,
        });

        // 3. Resolve compression flag & encode BMP
        const effectiveCompression: CompressionType = settings.useRleCompression
          ? settings.bitDepth === 8
            ? 'BI_RLE8'
            : 'BI_RLE4'
          : 'BI_RGB';

        const bmpResult = encodeBmp({
          width: targetWidth,
          height: targetHeight,
          bitDepth: settings.bitDepth,
          compression: effectiveCompression,
          palette,
          indexedPixels,
        });

        // 4. Preview Data URL
        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetWidth;
        outCanvas.height = targetHeight;
        const outCtx = outCanvas.getContext('2d');
        if (outCtx) {
          outCtx.putImageData(outputImageData, 0, 0);
        }
        const processedDataUrl = outCanvas.toDataURL('image/png');

        // 5. Blob & URL
        const bmpBlob = new Blob([bmpResult.buffer as unknown as BlobPart], {
          type: 'image/bmp',
        });
        const bmpUrl = URL.createObjectURL(bmpBlob);

        resolve({
          naturalWidth,
          naturalHeight,
          result: {
            width: targetWidth,
            height: targetHeight,
            bitDepth: settings.bitDepth,
            compression: effectiveCompression,
            palette,
            indexedPixels,
            bmpBuffer: bmpResult.buffer,
            bmpBlob,
            bmpUrl,
            fileHeader: bmpResult.fileHeader,
            infoHeader: bmpResult.infoHeader,
            rawSize: bmpResult.rawSize,
            bmpSize: bmpResult.bmpSize,
            compressionRatio: bmpResult.compressionRatio,
            rlePackets: bmpResult.rlePackets,
            processedDataUrl,
          },
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('BMP conversion failed'));
      }
    };
    img.src = dataUrl;
  });
}
