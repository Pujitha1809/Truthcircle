import React, { useState } from 'react';
import { 
  X, 
  Terminal, 
  Clock, 
  ExternalLink, 
  FileText, 
  Share2, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Cpu,
  Layers,
  Code2,
  BookOpen
} from 'lucide-react';

export default function EvidenceDrawer({ card, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('extract'); // 'extract' | 'citations' | 'consensus' | 'json'
  const [viewRawMd, setViewRawMd] = useState(false);

  if (!isOpen || !card) return null;

  const {
    claim,
    verdict,
    confidence_score,
    outlet_consensus,
    citations = [],
    serpapi_extract_markdown,
    youcom_raw_context,
    telemetry = [],
    source_url
  } = card;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-[#0d121f] text-slate-200 shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-300">
      
      {/* 1. Header with Badge & Close Button */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">API Telemetry & Evidence Inspector</h2>
              <span className="rounded bg-sky-950 px-2 py-0.5 text-[10px] font-mono font-medium text-sky-400 border border-sky-800/40">
                Judge View
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Auditing SerpApi, You.com & Nexconn pipelines
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Top Execution Latency Badges Strip */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 px-6 py-3">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Real-Time Execution Latencies:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {telemetry.map((step, idx) => (
            <div 
              key={idx} 
              className="flex flex-col bg-slate-900/90 p-2 rounded-md border border-slate-800 text-xs font-mono"
            >
              <span className="text-[10px] text-slate-400 truncate">{step.name}</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-emerald-400 font-bold">{step.latency_ms}ms</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                  {step.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 px-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('extract')}
          className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
            activeTab === 'extract'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>SerpApi Deep Extract (MD)</span>
        </button>
        <button
          onClick={() => setActiveTab('citations')}
          className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
            activeTab === 'citations'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>You.com Citation Graph</span>
        </button>
        <button
          onClick={() => setActiveTab('consensus')}
          className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
            activeTab === 'consensus'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Consensus Breakdown</span>
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-1.5 border-b-2 py-3 px-3 transition-colors ${
            activeTab === 'json'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Raw JSON</span>
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        
        {/* Tab 1: Deep Page Extraction (SerpApi MD) */}
        {activeTab === 'extract' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
              <div>
                <span className="font-semibold text-slate-200">Engine: </span>
                <code className="text-sky-300 font-mono">serpapi.com/search.json?engine=extract&output=md</code>
              </div>
              <button
                onClick={() => setViewRawMd(!viewRawMd)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono text-[11px]"
              >
                {viewRawMd ? 'Rendered View' : 'Raw Markdown View'}
              </button>
            </div>

            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Extracted Journalism Target: </span>
              <a 
                href={source_url || 'https://boomlive.in'} 
                target="_blank" 
                rel="noreferrer"
                className="text-sky-400 underline inline-flex items-center gap-1"
              >
                {source_url || 'https://boomlive.in/fact-check'} <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {viewRawMd ? (
              <pre className="bg-black/60 p-4 rounded-lg font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed border border-slate-800 overflow-x-auto max-h-[450px]">
                {serpapi_extract_markdown || '# No markdown extracted'}
              </pre>
            ) : (
              <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-800 text-sm leading-relaxed space-y-3 prose-invert max-h-[450px] overflow-y-auto">
                <div className="border-b border-slate-800 pb-2 mb-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Full Article Markdown Extracted Grounding
                  </span>
                </div>
                <div className="whitespace-pre-line text-slate-300 text-xs font-sans leading-relaxed">
                  {serpapi_extract_markdown || 'No markdown body available.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: You.com Citation Graph */}
        {activeTab === 'citations' && (
          <div className="space-y-4">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="font-semibold text-slate-200">Endpoint: </span>
              <code className="text-indigo-300 font-mono">https://api.ydc-index.io/search (X-API-Key)</code>
              <p className="mt-1 text-slate-400">
                Grounds synthesis in peer-reviewed and primary investigative citations.
              </p>
            </div>

            {youcom_raw_context && (
              <div className="bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-lg text-xs text-indigo-300 italic">
                <span className="font-semibold not-italic text-indigo-200">RAG Synthesis Context: </span>
                {youcom_raw_context}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Indexed Web Citations ({citations.length})
              </h4>
              {citations.map((cite) => (
                <div 
                  key={cite.id}
                  className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs">{cite.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                      Trust: {cite.trust_score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    "{cite.snippet}"
                  </p>
                  <a 
                    href={cite.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono"
                  >
                    {cite.url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Consensus Breakdown */}
        {activeTab === 'consensus' && (
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200">Media Outlet Consensus Analytics</h3>
              <p className="text-xs text-slate-400">
                Aggregated by SerpApi Google News Consensus engine across Indian & global news registries.
              </p>

              <div className="space-y-2 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400 font-medium">Debunked by Outlets:</span>
                    <span className="font-mono text-red-400">{outlet_consensus?.debunked_count || 0}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${Math.min(((outlet_consensus?.debunked_count || 0) / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-medium">Confirmed by Outlets:</span>
                    <span className="font-mono text-emerald-400">{outlet_consensus?.confirmed_count || 0}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${Math.min(((outlet_consensus?.confirmed_count || 0) / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Neutral / Contextual:</span>
                    <span className="font-mono text-slate-400">{outlet_consensus?.neutral_count || 0}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-500 rounded-full" 
                      style={{ width: `${Math.min(((outlet_consensus?.neutral_count || 0) / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
                <span className="font-semibold">Consensus Verdict: </span>
                {outlet_consensus?.summary_text}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Raw JSON Telemetry */}
        {activeTab === 'json' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Full Raw Telemetry Payload:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(card, null, 2));
                  alert('Copied JSON payload to clipboard!');
                }}
                className="text-sky-400 hover:text-sky-300 text-xs font-mono"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-black/70 p-4 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800 max-h-[480px]">
              {JSON.stringify(card, null, 2)}
            </pre>
          </div>
        )}

      </div>

      {/* 5. Footer */}
      <div className="border-t border-slate-800 bg-slate-900/90 px-6 py-3 text-right">
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Close Inspector
        </button>
      </div>

    </div>
  );
}

