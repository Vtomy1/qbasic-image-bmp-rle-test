import React from 'react';
import {
  BitDepth,
  EditorSettings,
  PalettePreset,
  RGBColor,
  ScreenModePreset,
} from '../types';
import {
  Monitor,
  Sliders,
  Palette,
  Tv,
  Download,
} from 'lucide-react';
import { getPaletteByPreset } from '../lib/palettes';
import {
  downloadPaletteFile,
  getPalettePresetLabel,
  PaletteExportFormat,
} from '../lib/paletteExport';
import { PalettePreview } from './PalettePreview';

interface EditorControlsProps {
  settings: EditorSettings;
  onChange: (newSettings: Partial<EditorSettings>) => void;
  originalWidth: number;
  originalHeight: number;
  activePalette?: RGBColor[];
  imageName?: string;
}

export const EditorControls: React.FC<EditorControlsProps> = ({
  settings,
  onChange,
  originalWidth,
  originalHeight,
  activePalette,
  imageName = 'palette',
}) => {
  const getCompressionFor = (depth: BitDepth, enableRle: boolean) =>
    enableRle ? (depth === 8 ? 'BI_RLE8' : 'BI_RLE4') : 'BI_RGB';

  const handlePresetChange = (preset: ScreenModePreset) => {
    switch (preset) {
      case 'screen13':
        onChange({
          screenPreset: preset,
          width: 320,
          height: 200,
          bitDepth: 8,
          compression: getCompressionFor(8, settings.useRleCompression),
          palettePreset: 'vga256',
        });
        break;
      case 'screen12':
        onChange({
          screenPreset: preset,
          width: 640,
          height: 480,
          bitDepth: 4,
          compression: getCompressionFor(4, settings.useRleCompression),
          palettePreset: 'qbasic16',
        });
        break;
      case 'screen7':
        onChange({
          screenPreset: preset,
          width: 320,
          height: 200,
          bitDepth: 4,
          compression: getCompressionFor(4, settings.useRleCompression),
          palettePreset: 'qbasic16',
        });
        break;
      case 'screen9':
        onChange({
          screenPreset: preset,
          width: 640,
          height: 350,
          bitDepth: 4,
          compression: getCompressionFor(4, settings.useRleCompression),
          palettePreset: 'qbasic16',
        });
        break;
      case 'sprite16':
        onChange({
          screenPreset: preset,
          width: 16,
          height: 16,
        });
        break;
      case 'sprite32':
        onChange({
          screenPreset: preset,
          width: 32,
          height: 32,
        });
        break;
      case 'sprite64':
        onChange({
          screenPreset: preset,
          width: 64,
          height: 64,
        });
        break;
      case 'custom':
      default:
        onChange({ screenPreset: 'custom' });
        break;
    }
  };

  const handleBitDepthChange = (depth: BitDepth) => {
    if (depth === 4) {
      onChange({
        bitDepth: 4,
        compression: getCompressionFor(4, settings.useRleCompression),
        palettePreset: settings.palettePreset === 'vga256' ? 'qbasic16' : 
                       settings.palettePreset === 'custom256' ? 'custom16' : settings.palettePreset,
      });
    } else {
      onChange({
        bitDepth: 8,
        compression: getCompressionFor(8, settings.useRleCompression),
        palettePreset: settings.palettePreset === 'qbasic16' ? 'vga256' : 
                       settings.palettePreset === 'custom16' ? 'custom256' : settings.palettePreset,
      });
    }
  };

  const handleCompressionToggle = (useRle: boolean) => {
    onChange({
      useRleCompression: useRle,
      compression: getCompressionFor(settings.bitDepth, useRle),
    });
  };

  const isRleActive = settings.useRleCompression;

  return (
    <div className="flex flex-col gap-5 text-sm text-slate-300">
      {/* 1. Target Screen Mode & Dimensions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            Screen Mode / Resolution
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            {settings.width} × {settings.height}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
          <button
            onClick={() => handlePresetChange('screen13')}
            className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors text-left ${
              settings.screenPreset === 'screen13'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SCREEN 13 (320×200 256c)
          </button>
          <button
            onClick={() => handlePresetChange('screen12')}
            className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors text-left ${
              settings.screenPreset === 'screen12'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SCREEN 12 (640×480 16c)
          </button>
          <button
            onClick={() => handlePresetChange('screen7')}
            className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors text-left ${
              settings.screenPreset === 'screen7'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SCREEN 7 (320×200 16c)
          </button>
          <button
            onClick={() => handlePresetChange('sprite32')}
            className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors text-left ${
              settings.screenPreset === 'sprite32'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sprite (32×32 PUT/GET)
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1">
            <span className="text-[11px] text-slate-400 block mb-1">Width</span>
            <input
              type="number"
              min={8}
              max={800}
              value={settings.width}
              onChange={(e) => {
                const w = parseInt(e.target.value) || 320;
                onChange({
                  width: w,
                  screenPreset: 'custom',
                  height: settings.maintainAspect && originalWidth > 0
                    ? Math.round((w * originalHeight) / originalWidth)
                    : settings.height,
                });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex-1">
            <span className="text-[11px] text-slate-400 block mb-1">Height</span>
            <input
              type="number"
              min={8}
              max={600}
              value={settings.height}
              onChange={(e) => {
                const h = parseInt(e.target.value) || 200;
                onChange({
                  height: h,
                  screenPreset: 'custom',
                  width: settings.maintainAspect && originalHeight > 0
                    ? Math.round((h * originalWidth) / originalHeight)
                    : settings.width,
                });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            onClick={() => onChange({ maintainAspect: !settings.maintainAspect })}
            className={`self-end px-2.5 py-1 text-xs rounded border transition-colors ${
              settings.maintainAspect
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-700'
            }`}
            title="Lock Aspect Ratio"
          >
            Lock
          </button>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* 2. Color Depth & Compression Mode */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          Color Depth & BMP Compression
        </label>

        {/* 4-Bit vs 8-Bit */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
          <button
            onClick={() => handleBitDepthChange(8)}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              settings.bitDepth === 8
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            8-Bit (256 Colors)
          </button>
          <button
            onClick={() => handleBitDepthChange(4)}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              settings.bitDepth === 4
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4-Bit (16 Colors)
          </button>
        </div>

        {/* RLE Compression Checkbox */}
        <label className="flex items-start gap-3 p-2.5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 rounded-lg cursor-pointer select-none transition-colors">
          <input
            type="checkbox"
            checked={isRleActive}
            onChange={(e) => handleCompressionToggle(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-amber-500 rounded border-slate-600 bg-slate-950 cursor-pointer shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-white flex items-center justify-between gap-2">
              <span>Enable RLE Compression</span>
              <span className="text-[11px] font-mono text-amber-400">
                {isRleActive
                  ? settings.bitDepth === 8
                    ? 'BI_RLE8'
                    : 'BI_RLE4'
                  : 'BI_RGB'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isRleActive
                ? `Compresses repeating ${settings.bitDepth}-bit pixel runs into 2-byte RLE opcodes`
                : 'Uncompressed scanlines with 4-byte DWORD row padding'}
            </p>
          </div>
        </label>
      </div>

      <hr className="border-slate-800" />

      {/* 3. Dithering Algorithm & Strength */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          Dithering Algorithm
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'floyd-steinberg', label: 'Floyd-Steinberg' },
              { id: 'atkinson', label: 'Atkinson (Vintage)' },
              { id: 'bayer4', label: 'Bayer 4×4 Matrix' },
              { id: 'bayer8', label: 'Bayer 8×8 Matrix' },
              { id: 'sierra-lite', label: 'Sierra-Lite' },
              { id: 'none', label: 'None (Threshold)' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => onChange({ ditherMethod: m.id })}
              className={`px-2.5 py-1.5 text-xs text-left rounded border transition-colors ${
                settings.ditherMethod === m.id
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-medium'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Dither strength slider */}
        {settings.ditherMethod !== 'none' && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Dither Diffusion Strength</span>
              <span className="font-mono text-amber-400">
                {Math.round(settings.ditherStrength * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.ditherStrength}
              onChange={(e) => onChange({ ditherStrength: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      <hr className="border-slate-800" />

      {/* 4. Target Palette Selection */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          Color Palette
        </label>

        <select
          value={settings.palettePreset}
          onChange={(e) => onChange({ palettePreset: e.target.value as PalettePreset })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
        >
          {settings.bitDepth === 8 ? (
            <>
              <option value="vga256">Standard VGA BIOS 256 Colors (SCREEN 13)</option>
              <option value="custom256">Custom Adaptive 256 (K-Means Palette)</option>
            </>
          ) : (
            <>
              <option value="qbasic16">Standard QBasic 16 Colors (SCREEN 12/9/7)</option>
              <option value="custom16">Custom Adaptive 16 (Auto-Extracted)</option>
              <option value="ega16">EGA 16-Color Standard</option>
              <option value="cga0">CGA Palette 0 (Green/Red/Brown)</option>
              <option value="cga1">CGA Palette 1 (Cyan/Magenta/White)</option>
              <option value="gameboy">Retro Handheld 4-Shade Green</option>
              <option value="amber-crt">Amber Phosphor Monochrome</option>
              <option value="green-crt">Green Phosphor Monochrome</option>
            </>
          )}
        </select>

        {settings.palettePreset.startsWith('custom') && (
          <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
            Custom palette generates QBasic <code className="font-mono text-white">OUT &amp;H3C8/&amp;H3C9</code> VGA DAC code to reprogram hardware registers.
          </p>
        )}

        {/* Visual Color Palette Swatch Preview */}
        <PalettePreview
          palette={
            activePalette && activePalette.length === (settings.bitDepth === 4 ? 16 : 256)
              ? activePalette
              : getPaletteByPreset(settings.palettePreset)
          }
        />

        {/* Export Active Palette */}
        <div className="pt-1 space-y-1.5">
          <span className="text-[11px] text-slate-400 block">
            Export Current Palette
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { format: 'jasc-pal', label: 'JASC .PAL' },
                { format: 'riff-pal', label: 'RIFF .PAL' },
                { format: 'gpl', label: 'GIMP .GPL' },
              ] as { format: PaletteExportFormat; label: string }[]
            ).map((btn) => (
              <button
                key={btn.format}
                onClick={() => {
                  const paletteToExport =
                    activePalette && activePalette.length === (settings.bitDepth === 4 ? 16 : 256)
                      ? activePalette
                      : getPaletteByPreset(settings.palettePreset);
                  const baseName = settings.palettePreset.startsWith('custom')
                    ? imageName
                    : settings.palettePreset;
                  downloadPaletteFile(
                    paletteToExport,
                    btn.format,
                    baseName,
                    getPalettePresetLabel(settings.palettePreset)
                  );
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors whitespace-nowrap"
              >
                <Download className="w-3 h-3 text-amber-400 shrink-0" />
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* 5. Preprocessing (Brightness, Contrast, Saturation) */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          Image Adjustments
        </label>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Brightness</span>
              <span className="font-mono">{settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={settings.brightness}
              onChange={(e) => onChange({ brightness: parseInt(e.target.value) })}
              className="w-full accent-amber-500 h-1 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Contrast</span>
              <span className="font-mono">{settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={settings.contrast}
              onChange={(e) => onChange({ contrast: parseInt(e.target.value) })}
              className="w-full accent-amber-500 h-1 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Saturation</span>
              <span className="font-mono">{settings.saturation > 0 ? `+${settings.saturation}` : settings.saturation}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={settings.saturation}
              onChange={(e) => onChange({ saturation: parseInt(e.target.value) })}
              className="w-full accent-amber-500 h-1 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* 6. Display & Retro Options */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-1.5">
          <Tv className="w-3.5 h-3.5 text-amber-400" />
          Display &amp; CRT Simulation
        </label>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => onChange({ correctDosAspect: !settings.correctDosAspect })}
            className={`p-2 rounded border text-left transition-colors ${
              settings.correctDosAspect
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <div className="font-medium">4:3 DOS CRT Aspect</div>
            <div className="text-[10px] text-slate-400">1.2x Tall Pixels</div>
          </button>

          <button
            onClick={() => onChange({ crtFilter: !settings.crtFilter })}
            className={`p-2 rounded border text-left transition-colors ${
              settings.crtFilter
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <div className="font-medium">CRT Scanlines</div>
            <div className="text-[10px] text-slate-400">Phosphor Lines</div>
          </button>

          <button
            onClick={() => onChange({ pixelGrid: !settings.pixelGrid })}
            className={`p-2 rounded border text-left transition-colors ${
              settings.pixelGrid
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <div className="font-medium">Pixel Grid</div>
            <div className="text-[10px] text-slate-400">Sub-pixel borders</div>
          </button>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-1.5">
            <span className="text-[11px] text-slate-400 px-1">Zoom</span>
            {[1, 2, 4, 8].map((z) => (
              <button
                key={z}
                onClick={() => onChange({ zoom: z })}
                className={`flex-1 py-1 text-center font-mono text-[10px] rounded ${
                  settings.zoom === z
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
