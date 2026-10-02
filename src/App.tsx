import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ConversionResult,
  EditorSettings,
} from './types';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { EditorControls } from './components/EditorControls';
import { PreviewPanel } from './components/PreviewPanel';
import { BinaryInspector } from './components/BinaryInspector';
import { CodeSamplesPanel } from './components/CodeSamplesPanel';
import { DosEmulator } from './components/DosEmulator';
import { createSampleImage } from './lib/sampleImages';
import { getPaletteByPreset } from './lib/palettes';
import { ditherImage } from './lib/dithering';
import { encodeBmp } from './lib/bmpEncoder';
import { generateQBasicLoaderCode } from './lib/qbasicGenerators';

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'code' | 'inspector' | 'emulator'>('editor');
  const [originalDataUrl, setOriginalDataUrl] = useState<string>('');
  const [currentImageName, setCurrentImageName] = useState<string>('cyber_starfighter.png');
  const [originalWidth, setOriginalWidth] = useState<number>(160);
  const [originalHeight, setOriginalHeight] = useState<number>(160);

  const [settings, setSettings] = useState<EditorSettings>({
    screenPreset: 'screen13',
    width: 320,
    height: 200,
    bitDepth: 8,
    compression: 'BI_RGB',
    ditherMethod: 'floyd-steinberg',
    ditherStrength: 0.8,
    palettePreset: 'vga256',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    maintainAspect: false,
    correctDosAspect: true,
    crtFilter: false,
    pixelGrid: false,
    zoom: 2,
  });

  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const processTimeoutRef = useRef<number | null>(null);

  // Initialize with default retro sample on first load
  useEffect(() => {
    const sample = createSampleImage('spaceship');
    setOriginalDataUrl(sample.dataUrl);
    setCurrentImageName(`${sample.name}.png`);
    setOriginalWidth(sample.width);
    setOriginalHeight(sample.height);
  }, []);

  // Process conversion pipeline
  const processConversion = useCallback(() => {
    if (!originalDataUrl) return;

    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = settings.width;
        offCanvas.height = settings.height;
        const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Draw scaled image (crisp pixelated for retro sprites)
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, settings.width, settings.height);

        const rawImageData = ctx.getImageData(0, 0, settings.width, settings.height);

        // 1. Get Target Palette
        const palette = getPaletteByPreset(settings.palettePreset, rawImageData);

        // 2. Dither and Quantize
        const { indexedPixels, outputImageData } = ditherImage(rawImageData, {
          width: settings.width,
          height: settings.height,
          method: settings.ditherMethod,
          strength: settings.ditherStrength,
          palette,
          brightness: settings.brightness,
          contrast: settings.contrast,
          saturation: settings.saturation,
        });

        // 3. Encode BMP File (Headers, Palette, Scanlines/RLE)
        const bmpResult = encodeBmp({
          width: settings.width,
          height: settings.height,
          bitDepth: settings.bitDepth,
          compression: settings.compression,
          palette,
          indexedPixels,
        });

        // 4. Create Preview Canvas Data URL
        const outCanvas = document.createElement('canvas');
        outCanvas.width = settings.width;
        outCanvas.height = settings.height;
        const outCtx = outCanvas.getContext('2d');
        if (outCtx) {
          outCtx.putImageData(outputImageData, 0, 0);
        }
        const processedDataUrl = outCanvas.toDataURL('image/png');

        // 5. Create Blob and Object URL for download
        const bmpBlob = new Blob([bmpResult.buffer as unknown as BlobPart], { type: 'image/bmp' });
        const bmpUrl = URL.createObjectURL(bmpBlob);

        setResult({
          width: settings.width,
          height: settings.height,
          bitDepth: settings.bitDepth,
          compression: settings.compression,
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
        });
      } catch (err) {
        console.error('Conversion failed:', err);
      } finally {
        setIsProcessing(false);
      }
    };
    img.src = originalDataUrl;
  }, [originalDataUrl, settings]);

  // Debounced trigger for smooth UI interaction
  useEffect(() => {
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
    }
    processTimeoutRef.current = window.setTimeout(() => {
      processConversion();
    }, 60);

    return () => {
      if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
    };
  }, [processConversion]);

  const handleImageSelected = (dataUrl: string, name?: string) => {
    const img = new Image();
    img.onload = () => {
      setOriginalWidth(img.naturalWidth || img.width);
      setOriginalHeight(img.naturalHeight || img.height);
      setCurrentImageName(name || 'custom_image.png');
      setOriginalDataUrl(dataUrl);
    };
    img.src = dataUrl;
  };

  const handleUpdateSettings = (newSettings: Partial<EditorSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleDownloadBmp = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.bmpUrl;
    const baseName = currentImageName.replace(/\.[^/.]+$/, '').toUpperCase();
    link.download = `${baseName || 'IMAGE'}.BMP`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBas = () => {
    if (!result) return;
    const baseName = currentImageName.replace(/\.[^/.]+$/, '').toUpperCase();
    const bmpName = `${baseName || 'IMAGE'}.BMP`;
    const basCode = generateQBasicLoaderCode(result, bmpName);
    const blob = new Blob([basCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LOADER.BAS';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 3-Zone Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadBmp={handleDownloadBmp}
        onDownloadBas={handleDownloadBas}
        hasImage={!!result}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Source & Conversion Controls */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#10131d] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Source &amp; Parameters</span>
              {isProcessing && (
                <span className="text-[11px] font-mono text-amber-400 animate-pulse">
                  Processing...
                </span>
              )}
            </h2>

            <ImageUploader
              onImageSelected={handleImageSelected}
              currentImageName={currentImageName}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
            />

            <hr className="border-slate-800" />

            <EditorControls
              settings={settings}
              onChange={handleUpdateSettings}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
            />
          </div>
        </aside>

        {/* Right Column: Tabbed Viewport */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="bg-[#10131d] border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col">
            {activeTab === 'editor' && (
              <PreviewPanel
                originalDataUrl={originalDataUrl}
                result={result}
                settings={settings}
                onZoomChange={(z) => handleUpdateSettings({ zoom: z })}
              />
            )}

            {activeTab === 'code' && (
              <CodeSamplesPanel
                result={result}
                filename={`${currentImageName.replace(/\.[^/.]+$/, '').toUpperCase() || 'IMAGE'}.BMP`}
              />
            )}

            {activeTab === 'inspector' && (
              <BinaryInspector result={result} />
            )}

            {activeTab === 'emulator' && (
              <DosEmulator
                result={result}
                correctDosAspect={settings.correctDosAspect}
                crtFilter={settings.crtFilter}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
