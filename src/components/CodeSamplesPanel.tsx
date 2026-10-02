import React, { useState } from 'react';
import { ConversionResult } from '../types';
import {
  generateQBasicLoaderCode,
  generateQBasicSaverCode,
  generateQBasicDataCode,
  generateQBasicPutSpriteCode,
  generateQBasicBsaveCode,
} from '../lib/qbasicGenerators';
import { Copy, Check, Download, FileCode, Terminal, HelpCircle } from 'lucide-react';

interface CodeSamplesPanelProps {
  result: ConversionResult | null;
  filename?: string;
}

export const CodeSamplesPanel: React.FC<CodeSamplesPanelProps> = ({
  result,
  filename = 'IMAGE.BMP',
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'loader' | 'saver' | 'data' | 'sprite' | 'bsave'>('loader');
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <FileCode className="w-12 h-12 mb-3 text-slate-600" />
        <p>No conversion data available yet. Please select or upload an image.</p>
      </div>
    );
  }

  let code = '';
  let tabTitle = '';
  let description = '';

  switch (activeCodeTab) {
    case 'loader':
      code = generateQBasicLoaderCode(result, filename);
      tabTitle = 'LOADER.BAS';
      description = `Complete binary BMP file loader for QBasic 1.1 / QuickBASIC 4.5. Reads BITMAPFILEHEADER & BITMAPINFOHEADER, programs VGA DAC palette via OUT &H3C8/&H3C9, and unpacks ${result.bitDepth}-bit ${result.compression} scanlines.`;
      break;
    case 'saver':
      code = generateQBasicSaverCode(result);
      tabTitle = 'SAVER.BAS';
      description = `QBasic subroutine SUB SaveScreenToBmp that captures the active SCREEN ${result.bitDepth === 8 ? '13' : '12'} graphics buffer, reads VGA palette from INP(&H3C7/&H3C9), and writes a compliant Windows BMP file.`;
      break;
    case 'data':
      code = generateQBasicDataCode(result);
      tabTitle = 'DATA_LOADER.BAS';
      description = `Self-contained executable program. Stores palette and pixel data in BASIC DATA statements so you don't even need an external .BMP file to run it in DOSBox or QBasic!`;
      break;
    case 'sprite':
      code = generateQBasicPutSpriteCode(result);
      tabTitle = 'PUT_SPRITE.BAS';
      description = `Calculates DIM Sprite%(...) array sizes for QuickBASIC PUT/GET format. Formats the 4-byte header (width in bits, height in scanlines) and demonstrates blitting.`;
      break;
    case 'bsave':
      code = generateQBasicBsaveCode(result);
      tabTitle = 'BLOAD_BSAVE.BAS';
      description = `QuickBASIC native binary memory blitter. Demonstrates DEF SEG = &HA000 and BLOAD for instantaneous full-screen drawing.`;
      break;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = tabTitle;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = code.split('\n');

  return (
    <div className="space-y-4">
      {/* Code Sample Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'loader', label: '1. Binary BMP Loader (LOADER.BAS)' },
              { id: 'saver', label: '2. BMP Screen Saver (SAVER.BAS)' },
              { id: 'data', label: '3. Self-Contained DATA Loader' },
              { id: 'sprite', label: '4. PUT/GET Sprite Array' },
              { id: 'bsave', label: '5. BLOAD / BSAVE Blitter' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveCodeTab(t.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                activeCodeTab === t.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
              showLineNumbers
                ? 'bg-slate-800 text-amber-300 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Lines
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {tabTitle}</span>
          </button>
        </div>
      </div>

      {/* Description Callout */}
      <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex items-start gap-2.5 text-xs text-slate-300">
        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{description}</p>
      </div>

      {/* Code Display Area */}
      <div className="relative rounded-xl border border-slate-800 bg-[#07090e] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
            <span className="ml-2 text-slate-200 font-semibold">{tabTitle}</span>
          </div>
          <span>MS-DOS QBasic / QB64</span>
        </div>

        <div className="p-4 overflow-x-auto max-h-[580px] font-mono text-xs leading-relaxed select-text">
          <pre className="text-slate-200">
            {lines.map((line, idx) => {
              // Basic syntax highlight heuristics
              const isComment = line.trim().startsWith("'") || line.trim().startsWith('REM');
              const isHeader = line.includes('===');

              return (
                <div key={idx} className="flex hover:bg-slate-800/30 -mx-4 px-4">
                  {showLineNumbers && (
                    <span className="text-slate-600 select-none w-10 shrink-0 text-right pr-4">
                      {idx + 1}
                    </span>
                  )}
                  <span
                    className={
                      isComment
                        ? 'text-emerald-400/90 italic'
                        : isHeader
                        ? 'text-amber-400/80 font-bold'
                        : 'text-slate-200'
                    }
                  >
                    {line}
                  </span>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    </div>
  );
};
