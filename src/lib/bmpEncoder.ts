/**
 * Windows BMP Encoder for 4-bit and 8-bit bitmaps
 * Supports BI_RGB (uncompressed), BI_RLE4, and BI_RLE8
 */

import {
  BitDepth,
  BitmapFileHeader,
  BitmapInfoHeader,
  CompressionType,
  RGBColor,
  RlePacket,
} from '../types';

export interface EncodeBmpOptions {
  width: number;
  height: number;
  bitDepth: BitDepth;
  compression: CompressionType;
  palette: RGBColor[];
  indexedPixels: Uint8Array; // row-major, top to bottom: index = y * width + x
}

export interface EncodeBmpResult {
  buffer: Uint8Array;
  fileHeader: BitmapFileHeader;
  infoHeader: BitmapInfoHeader;
  rawSize: number;
  bmpSize: number;
  compressionRatio: number;
  rlePackets?: RlePacket[];
}

/**
 * Encodes 8-bit scanlines into BI_RLE8 stream
 */
function encodeRle8(
  indexedPixels: Uint8Array,
  width: number,
  height: number
): { rleBytes: Uint8Array; packets: RlePacket[] } {
  const bytes: number[] = [];
  const packets: RlePacket[] = [];

  // Bottom-up scanlines: y goes from height - 1 down to 0
  for (let y = height - 1; y >= 0; y--) {
    let x = 0;
    while (x < width) {
      const startX = x;
      const color = indexedPixels[y * width + x];
      let runLength = 1;

      while (
        x + runLength < width &&
        runLength < 255 &&
        indexedPixels[y * width + x + runLength] === color
      ) {
        runLength++;
      }

      // Check if we have a repeating run or need an absolute run
      // For runs >= 2, encoded mode (2 bytes: count, color) is always >= equal or smaller
      if (runLength >= 2 || x + 1 >= width) {
        const offset = bytes.length;
        bytes.push(runLength, color);
        packets.push({
          offset,
          type: 'encoded',
          count: runLength,
          colorIndex: color,
          bytes: [runLength, color],
          x: startX,
          y,
        });
        x += runLength;
      } else {
        // Collect consecutive non-repeating pixels for absolute mode if >= 3
        const literalRun: number[] = [color];
        let litX = x + 1;

        while (litX < width && literalRun.length < 255) {
          // If we encounter 3 of the same color in a row, stop absolute mode
          if (
            litX + 2 < width &&
            indexedPixels[y * width + litX] === indexedPixels[y * width + litX + 1] &&
            indexedPixels[y * width + litX] === indexedPixels[y * width + litX + 2]
          ) {
            break;
          }
          literalRun.push(indexedPixels[y * width + litX]);
          litX++;
        }

        if (literalRun.length >= 3) {
          const offset = bytes.length;
          const pktBytes = [0x00, literalRun.length, ...literalRun];
          bytes.push(0x00, literalRun.length, ...literalRun);
          // WORD alignment pad
          if (literalRun.length % 2 !== 0) {
            bytes.push(0x00);
            pktBytes.push(0x00);
          }
          packets.push({
            offset,
            type: 'absolute',
            count: literalRun.length,
            bytes: pktBytes,
            x: startX,
            y,
          });
          x += literalRun.length;
        } else {
          // Just output 1-pixel encoded run: [1, color]
          const offset = bytes.length;
          bytes.push(1, color);
          packets.push({
            offset,
            type: 'encoded',
            count: 1,
            colorIndex: color,
            bytes: [1, color],
            x: startX,
            y,
          });
          x += 1;
        }
      }
    }

    // End of Line (00 00)
    const eolOffset = bytes.length;
    bytes.push(0x00, 0x00);
    packets.push({
      offset: eolOffset,
      type: 'eol',
      bytes: [0x00, 0x00],
      x: width,
      y,
    });
  }

  // End of Bitmap (00 01)
  const eobOffset = bytes.length;
  bytes.push(0x00, 0x01);
  packets.push({
    offset: eobOffset,
    type: 'eob',
    bytes: [0x00, 0x01],
    x: width,
    y: 0,
  });

  return { rleBytes: new Uint8Array(bytes), packets };
}

/**
 * Encodes 4-bit scanlines into BI_RLE4 stream
 */
function encodeRle4(
  indexedPixels: Uint8Array,
  width: number,
  height: number
): { rleBytes: Uint8Array; packets: RlePacket[] } {
  const bytes: number[] = [];
  const packets: RlePacket[] = [];

  // Bottom-up scanlines
  for (let y = height - 1; y >= 0; y--) {
    let x = 0;
    while (x < width) {
      const startX = x;
      const c1 = indexedPixels[y * width + x] & 0x0f;

      // Check run of identical color
      let runLength = 1;
      while (
        x + runLength < width &&
        runLength < 255 &&
        (indexedPixels[y * width + x + runLength] & 0x0f) === c1
      ) {
        runLength++;
      }

      // If we have a run of at least 2 pixels of identical color c1
      if (runLength >= 2 || x + 1 >= width) {
        const offset = bytes.length;
        const colorByte = (c1 << 4) | c1;
        bytes.push(runLength, colorByte);
        packets.push({
          offset,
          type: 'encoded',
          count: runLength,
          colorIndex: c1,
          bytes: [runLength, colorByte],
          x: startX,
          y,
        });
        x += runLength;
      } else {
        // Alternating pair or absolute mode
        // Check for 2 alternating pixels or absolute run
        const literalRun: number[] = [c1];
        let litX = x + 1;

        while (litX < width && literalRun.length < 255) {
          // If we see 4 identical pixels in a row, break to allow encoded run
          if (
            litX + 3 < width &&
            (indexedPixels[y * width + litX] & 0x0f) === (indexedPixels[y * width + litX + 1] & 0x0f) &&
            (indexedPixels[y * width + litX] & 0x0f) === (indexedPixels[y * width + litX + 2] & 0x0f) &&
            (indexedPixels[y * width + litX] & 0x0f) === (indexedPixels[y * width + litX + 3] & 0x0f)
          ) {
            break;
          }
          literalRun.push(indexedPixels[y * width + litX] & 0x0f);
          litX++;
        }

        if (literalRun.length >= 4) {
          // Absolute mode: 00 [count] [nibbles...] [pad]
          const offset = bytes.length;
          const pktBytes: number[] = [0x00, literalRun.length];
          bytes.push(0x00, literalRun.length);

          // Pack nibbles
          let byteCount = 0;
          for (let i = 0; i < literalRun.length; i += 2) {
            const high = literalRun[i] & 0x0f;
            const low = i + 1 < literalRun.length ? literalRun[i + 1] & 0x0f : 0;
            const b = (high << 4) | low;
            bytes.push(b);
            pktBytes.push(b);
            byteCount++;
          }

          // Pad to 16-bit WORD boundary
          if (byteCount % 2 !== 0) {
            bytes.push(0x00);
            pktBytes.push(0x00);
          }

          packets.push({
            offset,
            type: 'absolute',
            count: literalRun.length,
            colorIndices: literalRun,
            bytes: pktBytes,
            x: startX,
            y,
          });
          x += literalRun.length;
        } else {
          // Single pixel encoded run: count = 1, byte = (c1 << 4) | 0
          const offset = bytes.length;
          const colorByte = (c1 << 4);
          bytes.push(1, colorByte);
          packets.push({
            offset,
            type: 'encoded',
            count: 1,
            colorIndex: c1,
            bytes: [1, colorByte],
            x: startX,
            y,
          });
          x += 1;
        }
      }
    }

    // End of scanline (00 00)
    const eolOffset = bytes.length;
    bytes.push(0x00, 0x00);
    packets.push({
      offset: eolOffset,
      type: 'eol',
      bytes: [0x00, 0x00],
      x: width,
      y,
    });
  }

  // End of bitmap (00 01)
  const eobOffset = bytes.length;
  bytes.push(0x00, 0x01);
  packets.push({
    offset: eobOffset,
    type: 'eob',
    bytes: [0x00, 0x01],
    x: width,
    y: 0,
  });

  return { rleBytes: new Uint8Array(bytes), packets };
}

/**
 * Builds uncompressed 4-bit scanlines (BI_RGB)
 */
function encode4BitRaw(
  indexedPixels: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  // 4-bit: 2 pixels per byte
  const rowBytes = Math.ceil(width / 2);
  const rowStride = (rowBytes + 3) & ~3; // DWORD align (multiple of 4)
  const totalBytes = rowStride * height;
  const buffer = new Uint8Array(totalBytes);

  // Bottom-up scanlines
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    const rowOffset = y * rowStride;

    for (let x = 0; x < width; x += 2) {
      const p1 = indexedPixels[srcY * width + x] & 0x0f;
      const p2 = x + 1 < width ? indexedPixels[srcY * width + x + 1] & 0x0f : 0;
      buffer[rowOffset + Math.floor(x / 2)] = (p1 << 4) | p2;
    }
  }

  return buffer;
}

/**
 * Builds uncompressed 8-bit scanlines (BI_RGB)
 */
function encode8BitRaw(
  indexedPixels: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const rowStride = (width + 3) & ~3; // DWORD align
  const totalBytes = rowStride * height;
  const buffer = new Uint8Array(totalBytes);

  // Bottom-up scanlines
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    const rowOffset = y * rowStride;

    for (let x = 0; x < width; x++) {
      buffer[rowOffset + x] = indexedPixels[srcY * width + x];
    }
  }

  return buffer;
}

/**
 * Encodes complete Windows BMP file with 14-byte File Header, 40-byte Info Header,
 * RGBQUAD Palette, and Scanline/RLE data.
 */
export function encodeBmp(options: EncodeBmpOptions): EncodeBmpResult {
  const { width, height, bitDepth, compression, palette, indexedPixels } = options;

  const numColors = bitDepth === 4 ? 16 : 256;
  const paletteTableSize = numColors * 4; // 4 bytes per RGBQUAD (B, G, R, 0)
  const headerSize = 14 + 40; // FileHeader + InfoHeader
  const dataOffset = headerSize + paletteTableSize;

  let pixelData: Uint8Array;
  let rlePackets: RlePacket[] | undefined;
  let compressionId = 0; // 0 = BI_RGB

  if (bitDepth === 8) {
    if (compression === 'BI_RLE8') {
      compressionId = 1; // BI_RLE8
      const res = encodeRle8(indexedPixels, width, height);
      pixelData = res.rleBytes;
      rlePackets = res.packets;
    } else {
      compressionId = 0; // BI_RGB
      pixelData = encode8BitRaw(indexedPixels, width, height);
    }
  } else {
    // 4-bit
    if (compression === 'BI_RLE4') {
      compressionId = 2; // BI_RLE4
      const res = encodeRle4(indexedPixels, width, height);
      pixelData = res.rleBytes;
      rlePackets = res.packets;
    } else {
      compressionId = 0; // BI_RGB
      pixelData = encode4BitRaw(indexedPixels, width, height);
    }
  }

  const rawUncompressedSize = bitDepth === 8
    ? ((width + 3) & ~3) * height
    : ((Math.ceil(width / 2) + 3) & ~3) * height;

  const fileSize = dataOffset + pixelData.length;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // 1. BITMAPFILEHEADER (14 bytes)
  view.setUint16(0, 0x4D42, false); // 'BM' in little-endian (0x42, 0x4D)
  view.setUint32(2, fileSize, true);  // bfSize
  view.setUint16(6, 0, true);         // bfReserved1
  view.setUint16(8, 0, true);         // bfReserved2
  view.setUint32(10, dataOffset, true); // bfOffBits

  // 2. BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true);             // biSize = 40
  view.setInt32(18, width, true);           // biWidth
  view.setInt32(22, height, true);          // biHeight (positive = bottom-up)
  view.setUint16(26, 1, true);              // biPlanes = 1
  view.setUint16(28, bitDepth, true);       // biBitCount
  view.setUint32(30, compressionId, true);  // biCompression
  view.setUint32(34, pixelData.length, true); // biSizeImage
  view.setInt32(38, 2835, true);            // biXPelsPerMeter (72 DPI)
  view.setInt32(42, 2835, true);            // biYPelsPerMeter
  view.setUint32(46, numColors, true);      // biClrUsed
  view.setUint32(50, 0, true);              // biClrImportant

  // 3. RGBQUAD Palette Table (4 bytes each: B, G, R, 0)
  let palOffset = 54;
  for (let i = 0; i < numColors; i++) {
    const col = palette[i] || { r: 0, g: 0, b: 0 };
    buffer[palOffset] = col.b;
    buffer[palOffset + 1] = col.g;
    buffer[palOffset + 2] = col.r;
    buffer[palOffset + 3] = 0; // reserved
    palOffset += 4;
  }

  // 4. Pixel Data
  buffer.set(pixelData, dataOffset);

  const fileHeader: BitmapFileHeader = {
    bfType: 'BM',
    bfSize: fileSize,
    bfReserved1: 0,
    bfReserved2: 0,
    bfOffBits: dataOffset,
  };

  const compressionName: CompressionType = 
    compressionId === 1 ? 'BI_RLE8' : 
    compressionId === 2 ? 'BI_RLE4' : 'BI_RGB';

  const infoHeader: BitmapInfoHeader = {
    biSize: 40,
    biWidth: width,
    biHeight: height,
    biPlanes: 1,
    biBitCount: bitDepth,
    biCompression: compressionId,
    biCompressionName: compressionName,
    biSizeImage: pixelData.length,
    biXPelsPerMeter: 2835,
    biYPelsPerMeter: 2835,
    biClrUsed: numColors,
    biClrImportant: 0,
  };

  const compressionRatio = rawUncompressedSize > 0 
    ? Math.round(((rawUncompressedSize - pixelData.length) / rawUncompressedSize) * 100) 
    : 0;

  return {
    buffer,
    fileHeader,
    infoHeader,
    rawSize: rawUncompressedSize,
    bmpSize: fileSize,
    compressionRatio,
    rlePackets,
  };
}
