import React, { useState, useRef, useEffect } from 'react';
import { ConversionResult } from '../types';
import { Play, RotateCcw, Pause, Terminal, Volume2, VolumeX, FastForward } from 'lucide-react';

interface DosEmulatorProps {
  result: ConversionResult | null;
  correctDosAspect: boolean;
  crtFilter: boolean;
}

export const DosEmulator: React.FC<DosEmulatorProps> = ({
  result,
  correctDosAspect,
  crtFilter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentY, setCurrentY] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'instant'>('normal');
  const [statusText, setStatusText] = useState('Type RUN or press F5 to execute LOADER.BAS');
  const animationFrameId = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio for retro beeps / disk clicks
  const playRetroClick = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio not permitted or failed
    }
  };

  const playCompleteChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio not permitted
    }
  };

  const stopExecution = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
  };

  const startExecution = () => {
    if (!result || !canvasRef.current) return;
    stopExecution();

    const canvas = canvasRef.current;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill screen with DOS background (Black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, result.width, result.height);

    setIsRunning(true);
    setIsPaused(false);
    setStatusText(`SCREEN ${result.bitDepth === 8 ? '13' : '12'}: OUT &H3C8 palette programmed. Loading scanlines...`);

    // In BMP bottom-up scanlines, y goes from height - 1 down to 0
    let curScanline = result.height - 1;

    if (speed === 'instant') {
      // Draw everything immediately
      const imgData = ctx.createImageData(result.width, result.height);
      const out = imgData.data;
      for (let i = 0; i < result.indexedPixels.length; i++) {
        const col = result.palette[result.indexedPixels[i]] || { r: 0, g: 0, b: 0 };
        out[i * 4] = col.r;
        out[i * 4 + 1] = col.g;
        out[i * 4 + 2] = col.b;
        out[i * 4 + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      setIsRunning(false);
      setCurrentY(0);
      setStatusText(`LOADER.BAS finished successfully in SCREEN ${result.bitDepth === 8 ? '13' : '12'}!`);
      playCompleteChime();
      return;
    }

    const linesPerTick = speed === 'fast' ? 4 : 1;

    const step = () => {
      for (let l = 0; l < linesPerTick; l++) {
        if (curScanline < 0) {
          setIsRunning(false);
          setStatusText(`LOADER.BAS finished successfully in SCREEN ${result.bitDepth === 8 ? '13' : '12'}!`);
          playCompleteChime();
          return;
        }

        // Render one scanline at curScanline
        const lineImgData = ctx.createImageData(result.width, 1);
        const data = lineImgData.data;

        for (let x = 0; x < result.width; x++) {
          const idx = curScanline * result.width + x;
          const colIdx = result.indexedPixels[idx];
          const col = result.palette[colIdx] || { r: 0, g: 0, b: 0 };
          data[x * 4] = col.r;
          data[x * 4 + 1] = col.g;
          data[x * 4 + 2] = col.b;
          data[x * 4 + 3] = 255;
        }

        ctx.putImageData(lineImgData, 0, curScanline);
        setCurrentY(curScanline);
        curScanline--;
      }

      if (curScanline % 8 === 0) {
        playRetroClick();
        setStatusText(`Decoding ${result.compression} scanline Y = ${curScanline}...`);
      }

      animationFrameId.current = requestAnimationFrame(step);
    };

    animationFrameId.current = requestAnimationFrame(step);
  };

  // Draw initial state when result changes
  useEffect(() => {
    if (result && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = result.width;
      canvas.height = result.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, result.width, result.height);
      }
    }
    return () => stopExecution();
  }, [result]);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <Terminal className="w-12 h-12 mb-3 text-slate-600" />
        <p>No image loaded. Please upload or choose a preset to test the emulator.</p>
      </div>
    );
  }

  const aspectStyle: React.CSSProperties = correctDosAspect
    ? { transform: 'scaleY(1.2)', transformOrigin: 'top center' }
    : {};

  return (
    <div className="space-y-4">
      {/* Emulator Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={startExecution}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN (F5)</span>
            </button>
          ) : (
            <button
              onClick={stopExecution}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>STOP</span>
            </button>
          )}

          <button
            onClick={() => {
              stopExecution();
              startExecution();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
          <span className="text-slate-500 px-2 text-[11px]">Speed:</span>
          {(['normal', 'fast', 'instant'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 rounded transition-colors uppercase text-[10px] font-bold ${
                speed === s
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            soundEnabled
              ? 'bg-slate-800 text-amber-300 border-amber-500/40'
              : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>PC Speaker Audio</span>
        </button>
      </div>

      {/* Retro CRT Monitor Bezel */}
      <div className="relative rounded-2xl p-6 bg-gradient-to-b from-slate-800 to-slate-900 border-4 border-slate-700 shadow-2xl overflow-hidden">
        {/* QBasic Blue Header */}
        <div className="bg-[#0000a8] text-white px-3 py-1 text-xs font-mono flex items-center justify-between border-b-2 border-slate-600 mb-3 select-none">
          <span className="font-bold">File  Edit  View  Search  Run  Debug  Options</span>
          <span>MS-DOS QBasic</span>
        </div>

        {/* CRT Screen Display */}
        <div
          className={`relative bg-black rounded-lg border-2 border-slate-950 flex items-center justify-center p-4 min-h-[380px] overflow-hidden ${
            crtFilter ? 'crt-screen' : ''
          }`}
        >
          <div style={aspectStyle}>
            <canvas
              ref={canvasRef}
              className="max-h-[360px] object-contain block border border-slate-900"
              style={{
                imageRendering: 'pixelated',
                width: `${result.width * 2}px`,
                maxWidth: '100%',
              }}
            />
          </div>
        </div>

        {/* DOS Terminal Status Line */}
        <div className="mt-3 bg-black border border-slate-800 rounded p-2.5 font-mono text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">&gt;</span>
            <span className="tracking-wide">{statusText}</span>
          </div>
          {isRunning && (
            <span className="text-slate-500 text-[11px]">
              Scanline Y: {currentY} / {result.height}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
