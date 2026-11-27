import React from 'react';
import { Download, FileCode, Cpu, Layers, Terminal, Archive } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onDownloadBmp: () => void;
  onDownloadBas: () => void;
  hasImage: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadBmp,
  onDownloadBas,
  hasImage,
}) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3.5 bg-[#0f1118]/95 backdrop-blur border-b border-slate-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <span className="text-base font-bold tracking-tight text-white font-mono whitespace-nowrap">
          QBasic BMP Studio
        </span>
      </div>

      {/* Zone 2: Navigation tabs */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'editor'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Converter &amp; Editor
        </button>

        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'batch'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Batch ZIP
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'code'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          QBasic Code (.BAS)
        </button>

        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'inspector'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Binary Inspector
        </button>

        <button
          onClick={() => setActiveTab('emulator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'emulator'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          DOS Emulator
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onDownloadBmp}
          disabled={!hasImage}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-colors whitespace-nowrap"
          title="Download Windows BMP file with 4-bit/8-bit RLE headers"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          Export .BMP
        </button>

        <button
          onClick={onDownloadBas}
          disabled={!hasImage}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
          title="Download runnable QBasic / QuickBASIC .BAS loader program"
        >
          <FileCode className="w-3.5 h-3.5" />
          Download .BAS
        </button>
      </div>
    </header>
  );
};
