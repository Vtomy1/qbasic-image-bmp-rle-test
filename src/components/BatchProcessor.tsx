import React, { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import {
  Archive,
  CheckCircle2,
  Clock,
  Eye,
  FileCode,
  FolderPlus,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { BatchItem, EditorSettings } from '../types';
import { convertImageToBmp, readImageFile, toDos83Filename } from '../lib/converter';
import {
  BatchManifestEntry,
  generateBatchQBasicLoaderCode,
} from '../lib/qbasicGenerators';
import { createSampleImage, SAMPLE_PRESETS } from '../lib/sampleImages';
import {
  exportPaletteToGpl,
  exportPaletteToJascPal,
  getPalettePresetLabel,
} from '../lib/paletteExport';

interface BatchProcessorProps {
  settings: EditorSettings;
  onInspectItem: (dataUrl: string, name: string) => void;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  settings,
  onInspectItem,
}) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isPackagingZip, setIsPackagingZip] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [basFilename, setBasFilename] = useState('LOADER.BAS');
  const [zipFilename, setZipFilename] = useState('QBASIC_BATCH.ZIP');
  const [includePalettesInZip, setIncludePalettesInZip] = useState(true);
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [lastConvertedSettingsSig, setLastConvertedSettingsSig] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSettingsSig = useMemo(
    () =>
      JSON.stringify({
        width: settings.width,
        height: settings.height,
        bitDepth: settings.bitDepth,
        useRleCompression: settings.useRleCompression,
        compression: settings.compression,
        ditherMethod: settings.ditherMethod,
        ditherStrength: settings.ditherStrength,
        palettePreset: settings.palettePreset,
        brightness: settings.brightness,
        contrast: settings.contrast,
        saturation: settings.saturation,
        maintainAspect: settings.maintainAspect,
      }),
    [settings]
  );

  const settingsChangedSinceRun =
    items.some((i) => i.status === 'done') &&
    lastConvertedSettingsSig !== '' &&
    lastConvertedSettingsSig !== currentSettingsSig;

  const addFiles = async (fileList: FileList | File[]) => {
    setUploadError(null);
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      setUploadError('No supported image files found. Please select PNG, JPG, WebP, BMP, or GIF files.');
      return;
    }

    const existingDosNames = new Set(items.map((item) => item.dosFilename.toUpperCase()));
    const newItems: BatchItem[] = [];

    for (const file of files) {
      try {
        const read = await readImageFile(file);
        const dosName = toDos83Filename(read.name, existingDosNames);
        existingDosNames.add(dosName);
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          originalName: read.name,
          dosFilename: dosName,
          originalDataUrl: read.dataUrl,
          originalWidth: read.width,
          originalHeight: read.height,
          status: 'queued',
        });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : `Failed to load ${file.name}`);
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  };

  const handleLoadBuiltInSamples = () => {
    setUploadError(null);
    const existingDosNames = new Set(items.map((item) => item.dosFilename.toUpperCase()));
    const added: BatchItem[] = SAMPLE_PRESETS.map((preset) => {
      const sample = createSampleImage(preset.id);
      const origName = `${preset.id}.png`;
      const dosName = toDos83Filename(origName, existingDosNames);
      existingDosNames.add(dosName);
      return {
        id: `${Date.now()}-${preset.id}-${Math.random().toString(36).slice(2, 6)}`,
        originalName: `${sample.name}.png`,
        dosFilename: dosName,
        originalDataUrl: sample.dataUrl,
        originalWidth: sample.width,
        originalHeight: sample.height,
        status: 'queued',
      };
    });
    setItems((prev) => [...prev, ...added]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleUpdateDosName = (id: string, rawVal: string) => {
    const cleaned = rawVal
      .toUpperCase()
      .replace(/\.BMP$/i, '')
      .replace(/[^A-Z0-9_]/g, '')
      .slice(0, 8);
    const finalName = `${cleaned || 'IMAGE'}.BMP`;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dosFilename: finalName } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.result?.bmpUrl) {
        URL.revokeObjectURL(target.result.bmpUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.result?.bmpUrl) {
        URL.revokeObjectURL(item.result.bmpUrl);
      }
    });
    setItems([]);
    setProgress({ done: 0, total: 0 });
    setLastConvertedSettingsSig('');
  };

  const runBatchConversion = async (onlyQueued = false) => {
    if (items.length === 0 || isConverting) return;

    const targetIds = new Set(
      items
        .filter((item) => (onlyQueued ? item.status === 'queued' || item.status === 'error' : true))
        .map((item) => item.id)
    );

    if (targetIds.size === 0) return;

    setIsConverting(true);
    setProgress({ done: 0, total: targetIds.size });

    let completed = 0;

    // Reset target items to queued
    setItems((prev) =>
      prev.map((item) =>
        targetIds.has(item.id)
          ? { ...item, status: 'queued', error: undefined }
          : item
      )
    );

    for (const item of items) {
      if (!targetIds.has(item.id)) continue;

      setItems((prev) =>
        prev.map((cur) => (cur.id === item.id ? { ...cur, status: 'processing' } : cur))
      );

      try {
        // Yield briefly to allow UI progress repaint on large batches
        await new Promise((r) => setTimeout(r, 15));
        const { result } = await convertImageToBmp(item.originalDataUrl, settings, {
          respectPerImageAspect: true,
        });

        setItems((prev) =>
          prev.map((cur) => {
            if (cur.id !== item.id) return cur;
            if (cur.result?.bmpUrl) URL.revokeObjectURL(cur.result.bmpUrl);
            return { ...cur, status: 'done', result, error: undefined };
          })
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((cur) =>
            cur.id === item.id
              ? {
                  ...cur,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Conversion failed',
                }
              : cur
          )
        );
      }

      completed++;
      setProgress({ done: completed, total: targetIds.size });
    }

    setLastConvertedSettingsSig(currentSettingsSig);
    setIsConverting(false);
  };

  const completedItems = useMemo(
    () => items.filter((item) => item.status === 'done' && item.result),
    [items]
  );

  const manifestEntries: BatchManifestEntry[] = useMemo(
    () =>
      completedItems.map((item) => ({
        dosFilename: item.dosFilename,
        originalName: item.originalName,
        width: item.result!.width,
        height: item.result!.height,
        bitDepth: item.result!.bitDepth,
        compression: item.result!.compression,
        bmpSize: item.result!.bmpSize,
      })),
    [completedItems]
  );

  const unifiedBasCode = useMemo(
    () => generateBatchQBasicLoaderCode(manifestEntries),
    [manifestEntries]
  );

  const totalRawBytes = completedItems.reduce(
    (acc, item) => acc + (item.result?.rawSize || 0),
    0
  );
  const totalBmpBytes = completedItems.reduce(
    (acc, item) => acc + (item.result?.bmpSize || 0),
    0
  );
  const totalSavedBytes = Math.max(0, totalRawBytes - totalBmpBytes);

  const handleDownloadZip = async () => {
    if (completedItems.length === 0 || isPackagingZip) return;
    setIsPackagingZip(true);

    try {
      const zip = new JSZip();

      // Deduplicate filenames inside the ZIP archive safely
      const usedZipNames = new Set<string>();
      const finalManifest: BatchManifestEntry[] = [];

      for (const item of completedItems) {
        let name = item.dosFilename.toUpperCase();
        if (usedZipNames.has(name)) {
          name = toDos83Filename(item.dosFilename, usedZipNames);
        }
        usedZipNames.add(name);

        zip.file(name, item.result!.bmpBuffer);
        finalManifest.push({
          dosFilename: name,
          originalName: item.originalName,
          width: item.result!.width,
          height: item.result!.height,
          bitDepth: item.result!.bitDepth,
          compression: item.result!.compression,
          bmpSize: item.result!.bmpSize,
        });
      }

      const normalizedBasName =
        (basFilename.trim().toUpperCase().replace(/[^A-Z0-9_.]/g, '') || 'LOADER.BAS').endsWith(
          '.BAS'
        )
          ? basFilename.trim().toUpperCase().replace(/[^A-Z0-9_.]/g, '') || 'LOADER.BAS'
          : `${basFilename.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'LOADER'}.BAS`;

      const basContent = generateBatchQBasicLoaderCode(finalManifest);
      zip.file(normalizedBasName, basContent);

      if (includePalettesInZip && completedItems.length > 0) {
        const paletteLabel = getPalettePresetLabel(settings.palettePreset);
        if (settings.palettePreset.startsWith('custom')) {
          completedItems.forEach((item, idx) => {
            const dosBase = finalManifest[idx].dosFilename.replace(/\.BMP$/i, '');
            const pal = item.result!.palette;
            zip.file(`${dosBase}.PAL`, exportPaletteToJascPal(pal));
            zip.file(`${dosBase}.GPL`, exportPaletteToGpl(pal, `${paletteLabel} (${dosBase})`));
          });
        } else {
          const sharedPal = completedItems[0].result!.palette;
          zip.file('PALETTE.PAL', exportPaletteToJascPal(sharedPal));
          zip.file('PALETTE.GPL', exportPaletteToGpl(sharedPal, paletteLabel));
        }
      }

      // Build plain-text README manifest
      const readmeLines = [
        'QBASIC BMP STUDIO - BATCH ARCHIVE MANIFEST',
        '==========================================',
        `Generated: ${new Date().toISOString()}`,
        `Total BMP Files: ${finalManifest.length}`,
        `Loader Script: ${normalizedBasName}`,
        '',
        'USAGE IN MS-DOS / DOSBOX / QBASIC / QB64:',
        '1. Extract all files into the same directory.',
        `2. Open ${normalizedBasName} in QBasic 1.1, QuickBASIC 4.5, or QB64.`,
        '3. Press F5 (Run) to view all converted BMPs in sequence.',
        '   Controls: SPACE / ENTER = Next, P = Previous, Q / ESC = Quit.',
        '',
        'INCLUDED FILES:',
        ...finalManifest.map(
          (m) =>
            `- ${m.dosFilename.padEnd(13)} <- ${m.originalName} (${m.width}x${m.height}, ${m.bitDepth}-bit ${m.compression}, ${m.bmpSize} bytes)`
        ),
        '',
      ];
      zip.file('README.TXT', readmeLines.join('\r\n'));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const outZipName = zipFilename.trim()
        ? zipFilename.trim().toLowerCase().endsWith('.zip')
          ? zipFilename.trim()
          : `${zipFilename.trim()}.zip`
        : 'qbasic_batch.zip';
      link.download = outZipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsPackagingZip(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(unifiedBasCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const queuedCount = items.filter((i) => i.status === 'queued' || i.status === 'error').length;

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Top Batch Header & Dropzone */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white font-mono">
            Batch BMP &amp; Unified Loader Builder
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Queue multiple images using the sidebar parameters ({settings.width}×{settings.height} · {settings.bitDepth}-bit · {settings.compression} · {settings.ditherMethod}) and bundle into a DOS-ready ZIP archive.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLoadBuiltInSamples}
            disabled={isConverting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Add 4 Retro Samples
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isConverting}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Add Images
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* Multi-file Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-700/80 hover:border-amber-500/50 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Drop multiple PNG, JPG, WebP, BMP, or GIF files here
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Filenames are automatically mapped to unique MS-DOS 8.3 names (e.g., <span className="font-mono text-slate-300">SPRITE01.BMP</span>) for QBasic 1.1 compatibility.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-amber-400 whitespace-nowrap">
          {items.length} {items.length === 1 ? 'file' : 'files'} queued
        </span>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {settingsChangedSinceRun && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
          <span>
            Conversion parameters changed since the last batch run. Re-convert to apply the updated palette, dithering, or dimensions.
          </span>
          <button
            onClick={() => runBatchConversion(false)}
            disabled={isConverting}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold whitespace-nowrap transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-convert All
          </button>
        </div>
      )}

      {/* Batch Queue Table or Empty State */}
      {items.length === 0 ? (
        <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center border border-slate-800 rounded-xl bg-slate-950/40 p-8 text-center">
          <Archive className="w-10 h-10 text-slate-600 mb-3" />
          <h4 className="text-sm font-semibold text-slate-200">Batch Queue is Empty</h4>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
            Upload multiple sprites or backgrounds at once to convert them into 4-bit or 8-bit BMPs and generate a unified QBasic loader script.
          </p>
          <button
            onClick={handleLoadBuiltInSamples}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load 4 Sample Retro Images
          </button>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Preview</th>
                  <th className="py-2.5 px-3 font-medium">Source File</th>
                  <th className="py-2.5 px-3 font-medium">DOS 8.3 Target</th>
                  <th className="py-2.5 px-3 font-medium text-right">Output Size</th>
                  <th className="py-2.5 px-3 font-medium text-right">BMP Bytes</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {items.map((item) => {
                  const thumbSrc = item.result?.processedDataUrl || item.originalDataUrl;
                  return (
                    <tr
                      key={item.id}
                      className="h-11 hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="py-1.5 px-3">
                        <div className="w-9 h-9 rounded border border-slate-700 bg-black flex items-center justify-center overflow-hidden">
                          <img
                            src={thumbSrc}
                            alt={item.originalName}
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                      </td>

                      <td className="py-1.5 px-3">
                        <div className="font-medium text-slate-200 truncate max-w-[160px]" title={item.originalName}>
                          {item.originalName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                          {item.originalWidth}×{item.originalHeight}
                        </div>
                      </td>

                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={item.dosFilename}
                          onChange={(e) => handleUpdateDosName(item.id, e.target.value)}
                          disabled={isConverting}
                          aria-label={`DOS filename for ${item.originalName}`}
                          className="w-32 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-xs font-mono text-amber-300 uppercase focus:outline-none"
                        />
                      </td>

                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {item.result
                          ? `${item.result.width}×${item.result.height} · ${item.result.bitDepth}b`
                          : `${settings.width}×${settings.height} · ${settings.bitDepth}b`}
                      </td>

                      <td className="py-1.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {item.result ? (
                          <div>
                            <span className="text-slate-200">
                              {item.result.bmpSize.toLocaleString()} B
                            </span>
                            {item.result.compression !== 'BI_RGB' && item.result.compressionRatio > 0 && (
                              <span className="ml-1.5 text-[11px] text-emerald-400">
                                (-{item.result.compressionRatio}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-1.5 px-3 whitespace-nowrap">
                        {item.status === 'queued' && (
                          <span className="inline-flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Queued</span>
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center gap-1.5 text-amber-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Converting</span>
                          </span>
                        )}
                        {item.status === 'done' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ready</span>
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span
                            className="inline-flex items-center gap-1.5 text-rose-400"
                            title={item.error}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Error</span>
                          </span>
                        )}
                      </td>

                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onInspectItem(item.originalDataUrl, item.originalName)}
                            className="p-1.5 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                            title="Load into single-image editor"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isConverting}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-40 transition-colors"
                            title="Remove from batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Bar when converting */}
      {isConverting && progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-amber-300">Converting images to BMP...</span>
            <span className="text-slate-300 tabular-nums">
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-amber-500 transition-all duration-150"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Archive Configuration & Primary Batch Actions */}
      <div className="pt-3 border-t border-slate-800 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Archive naming & summary */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                Unified Loader Script
              </label>
              <input
                type="text"
                value={basFilename}
                onChange={(e) => setBasFilename(e.target.value)}
                className="w-36 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-mono">
                ZIP Archive Name
              </label>
              <input
                type="text"
                value={zipFilename}
                onChange={(e) => setZipFilename(e.target.value)}
                className="w-44 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none pt-4">
              <input
                type="checkbox"
                checked={includePalettesInZip}
                onChange={(e) => setIncludePalettesInZip(e.target.checked)}
                className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
              />
              <span className="font-mono text-[11px] text-slate-300">
                Include .PAL &amp; .GPL palettes
              </span>
            </label>

            {completedItems.length > 0 && (
              <div className="text-xs font-mono text-slate-400 tabular-nums pt-4">
                <span>{completedItems.length} BMPs ready</span>
                <span className="mx-1.5 text-slate-600">&middot;</span>
                <span className="text-slate-200">{totalBmpBytes.toLocaleString()} bytes</span>
                {totalSavedBytes > 0 && settings.compression !== 'BI_RGB' && (
                  <>
                    <span className="mx-1.5 text-slate-600">&middot;</span>
                    <span className="text-emerald-400">
                      {totalSavedBytes.toLocaleString()} B saved via RLE
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isConverting}
                className="px-3 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-rose-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Clear Queue
              </button>
            )}

            {completedItems.length > 0 && (
              <button
                onClick={() => setShowScriptPreview((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  showScriptPreview
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                {showScriptPreview ? 'Hide' : 'Preview'} Unified .BAS
              </button>
            )}

            <button
              onClick={() => runBatchConversion(queuedCount > 0 && !settingsChangedSinceRun)}
              disabled={items.length === 0 || isConverting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 transition-colors whitespace-nowrap"
            >
              {isConverting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-amber-400" />
              )}
              {queuedCount > 0 && !settingsChangedSinceRun
                ? `Convert Queued (${queuedCount})`
                : `Convert All (${items.length})`}
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={completedItems.length === 0 || isConverting || isPackagingZip}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
            >
              {isPackagingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              Download Batch .ZIP ({completedItems.length})
            </button>
          </div>
        </div>

        {/* Expandable Unified BAS Preview */}
        {showScriptPreview && completedItems.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#07090e] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono">
              <span className="text-amber-300 font-semibold">
                {basFilename.toUpperCase()} — Unified Batch Loader ({completedItems.length} BMPs)
              </span>
              <button
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 max-h-72 overflow-auto font-mono text-xs text-slate-300 leading-relaxed">
              {unifiedBasCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
