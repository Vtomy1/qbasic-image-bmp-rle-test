import React, { useState } from 'react';
import { RGBColor } from '../types';

interface PalettePreviewProps {
  palette: RGBColor[];
}

export const PalettePreview: React.FC<PalettePreviewProps> = ({ palette }) => {
  const [hovered, setHovered] = useState<{ color: RGBColor; index: number } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const is16Color = palette.length <= 16;

  const handleCopyColor = (color: RGBColor, index: number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(color.hex).catch(() => {});
    }
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex((prev) => (prev === index ? null : prev));
    }, 1200);
  };

  return (
    <div className="space-y-2 pt-1">
      {/* Live RGB / DAC Readout Header */}
      <div className="flex items-center justify-between gap-2 min-h-[24px] text-[11px] font-mono tabular-nums">
        {hovered ? (
          <div className="flex items-center gap-2 text-slate-200 min-w-0 truncate">
            <span
              className="w-3.5 h-3.5 rounded-sm border border-white/30 shrink-0"
              style={{ backgroundColor: hovered.color.hex }}
            />
            <span className="text-amber-400 font-semibold">#{hovered.index}</span>
            <span className="text-slate-400">&middot;</span>
            <span className="text-white">
              RGB({hovered.color.r}, {hovered.color.g}, {hovered.color.b})
            </span>
            <span className="text-slate-400">&middot;</span>
            <span className="text-slate-300">{hovered.color.hex}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-slate-300 font-medium">{palette.length} colors</span>
            <span aria-hidden="true">&middot;</span>
            <span>Hover swatch for RGB</span>
          </div>
        )}

        {hovered && (
          <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
            {copiedIndex === hovered.index
              ? 'Copied hex'
              : `DAC ${hovered.color.vgaR},${hovered.color.vgaG},${hovered.color.vgaB}`}
          </span>
        )}
      </div>

      {/* Color Swatch Grid */}
      <div
        role="grid"
        aria-label={`Active ${palette.length}-color palette swatches`}
        onMouseLeave={() => setHovered(null)}
        className={`grid p-1.5 bg-slate-950 border border-slate-800 rounded-lg ${
          is16Color ? 'grid-cols-8 gap-1.5' : 'grid-cols-16 gap-0.5'
        }`}
      >
        {palette.map((color, index) => {
          const isActive = hovered?.index === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleCopyColor(color, index)}
              onMouseEnter={() => setHovered({ color, index })}
              onFocus={() => setHovered({ color, index })}
              onBlur={() => setHovered(null)}
              style={{ backgroundColor: color.hex }}
              title={`Index #${index} · RGB(${color.r}, ${color.g}, ${color.b}) · ${color.hex} · VGA DAC(${color.vgaR}, ${color.vgaG}, ${color.vgaB})`}
              aria-label={`Color ${index}: RGB ${color.r}, ${color.g}, ${color.b} (${color.hex})`}
              className={`${
                is16Color ? 'h-5 rounded-sm' : 'h-3.5 rounded-[2px]'
              } w-full border transition-transform duration-100 focus:outline-none ${
                isActive
                  ? 'scale-125 z-10 border-white ring-1 ring-amber-400 shadow-md'
                  : 'border-black/40 hover:scale-125 hover:z-10 hover:border-white'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
