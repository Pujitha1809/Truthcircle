import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Zap, 
  Smartphone, 
  Layers, 
  Search, 
  CheckCircle,
  Radio,
  Sparkles,
  Users,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

export default function DemoControlBar({ 
  onInjectPreset, 
  onCustomVerify, 
  presets = [], 
  isSplitScreen, 
  onToggleSplitScreen,
  isSidebarOpen = true,
  onToggleSidebar,
  stats = { checked: 14, stopped: 11, avgSpeed: 420 },
  isLoading = false,
  onOpenRadarModal
}) {
  const [customInput, setCustomInput] = useState('');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onCustomVerify(customInput.trim());
    setCustomInput('');
  };

  return (
    <header className="border-b border-slate-800 bg-[#0a0e17]/95 backdrop-blur-md px-4 py-2.5 shadow-sm">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Brand & Live Misinformation Radar */}
        <div className="flex items-center gap-4">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-800 transition-colors"
              title={isSidebarOpen ? "Collapse Rooms Sidebar" : "Expand Rooms Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-emerald-400" /> : <PanelLeft className="w-4 h-4 text-slate-400" />}
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-white">TruthCircle</h1>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  v1.0 Stage-Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-Time Misinformation Firewall for Group Chats
              </p>
            </div>
          </div>

          {/* Live Radar Counters (Clickable for Enterprise Audit Modal) */}
          <button 
            type="button"
            onClick={onOpenRadarModal}
            className="hidden xl:flex items-center gap-2.5 border-l border-slate-800 pl-4 font-mono text-xs group cursor-pointer hover:opacity-95 transition-all text-left"
            title="Click to view full Enterprise Misinformation Radar & Audit Log"
          >
            <div className="flex items-center gap-1.5 bg-slate-900/90 group-hover:border-emerald-500/50 px-2.5 py-1 rounded-md border border-slate-800 transition-colors shadow-sm">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-slate-400">Checked:</span>
              <span className="font-bold text-emerald-400">{stats.checked}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 group-hover:border-red-500/50 px-2.5 py-1 rounded-md border border-slate-800 transition-colors shadow-sm">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span className="text-slate-400">Stopped:</span>
              <span className="font-bold text-red-400">{stats.stopped}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 group-hover:border-amber-500/50 px-2.5 py-1 rounded-md border border-slate-800 transition-colors shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Avg Speed:</span>
              <span className="font-bold text-amber-300">{stats.avgSpeed}ms</span>
            </div>
            <span className="flex items-center gap-1 bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 text-[10px] px-2 py-0.5 rounded-full font-bold group-hover:bg-emerald-900/80 transition-colors">
              <span>📊 View Radar</span>
            </span>
          </button>
        </div>

        {/* Sponsor Badges & Split-Screen Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Active Sponsor APIs */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            <span className="text-emerald-400 font-semibold">● Nexconn SDK</span>
            <span>•</span>
            <span className="text-sky-400 font-semibold">● SerpApi (Consensus + Extract)</span>
            <span>•</span>
            <span className="text-indigo-400 font-semibold">● You.com RAG</span>
          </div>

          {/* One-Click Split-Screen Multiplayer Stage Mode Toggle */}
          <button
            onClick={onToggleSplitScreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isSplitScreen 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20' 
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
            }`}
            title="Split viewport into User A ('Rohan') and User B ('Maa') for live stage multiplayer demo"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isSplitScreen ? 'Dual Phone Stage Mode Active' : 'Split-Screen Multiplayer'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSplitScreen ? 'bg-indigo-900/80 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>
              {isSplitScreen ? '2 SYNCED' : 'STAGE'}
            </span>
          </button>
        </div>
      </div>

      {/* Preset Rumor Injector & Custom Claim Input Row */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        
        {/* Preset Injectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
          </span>

          <button
            onClick={() => onInjectPreset('preset-anthem')}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 px-2.5 py-1 rounded-md text-slate-300 transition-colors"
          >
            <span>🇮🇳 UNESCO Best Anthem</span>
          </button>

          <button
            onClick={() => onInjectPreset('preset-5g')}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 px-2.5 py-1 rounded-md text-slate-300 transition-colors"
          >
            <span>🐦 5G Bird Deaths</span>
          </button>

          <button
            onClick={() => onInjectPreset('preset-rbi')}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 px-2.5 py-1 rounded-md text-slate-300 transition-colors"
          >
            <span>💵 RBI ₹500 Notes Ban</span>
          </button>

          <button
            onClick={() => onInjectPreset('preset-isro')}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 px-2.5 py-1 rounded-md text-slate-300 transition-colors"
          >
            <span>🚀 ISRO Lunar Sulfur</span>
          </button>
        </div>

        {/* Custom Claim or URL input bar */}
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 shrink-0">
          <div className="relative flex-1 md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Test any custom claim or news URL..."
              className="w-full bg-slate-900/90 text-xs text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !customInput.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow transition-colors shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Verifying...' : 'Fact-Check'}</span>
          </button>
        </form>

      </div>
    </header>
  );
}

