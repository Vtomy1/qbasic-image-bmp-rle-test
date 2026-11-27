import React, { useState, useRef } from 'react';
import { ConversionResult, EditorSettings, RGBColor } from '../types';
import {
  Layers,
  ArrowRightLeft,
  Download,
} from 'lucide-react';
import {
  downloadPaletteFile,
  getPalettePresetLabel,
  PaletteExportFormat,
} from '../lib/paletteExport';

interface PreviewPanelProps {
  originalDataUrl: string;
  result: ConversionResult | null;
  settings: EditorSettings;
  onZoomChange: (zoom: number) => void;
  imageName?: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  originalDataUrl,
  result,
  settings,
  onZoomChange,
  imageName = 'palette',
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'retro' | 'side-by-side'>('split');
  const [splitPos, setSplitPos] = useState(50); // percentage 0-100
  const [hoveredColor, setHoveredColor] = useState<{ color: RGBColor; index: number } | null>(null);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number; index: number; hex: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplit = useRef(false);

  // Handle split slider drag
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingSplit.current = true;
    updateSplitPos(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSplit.current) {
      updateSplitPos(e.clientX);
    }
  };

  const handleMouseUp = () => {
    isDraggingSplit.current = false;
  };

  const updateSplitPos = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setSplitPos(pos);
  };

  // Inspect pixel on canvas hover
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!result) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const normX = clientX / rect.width;
    const normY = clientY / rect.height;

    const pxX = Math.floor(normX * result.width);
    const pxY = Math.floor(normY * result.height);

    if (pxX >= 0 && pxX < result.width && pxY >= 0 && pxY < result.height) {
      const idx = pxY * result.width + pxX;
      const colIdx = result.indexedPixels[idx];
      const color = result.palette[colIdx] || { hex: '#000000', r: 0, g: 0, b: 0, vgaR: 0, vgaG: 0, vgaB: 0 };
      setHoveredPixel({
        x: pxX,
        y: pxY,
        index: colIdx,
        hex: color.hex,
      });
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPixel(null);
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-300">No Image Loaded</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Upload an image or pick a retro sample preset from the left panel to begin.
        </p>
      </div>
    );
  }

  // DOS SCREEN 13 CRT pixel aspect ratio (pixels were ~1.2x taller in 320x200 on 4:3 monitor)
  const aspectStyle: React.CSSProperties = settings.correctDosAspect
    ? { transform: 'scaleY(1.2)', transformOrigin: 'top center' }
    : {};

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Toolbar / Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'split' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('retro')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'retro' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Retro Preview
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'side-by-side' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side
            </button>
          </div>

          {/* Pixel Inspector Tag */}
          {hoveredPixel && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-xs">
              <span className="text-slate-400">
                ({hoveredPixel.x}, {hoveredPixel.y})
              </span>
              <div
                className="w-3 h-3 rounded-sm border border-slate-700"
                style={{ backgroundColor: hoveredPixel.hex }}
              />
              <span className="text-amber-400">Color #{hoveredPixel.index}</span>
              <span className="text-slate-500">{hoveredPixel.hex}</span>
            </div>
          )}
        </div>

        {/* Compression & Format Stats */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="text-slate-400">
            Format: <span className="text-white font-semibold">{result.bitDepth}-bit {result.compression}</span>
          </div>
          <span className="text-slate-600">&bull;</span>
          <div className="text-slate-400">
            Size: <span className="text-amber-400 font-semibold">{result.bmpSize.toLocaleString()} bytes</span>
          </div>
          {result.compression !== 'BI_RGB' && (
            <>
              <span className="text-slate-600">&bull;</span>
              <div className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {result.compressionRatio > 0 ? `-${result.compressionRatio}% RLE saved` : 'RLE encoded'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative flex-1 min-h-[440px] bg-[#08090d] border border-slate-800 rounded-xl overflow-hidden select-none flex items-center justify-center p-4 ${
          settings.crtFilter ? 'crt-screen' : ''
        }`}
      >
        {/* Background Retro Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* SPLIT VIEW MODE */}
        {viewMode === 'split' && (
          <div className="relative inline-block max-w-full max-h-[500px] shadow-2xl rounded border border-slate-800 overflow-hidden">
            {/* Processed Retro Image (Base) */}
            <div
              style={{
                imageRendering: 'pixelated',
                ...aspectStyle,
              }}
              className="relative"
            >
              <img
                src={result.processedDataUrl}
                alt="QBasic BMP Processed"
                className="max-w-full max-h-[460px] object-contain block"
                style={{
                  imageRendering: 'pixelated',
                  width: `${result.width * settings.zoom}px`,
                  maxWidth: '100%',
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
              />

              {/* Pixel grid overlay */}
              {settings.pixelGrid && settings.zoom >= 3 && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                    backgroundSize: `${settings.zoom}px ${settings.zoom}px`,
                  }}
                />
              )}
            </div>

            {/* Original Image (Clipped Overlay) */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
              style={{ width: `${splitPos}%`, borderRight: '2px solid #f59e0b' }}
            >
              <div style={aspectStyle}>
                <img
                  src={originalDataUrl}
                  alt="Original Source"
                  className="max-h-[460px] object-contain block"
                  style={{
                    width: `${result.width * settings.zoom}px`,
                    maxWidth: 'none',
                  }}
                />
              </div>
            </div>

            {/* Split Drag Handle */}
            <div
              onMouseDown={handleMouseDown}
              style={{ left: `${splitPos}%` }}
              className="absolute top-0 bottom-0 -ml-3 w-6 flex items-center justify-center cursor-ew-resize z-20 group"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <ArrowRightLeft className="w-3 h-3" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-slate-300 pointer-events-none">
              Original
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-amber-400 pointer-events-none">
              QBasic ({result.bitDepth}-bit)
            </div>
          </div>
        )}

        {/* RETRO PREVIEW ONLY */}
        {viewMode === 'retro' && (
          <div
            style={{
              imageRendering: 'pixelated',
              ...aspectStyle,
            }}
            className="relative shadow-2xl rounded border border-slate-800 overflow-hidden"
          >
            <img
              src={result.processedDataUrl}
              alt="QBasic BMP Retro Preview"
              className="max-h-[460px] object-contain block"
              style={{
                imageRendering: 'pixelated',
                width: `${result.width * settings.zoom}px`,
                maxWidth: '100%',
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
            />
            {settings.pixelGrid && settings.zoom >= 3 && (
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                  backgroundSize: `${settings.zoom}px ${settings.zoom}px`,
                }}
              />
            )}
          </div>
        )}

        {/* SIDE-BY-SIDE VIEW */}
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-full">
            <div className="space-y-1.5 text-center">
              <span className="text-xs font-mono text-slate-400">Original Source</span>
              <div className="border border-slate-800 rounded bg-black/40 p-2 flex items-center justify-center">
                <img
                  src={originalDataUrl}
                  alt="Original"
                  className="max-h-[380px] max-w-full object-contain"
                />
              </div>
            </div>
            <div className="space-y-1.5 text-center">
              <span className="text-xs font-mono text-amber-400">
                QBasic Dithered ({result.bitDepth}-Bit / {result.compression})
              </span>
              <div
                className="border border-slate-800 rounded bg-black/40 p-2 flex items-center justify-center"
                style={aspectStyle}
              >
                <img
                  src={result.processedDataUrl}
                  alt="Retro Output"
                  style={{ imageRendering: 'pixelated' }}
                  className="max-h-[380px] max-w-full object-contain"
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={handleCanvasMouseLeave}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Color Palette Swatch Bar */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-200">
              Palette Swatches ({result.palette.length} Colors)
            </span>
            {hoveredColor ? (
              <div className="flex items-center gap-2 font-mono text-xs text-amber-300">
                <span>#{hoveredColor.index}</span>
                <span>{hoveredColor.color.hex}</span>
                <span className="text-slate-400">
                  RGB({hoveredColor.color.r}, {hoveredColor.color.g}, {hoveredColor.color.b})
                </span>
                <span className="text-white font-semibold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                  DAC: {hoveredColor.color.vgaR}, {hoveredColor.color.vgaG}, {hoveredColor.color.vgaB}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-mono">
                Hover swatch for VGA DAC (&amp;H3C8/&amp;H3C9)
              </span>
            )}
          </div>

          {/* Palette Export Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(
              [
                { format: 'jasc-pal', label: '.PAL (JASC)', title: 'Export as JASC-PAL (.pal) for Aseprite, Paint Shop Pro, GraphicsGale' },
                { format: 'riff-pal', label: '.PAL (RIFF)', title: 'Export as Microsoft RIFF (.pal) binary palette' },
                { format: 'gpl', label: '.GPL (GIMP)', title: 'Export as GIMP Palette (.gpl) for GIMP, GrafX2, Krita, Aseprite' },
              ] as { format: PaletteExportFormat; label: string; title: string }[]
            ).map((btn) => (
              <button
                key={btn.format}
                onClick={() => {
                  const baseName = settings.palettePreset.startsWith('custom')
                    ? imageName
                    : settings.palettePreset;
                  downloadPaletteFile(
                    result.palette,
                    btn.format,
                    baseName,
                    getPalettePresetLabel(settings.palettePreset)
                  );
                }}
                title={btn.title}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 border border-slate-700 transition-colors whitespace-nowrap"
              >
                <Download className="w-3 h-3 text-amber-400" />
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Swatch grid */}
        <div
          className={`grid gap-1 ${
            result.palette.length <= 16
              ? 'grid-cols-16'
              : 'grid-cols-[repeat(auto-fill,minmax(12px,1fr))]'
          } max-h-16 overflow-y-auto p-1 bg-slate-950 rounded border border-slate-800/80`}
        >
          {result.palette.map((c, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredColor({ color: c, index: i })}
              onMouseLeave={() => setHoveredColor(null)}
              className="h-4 rounded-sm border border-black/40 hover:scale-125 hover:z-10 hover:border-white transition-transform cursor-pointer"
              style={{ backgroundColor: c.hex }}
              title={`Color #${i} - ${c.hex} - DAC: ${c.vgaR},${c.vgaG},${c.vgaB}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
