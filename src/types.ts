/**
 * Type definitions for QBasic BMP Studio
 */

export type BitDepth = 4 | 8;

export type CompressionType = 'BI_RGB' | 'BI_RLE4' | 'BI_RLE8';

export type DitherMethod = 
  | 'none'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'bayer4'
  | 'bayer8'
  | 'sierra-lite';

export type PalettePreset = 
  | 'qbasic16'
  | 'vga256'
  | 'custom16'
  | 'custom256'
  | 'ega16'
  | 'cga0'
  | 'cga1'
  | 'gameboy'
  | 'amber-crt'
  | 'green-crt';

export type ScreenModePreset =
  | 'screen13'   // 320x200 (8-bit 256 colors)
  | 'screen12'   // 640x480 (4-bit 16 colors)
  | 'screen7'    // 320x200 (4-bit 16 colors)
  | 'screen9'    // 640x350 (4-bit 16 colors)
  | 'sprite16'   // 16x16
  | 'sprite32'   // 32x32
  | 'sprite64'   // 64x64
  | 'custom';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  vgaR: number; // 0-63 (for QBasic OUT &H3C9)
  vgaG: number;
  vgaB: number;
}

export interface BitmapFileHeader {
  bfType: string;       // "BM"
  bfSize: number;       // total file size in bytes
  bfReserved1: number;  // 0
  bfReserved2: number;  // 0
  bfOffBits: number;    // byte offset to pixel data
}

export interface BitmapInfoHeader {
  biSize: number;          // 40
  biWidth: number;         // width in pixels
  biHeight: number;        // height in pixels
  biPlanes: number;        // 1
  biBitCount: BitDepth;    // 4 or 8
  biCompression: number;   // 0=BI_RGB, 1=BI_RLE8, 2=BI_RLE4
  biCompressionName: CompressionType;
  biSizeImage: number;     // size of raw image data buffer
  biXPelsPerMeter: number; // 2835 (72 dpi)
  biYPelsPerMeter: number;
  biClrUsed: number;       // 16 or 256
  biClrImportant: number;  // 0
}

export interface RlePacket {
  offset: number;
  type: 'encoded' | 'absolute' | 'eol' | 'eob' | 'delta';
  count?: number;
  colorIndex?: number;
  colorIndices?: number[];
  bytes: number[];
  x: number;
  y: number;
}

export interface ConversionResult {
  width: number;
  height: number;
  bitDepth: BitDepth;
  compression: CompressionType;
  palette: RGBColor[];
  indexedPixels: Uint8Array; // row-major, top-to-bottom
  bmpBuffer: Uint8Array;
  bmpBlob: Blob;
  bmpUrl: string;
  fileHeader: BitmapFileHeader;
  infoHeader: BitmapInfoHeader;
  rawSize: number;
  bmpSize: number;
  compressionRatio: number;
  rlePackets?: RlePacket[];
  processedDataUrl: string;
}

export interface EditorSettings {
  screenPreset: ScreenModePreset;
  width: number;
  height: number;
  bitDepth: BitDepth;
  useRleCompression: boolean;
  compression: CompressionType;
  ditherMethod: DitherMethod;
  ditherStrength: number; // 0 to 1
  palettePreset: PalettePreset;
  brightness: number;     // -100 to 100
  contrast: number;       // -100 to 100
  saturation: number;     // -100 to 100
  maintainAspect: boolean;
  correctDosAspect: boolean; // 1.2 pixel aspect ratio for 320x200 on 4:3 CRT
  crtFilter: boolean;
  pixelGrid: boolean;
  zoom: number;
}

export type ActiveTab = 'editor' | 'batch' | 'code' | 'inspector' | 'emulator';

export type BatchItemStatus = 'queued' | 'processing' | 'done' | 'error';

export interface BatchItem {
  id: string;
  originalName: string;
  dosFilename: string;
  originalDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  status: BatchItemStatus;
  error?: string;
  result?: ConversionResult;
}

