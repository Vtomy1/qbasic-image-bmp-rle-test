import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { SAMPLE_PRESETS, createSampleImage } from '../lib/sampleImages';

interface ImageUploaderProps {
  onImageSelected: (dataUrl: string, name?: string) => void;
  currentImageName?: string;
  originalWidth: number;
  originalHeight: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  currentImageName,
  originalWidth,
  originalHeight,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelected(event.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelected(event.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (id: string) => {
    const sample = createSampleImage(id);
    onImageSelected(sample.dataUrl, `${sample.name}.png`);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer text-center"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 flex items-center justify-center mb-2.5 transition-colors">
          <Upload className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-200">
          Drop image here, paste, or <span className="text-amber-400 underline decoration-amber-400/40">browse files</span>
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Supports PNG, JPG, WebP, BMP &bull; Auto-scaled to target screen
        </p>

        {currentImageName && (
          <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 rounded border border-slate-700 text-xs font-mono text-slate-300">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[200px]">{currentImageName}</span>
            <span className="text-slate-500">
              ({originalWidth}×{originalHeight})
            </span>
          </div>
        )}
      </div>

      {/* Built-in Sample Graphics Presets */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Or test with built-in retro graphics:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className="px-3 py-2 text-left bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors group"
            >
              <div className="text-xs font-medium text-slate-200 group-hover:text-amber-300 truncate">
                {p.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {p.category}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
