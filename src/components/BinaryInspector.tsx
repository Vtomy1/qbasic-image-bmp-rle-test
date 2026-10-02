import React, { useState } from 'react';
import { ConversionResult } from '../types';
import { Cpu, FileText, Database, Layers, Check, Copy } from 'lucide-react';

interface BinaryInspectorProps {
  result: ConversionResult | null;
}

export const BinaryInspector: React.FC<BinaryInspectorProps> = ({ result }) => {
  const [selectedSection, setSelectedSection] = useState<'all' | 'fileHeader' | 'infoHeader' | 'palette' | 'data'>('all');
  const [copiedHex, setCopiedHex] = useState(false);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <Cpu className="w-12 h-12 mb-3 text-slate-600" />
        <p>No BMP binary data available. Load an image first.</p>
      </div>
    );
  }

  const { fileHeader, infoHeader, bmpBuffer, rlePackets } = result;
  const numColors = infoHeader.biBitCount === 8 ? 256 : 16;
  const paletteBytes = numColors * 4;
  const pixelDataOffset = 14 + 40 + paletteBytes;

  // Format hex dump (first 512 bytes or selected section)
  const hexLines: { offset: number; hexStr: string; asciiStr: string; section: string }[] = [];
  const maxBytesToDisplay = Math.min(bmpBuffer.length, 1024);

  for (let i = 0; i < maxBytesToDisplay; i += 16) {
    let hexStr = '';
    let asciiStr = '';
    const end = Math.min(i + 16, maxBytesToDisplay);

    for (let j = i; j < end; j++) {
      const b = bmpBuffer[j];
      hexStr += b.toString(16).padStart(2, '0').toUpperCase() + ' ';
      // ASCII printable range
      asciiStr += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
    }

    // Pad last line if < 16 bytes
    while (hexStr.length < 48) {
      hexStr += '   ';
    }

    let section = 'data';
    if (i < 14) section = 'fileHeader';
    else if (i < 54) section = 'infoHeader';
    else if (i < pixelDataOffset) section = 'palette';

    hexLines.push({
      offset: i,
      hexStr: hexStr.trimEnd(),
      asciiStr,
      section,
    });
  }

  const copyFullHex = () => {
    let output = '';
    for (let i = 0; i < bmpBuffer.length; i += 16) {
      const chunk = Array.from(bmpBuffer.slice(i, i + 16))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      output += `${i.toString(16).padStart(8, '0')}: ${chunk}\n`;
    }
    navigator.clipboard.writeText(output);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BITMAPFILEHEADER */}
        <div
          onClick={() => setSelectedSection('fileHeader')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedSection === 'fileHeader'
              ? 'bg-amber-500/10 border-amber-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-amber-400">
              0x00 - 0x0D (14 Bytes)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              BITMAPFILEHEADER
            </span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">bfType (2B):</span>
              <span className="text-white font-bold">{fileHeader.bfType} (0x4D42)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">bfSize (4B):</span>
              <span className="text-white">{fileHeader.bfSize.toLocaleString()} bytes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">bfOffBits (4B):</span>
              <span className="text-emerald-400">{fileHeader.bfOffBits} (0x{fileHeader.bfOffBits.toString(16).toUpperCase()})</span>
            </div>
          </div>
        </div>

        {/* BITMAPINFOHEADER */}
        <div
          onClick={() => setSelectedSection('infoHeader')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedSection === 'infoHeader'
              ? 'bg-amber-500/10 border-amber-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-amber-400">
              0x0E - 0x35 (40 Bytes)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              BITMAPINFOHEADER
            </span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">biWidth × biHeight:</span>
              <span className="text-white">{infoHeader.biWidth} × {infoHeader.biHeight} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">biBitCount (2B):</span>
              <span className="text-amber-300 font-bold">{infoHeader.biBitCount}-bit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">biCompression (4B):</span>
              <span className="text-white font-bold">
                {infoHeader.biCompression} ({infoHeader.biCompressionName})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">biSizeImage (4B):</span>
              <span className="text-white">{infoHeader.biSizeImage.toLocaleString()} bytes</span>
            </div>
          </div>
        </div>

        {/* PALETTE & PAYLOAD */}
        <div
          onClick={() => setSelectedSection('palette')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedSection === 'palette'
              ? 'bg-amber-500/10 border-amber-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-amber-400">
              0x36 - 0x{pixelDataOffset.toString(16).toUpperCase()} ({paletteBytes} Bytes)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              RGBQUAD Palette Table
            </span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Entries:</span>
              <span className="text-white font-bold">{numColors} Colors (4B each)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Structure:</span>
              <span className="text-slate-300">Blue, Green, Red, 0x00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payload Offset:</span>
              <span className="text-emerald-400 font-bold">Byte #{pixelDataOffset}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RLE Packet Stream Breakdown (if RLE enabled) */}
      {rlePackets && rlePackets.length > 0 && (
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                RLE Stream Decompression Inspector ({rlePackets.length} Packets)
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Sample of first 20 RLE packets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Stream Offset</th>
                  <th className="py-2 px-3">Opcode Type</th>
                  <th className="py-2 px-3">Pixel Coordinates</th>
                  <th className="py-2 px-3">Raw Bytes</th>
                  <th className="py-2 px-3">Decoded Effect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {rlePackets.slice(0, 20).map((pkt, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400">
                      0x{pkt.offset.toString(16).padStart(4, '0').toUpperCase()}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          pkt.type === 'encoded'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : pkt.type === 'absolute'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : pkt.type === 'eol'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {pkt.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      ({pkt.x}, {pkt.y})
                    </td>
                    <td className="py-2 px-3 text-amber-300">
                      {pkt.bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {pkt.type === 'encoded' && `Repeat Color #${pkt.colorIndex} for ${pkt.count} pixels`}
                      {pkt.type === 'absolute' && `Uncompressed run of ${pkt.count} pixels`}
                      {pkt.type === 'eol' && 'End of scanline (0x00, 0x00) -> Next line up'}
                      {pkt.type === 'eob' && 'End of bitmap stream (0x00, 0x01) -> Done'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hex Dump Viewer */}
      <div className="bg-[#08090e] border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-slate-300">HEX DUMP</span>
            <span className="text-slate-500">
              (Viewing first {maxBytesToDisplay} of {bmpBuffer.length} bytes)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyFullHex}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors text-xs font-mono"
            >
              {copiedHex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Hex Stream</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 font-mono text-xs overflow-x-auto leading-relaxed max-h-[400px]">
          {hexLines.map((line, idx) => {
            const isHighlight =
              selectedSection === 'all' ||
              (selectedSection === line.section);

            return (
              <div
                key={idx}
                className={`flex gap-4 py-0.5 hover:bg-slate-800/40 rounded px-1 transition-colors ${
                  !isHighlight ? 'opacity-30' : ''
                }`}
              >
                {/* Offset */}
                <span className="text-amber-500/80 select-none w-20">
                  {line.offset.toString(16).padStart(8, '0').toUpperCase()}:
                </span>
                {/* Hex Bytes */}
                <span className="text-slate-300 tracking-wider flex-1">
                  {line.hexStr}
                </span>
                {/* ASCII */}
                <span className="text-slate-500 border-l border-slate-800 pl-4 w-36 select-none">
                  {line.asciiStr}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
