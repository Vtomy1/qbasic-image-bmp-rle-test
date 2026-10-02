/**
 * Color palettes for QBasic / QuickBASIC / VGA DOS graphics
 */

import { RGBColor, PalettePreset } from '../types';

export function createRgbColor(r: number, g: number, b: number): RGBColor {
  const clampR = Math.max(0, Math.min(255, Math.round(r)));
  const clampG = Math.max(0, Math.min(255, Math.round(g)));
  const clampB = Math.max(0, Math.min(255, Math.round(b)));
  
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  
  return {
    r: clampR,
    g: clampG,
    b: clampB,
    hex: `#${toHex(clampR)}${toHex(clampG)}${toHex(clampB)}`,
    // VGA DAC is 6-bit per channel: 0 to 63
    vgaR: Math.floor(clampR / 4),
    vgaG: Math.floor(clampG / 4),
    vgaB: Math.floor(clampB / 4),
  };
}

/**
 * Standard 16-color QBasic / QuickBASIC palette (SCREEN 12, SCREEN 9, SCREEN 7)
 */
export const QBASIC_16_PALETTE: RGBColor[] = [
  createRgbColor(0, 0, 0),       // 0: Black
  createRgbColor(0, 0, 170),     // 1: Blue
  createRgbColor(0, 170, 0),     // 2: Green
  createRgbColor(0, 170, 170),   // 3: Cyan
  createRgbColor(170, 0, 0),     // 4: Red
  createRgbColor(170, 0, 170),   // 5: Magenta
  createRgbColor(170, 85, 0),    // 6: Brown
  createRgbColor(170, 170, 170), // 7: Light Gray (White)
  createRgbColor(85, 85, 85),    // 8: Dark Gray
  createRgbColor(85, 85, 255),   // 9: Light Blue
  createRgbColor(85, 255, 85),   // 10: Light Green
  createRgbColor(85, 255, 255),  // 11: Light Cyan
  createRgbColor(255, 85, 85),   // 12: Light Red
  createRgbColor(255, 85, 255),  // 13: Light Magenta
  createRgbColor(255, 255, 85),  // 14: Yellow
  createRgbColor(255, 255, 255), // 15: High-intensity White
];

/**
 * Generates the standard default VGA BIOS 256-color palette (SCREEN 13)
 */
export function generateVga256Palette(): RGBColor[] {
  const palette: RGBColor[] = [];

  // Colors 0-15: Standard 16 colors
  palette.push(...QBASIC_16_PALETTE);

  // Colors 16-31: 16 shades of gray
  for (let i = 0; i < 16; i++) {
    // DAC values typically ramp from 0 to 63 in steps of ~4
    const v = Math.round((i / 15) * 255);
    palette.push(createRgbColor(v, v, v));
  }

  // Colors 32-247: VGA color cube / hue wheel (72 colors x 3 intensity groups = 216 colors)
  // Standard VGA BIOS layout: 24 hues at high, medium, and low saturation/luminance
  const intensities = [
    { max: 255, mid: 128 }, // High
    { max: 180, mid: 90 },  // Medium
    { max: 110, mid: 55 }   // Dark
  ];

  for (const { max, mid } of intensities) {
    // 24 hues:
    // Red to Yellow (R=max, G ramps 0->max, B=0)
    for (let step = 0; step < 4; step++) {
      palette.push(createRgbColor(max, Math.round((step / 4) * max), 0));
    }
    // Yellow to Green (R ramps max->0, G=max, B=0)
    for (let step = 0; step < 4; step++) {
      palette.push(createRgbColor(Math.round(((4 - step) / 4) * max), max, 0));
    }
    // Green to Cyan (R=0, G=max, B ramps 0->max)
    for (let step = 0; step < 4; step++) {
      palette.push(createRgbColor(0, max, Math.round((step / 4) * max)));
    }
    // Cyan to Blue (R=0, G ramps max->0, B=max)
    for (let step = 0; step < 4; step++) {
      palette.push(createRgbColor(0, Math.round(((4 - step) / 4) * max), max));
    }
    // Blue to Magenta (R ramps 0->max, G=0, B=max)
    for (let step = 0; step < 4; step++) {
      palette.push(createRgbColor(Math.round((step / 4) * max), 0, max));
    }
    // Magenta to Red (R=max, G=0, B ramps max->0)
    for (let step = 0; step < 4; step++) {
      palette.push(createRgbColor(max, 0, Math.round(((4 - step) / 4) * max)));
    }
  }

  // Colors 248-255: Pure black entries (or system reserved)
  while (palette.length < 256) {
    palette.push(createRgbColor(0, 0, 0));
  }

  return palette.slice(0, 256);
}

export const VGA_256_PALETTE: RGBColor[] = generateVga256Palette();

export const EGA_16_PALETTE: RGBColor[] = [
  createRgbColor(0, 0, 0),
  createRgbColor(0, 0, 168),
  createRgbColor(0, 168, 0),
  createRgbColor(0, 168, 168),
  createRgbColor(168, 0, 0),
  createRgbColor(168, 0, 168),
  createRgbColor(168, 84, 0),
  createRgbColor(168, 168, 168),
  createRgbColor(84, 84, 84),
  createRgbColor(84, 84, 252),
  createRgbColor(84, 252, 84),
  createRgbColor(84, 252, 252),
  createRgbColor(252, 84, 84),
  createRgbColor(252, 84, 252),
  createRgbColor(252, 252, 84),
  createRgbColor(252, 252, 252),
];

export const CGA_0_PALETTE: RGBColor[] = [
  createRgbColor(0, 0, 0),       // Black
  createRgbColor(0, 170, 0),     // Green
  createRgbColor(170, 0, 0),     // Red
  createRgbColor(170, 85, 0),    // Brown / Yellow
  ...Array(12).fill(createRgbColor(0, 0, 0)),
];

export const CGA_1_PALETTE: RGBColor[] = [
  createRgbColor(0, 0, 0),       // Black
  createRgbColor(0, 170, 170),   // Cyan
  createRgbColor(170, 0, 170),   // Magenta
  createRgbColor(170, 170, 170), // Light Gray
  ...Array(12).fill(createRgbColor(0, 0, 0)),
];

export const GAMEBOY_PALETTE: RGBColor[] = [
  createRgbColor(15, 56, 15),
  createRgbColor(48, 98, 48),
  createRgbColor(139, 172, 15),
  createRgbColor(155, 188, 15),
  ...Array(12).fill(createRgbColor(0, 0, 0)),
];

export const AMBER_CRT_PALETTE: RGBColor[] = Array.from({ length: 16 }, (_, i) => {
  const intensity = i / 15;
  return createRgbColor(
    Math.round(255 * intensity),
    Math.round(176 * intensity),
    Math.round(0 * intensity)
  );
});

export const GREEN_CRT_PALETTE: RGBColor[] = Array.from({ length: 16 }, (_, i) => {
  const intensity = i / 15;
  return createRgbColor(
    Math.round(51 * intensity),
    Math.round(255 * intensity),
    Math.round(51 * intensity)
  );
});

/**
 * Adaptive palette extraction using Median Cut quantization
 */
export function extractAdaptivePalette(imageData: ImageData, colorCount: 16 | 256): RGBColor[] {
  const data = imageData.data;
  const pixels: [number, number, number][] = [];
  
  // Sample pixels (downsample for speed if very large)
  const step = Math.max(1, Math.floor(data.length / (4 * 20000)));
  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a > 32) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
  }

  if (pixels.length === 0) {
    return colorCount === 16 ? [...QBASIC_16_PALETTE] : [...VGA_256_PALETTE];
  }

  interface Box {
    pixels: [number, number, number][];
  }

  const boxes: Box[] = [{ pixels }];

  while (boxes.length < colorCount) {
    let longestBoxIndex = -1;
    let maxRange = -1;
    let splitChannel: 0 | 1 | 2 = 0;

    for (let b = 0; b < boxes.length; b++) {
      const box = boxes[b];
      if (box.pixels.length <= 1) continue;

      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (const [r, g, bVal] of box.pixels) {
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (g < minG) minG = g; if (g > maxG) maxG = g;
        if (bVal < minB) minB = bVal; if (bVal > maxB) maxB = bVal;
      }

      const rangeR = maxR - minR;
      const rangeG = maxG - minG;
      const rangeB = maxB - minB;
      const localMax = Math.max(rangeR, rangeG, rangeB);

      if (localMax > maxRange) {
        maxRange = localMax;
        longestBoxIndex = b;
        splitChannel = localMax === rangeR ? 0 : localMax === rangeG ? 1 : 2;
      }
    }

    if (longestBoxIndex === -1 || maxRange <= 0) break;

    const boxToSplit = boxes.splice(longestBoxIndex, 1)[0];
    boxToSplit.pixels.sort((a, b) => a[splitChannel] - b[splitChannel]);

    const median = Math.floor(boxToSplit.pixels.length / 2);
    boxes.push({ pixels: boxToSplit.pixels.slice(0, median) });
    boxes.push({ pixels: boxToSplit.pixels.slice(median) });
  }

  const result: RGBColor[] = [];
  for (const box of boxes) {
    let sumR = 0, sumG = 0, sumB = 0;
    for (const [r, g, b] of box.pixels) {
      sumR += r; sumG += g; sumB += b;
    }
    const count = box.pixels.length;
    result.push(createRgbColor(
      count > 0 ? sumR / count : 0,
      count > 0 ? sumG / count : 0,
      count > 0 ? sumB / count : 0
    ));
  }

  // Pad to exact count
  while (result.length < colorCount) {
    result.push(createRgbColor(0, 0, 0));
  }

  return result.slice(0, colorCount);
}

/**
 * Get palette by preset name
 */
export function getPaletteByPreset(preset: PalettePreset, customImageData?: ImageData): RGBColor[] {
  switch (preset) {
    case 'qbasic16':
      return [...QBASIC_16_PALETTE];
    case 'vga256':
      return [...VGA_256_PALETTE];
    case 'custom16':
      if (customImageData) {
        return extractAdaptivePalette(customImageData, 16);
      }
      return [...QBASIC_16_PALETTE];
    case 'custom256':
      if (customImageData) {
        return extractAdaptivePalette(customImageData, 256);
      }
      return [...VGA_256_PALETTE];
    case 'ega16':
      return [...EGA_16_PALETTE];
    case 'cga0':
      return [...CGA_0_PALETTE];
    case 'cga1':
      return [...CGA_1_PALETTE];
    case 'gameboy':
      return [...GAMEBOY_PALETTE];
    case 'amber-crt':
      return [...AMBER_CRT_PALETTE];
    case 'green-crt':
      return [...GREEN_CRT_PALETTE];
    default:
      return [...QBASIC_16_PALETTE];
  }
}
