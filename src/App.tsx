import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveTab,
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
import { BatchProcessor } from './components/BatchProcessor';
import { createSampleImage } from './lib/sampleImages';
import { convertImageToBmp } from './lib/converter';
import { generateQBasicLoaderCode } from './lib/qbasicGenerators';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
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
  const processConversion = useCallback(async () => {
    if (!originalDataUrl) return;

    setIsProcessing(true);
    try {
      const { result: converted } = await convertImageToBmp(originalDataUrl, settings);
      setResult((prev) => {
        if (prev?.bmpUrl) URL.revokeObjectURL(prev.bmpUrl);
        return converted;
      });
    } catch (err) {
      console.error('Conversion failed:', err);
    } finally {
      setIsProcessing(false);
    }
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

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-[#0f1118] border-b border-slate-800 overflow-x-auto">
        {(
          [
            { id: 'editor', label: 'Editor' },
            { id: 'batch', label: 'Batch ZIP' },
            { id: 'code', label: '.BAS Code' },
            { id: 'inspector', label: 'Inspector' },
            { id: 'emulator', label: 'DOS' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Source & Conversion Controls */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#10131d] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>{activeTab === 'batch' ? 'Batch Parameters' : 'Source & Parameters'}</span>
              {isProcessing && (
                <span className="text-[11px] font-mono text-amber-400 animate-pulse">
                  Processing...
                </span>
              )}
            </h2>

            {activeTab !== 'batch' && (
              <>
                <ImageUploader
                  onImageSelected={handleImageSelected}
                  currentImageName={currentImageName}
                  originalWidth={originalWidth}
                  originalHeight={originalHeight}
                />

                <hr className="border-slate-800" />
              </>
            )}

            <EditorControls
              settings={settings}
              onChange={handleUpdateSettings}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              activePalette={result?.palette}
              imageName={currentImageName}
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
                imageName={currentImageName}
              />
            )}

            {activeTab === 'batch' && (
              <BatchProcessor
                settings={settings}
                onInspectItem={(dataUrl, name) => {
                  handleImageSelected(dataUrl, name);
                  setActiveTab('editor');
                }}
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
