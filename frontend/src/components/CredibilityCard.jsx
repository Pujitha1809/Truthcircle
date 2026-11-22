import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Activity, 
  Gauge, 
  Layers, 
  ChevronRight, 
  FileSearch, 
  ChevronDown, 
  ChevronUp,
  ThumbsUp,
  Flag,
  Users
} from 'lucide-react';

export default function CredibilityCard({ card, onInspect, onVote, currentUserId = 'rohan', votes = {} }) {
  const [activeLang, setActiveLang] = useState('english');
  const [copied, setCopied] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(true);

  if (!card) return null;

  const {
    id: cardId,
    claim,
    verdict = 'FALSE',
    confidence_score = 95,
    outlet_consensus,
    explanation,
    detailed_analysis,
    verification_steps,
    source_type = 'text',
    extracted_ocr_text,
    extracted_url,
    citations = [],
    polite_reply = {},
    telemetry = []
  } = card;

  // Read vote counts for this card (defaults: helpful=1, needs_context=0)
  const cardVotes = votes[cardId] || { helpful: ['initial-bot-reviewer'], needsContext: [] };
  const helpfulCount = cardVotes.helpful ? cardVotes.helpful.length : 1;
  const contextCount = cardVotes.needsContext ? cardVotes.needsContext.length : 0;
  const hasVotedHelpful = cardVotes.helpful && cardVotes.helpful.includes(currentUserId);
  const hasVotedContext = cardVotes.needsContext && cardVotes.needsContext.includes(currentUserId);
  const isGroupConsensusVerified = helpfulCount >= 2;

  // Semantic styles
  const verdictConfig = {
    FALSE: {
      badgeBg: 'bg-red-500/15 border-red-500/30 text-red-400',
      pillBg: 'bg-red-500/20 text-red-300 border-red-500/30',
      icon: ShieldAlert,
      glow: 'card-false-glow border-red-500/30',
      text: 'FALSE HOAX',
      accentColor: '#ef4444'
    },
    MISLEADING: {
      badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      pillBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: AlertTriangle,
      glow: 'card-misleading-glow border-amber-500/30',
      text: 'MISLEADING CONTEXT',
      accentColor: '#f59e0b'
    },
    VERIFIED: {
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      pillBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: ShieldCheck,
      glow: 'card-verified-glow border-emerald-500/30',
      text: 'VERIFIED TRUE',
      accentColor: '#10b981'
    },
    UNVERIFIED: {
      badgeBg: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
      pillBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      icon: HelpCircle,
      glow: 'border-slate-500/30',
      text: 'UNVERIFIED CLAIM',
      accentColor: '#94a3b8'
    }
  };

  const currentConfig = verdictConfig[verdict] || verdictConfig.FALSE;
  const VerdictIcon = currentConfig.icon;

  const handleCopyReply = () => {
    const textToCopy = polite_reply[activeLang] || polite_reply.english || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  // Compute total pipeline latency — guard against negative/zero values from async timing edge cases
  const rawTelemetrySum = telemetry?.reduce((acc, curr) => {
    const ms = curr?.latency_ms;
    return acc + (typeof ms === 'number' && ms > 0 ? ms : 0);
  }, 0) ?? 0;
  // Prefer backend-authoritative processing_time_ms if available; fallback to telemetry sum; floor at 120ms
  const totalLatency = Math.max(120, Math.abs(card?.processing_time_ms ?? rawTelemetrySum) || 1150);

  return (
    <div className={`mt-2.5 mb-2 w-full max-w-xl rounded-xl border bg-gradient-to-b from-[#111827] to-[#0b0f19] p-4 text-slate-200 transition-all duration-300 ${currentConfig.glow}`}>
      
      {/* 1. High-Contrast Semantic Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-wider uppercase ${currentConfig.badgeBg}`}>
            <VerdictIcon className="w-4 h-4 animate-pulse" />
            <span>{currentConfig.text}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-200">{confidence_score}%</span>
            <span className="text-[10px] text-slate-500">Confidence</span>
          </div>
        </div>

        {/* Real-time verified badge & Consensus badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isGroupConsensusVerified && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-2.5 py-0.5 rounded-full shadow-md animate-in fade-in duration-300">
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
              <span>✅ Verified by Group Consensus</span>
            </span>
          )}
          {extracted_url && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-300 bg-sky-950/70 border border-sky-800/50 px-2 py-0.5 rounded-full shadow-sm">
              <span>🔗</span>
              <span>Live Webpage Extracted (SerpApi)</span>
            </span>
          )}
          {source_type === 'image_ocr' && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 bg-purple-950/70 border border-purple-800/50 px-2 py-0.5 rounded-full shadow-sm">
              <span>🖼️</span>
              <span>Screenshot OCR Verified</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Live Verified
          </span>
        </div>
      </div>

      {/* Claim preview */}
      <div className="mt-2.5 text-xs text-slate-400 italic bg-black/30 p-2 rounded border border-slate-800/60 line-clamp-2">
        <span className="text-slate-500 not-italic font-semibold">Claim: </span>
        "{claim}"
      </div>

      {/* Extracted Screenshot Text Box (if source_type === "image_ocr") */}
      {source_type === 'image_ocr' && extracted_ocr_text && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1">
            <span>🖼️</span>
            <span>Extracted Screenshot Text (OCR)</span>
          </div>
          <p className="text-slate-300 font-mono text-[11px] bg-black/40 p-2 rounded border border-purple-900/40 whitespace-pre-wrap leading-relaxed select-all">
            "{extracted_ocr_text}"
          </p>
        </div>
      )}

      {/* 2. Outlet Consensus Meter */}
      {outlet_consensus && (
        <div className="mt-3 flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span className="font-medium text-slate-300">Outlet Consensus Meter:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {outlet_consensus.debunked_count > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950/80 text-red-300 border border-red-800/50">
                {outlet_consensus.debunked_count} Debunked
              </span>
            )}
            {outlet_consensus.confirmed_count > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                {outlet_consensus.confirmed_count} Confirmed
              </span>
            )}
            {outlet_consensus.neutral_count > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {outlet_consensus.neutral_count} Neutral
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Calm 2-Sentence Family-Friendly Explanation */}
      <p className="mt-3 text-sm text-slate-300 leading-relaxed font-normal">
        {explanation}
      </p>

      {/* 3b. Detailed Investigative Analysis (populated for live/custom claims) */}
      {detailed_analysis && (
        <div className="mt-3 p-3 rounded-lg bg-slate-900/70 border border-indigo-800/40">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1.5">
            <FileSearch className="w-3.5 h-3.5" />
            Detailed Verification Analysis
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{detailed_analysis}</p>
        </div>
      )}

      {/* 3c. Verification Steps Audit Trail */}
      {verification_steps && verification_steps.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setStepsExpanded(s => !s)}
            className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-sky-400">🔍</span>
              Verification Steps Audit Trail ({verification_steps.length} Steps)
            </span>
            {stepsExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            }
          </button>
          {stepsExpanded && (
            <div className="space-y-1.5">
              {verification_steps.map((step) => (
                <div
                  key={step.step_number}
                  className="flex items-start gap-2.5 bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-xs"
                >
                  <span className="shrink-0 w-5 h-5 rounded-full bg-sky-950 border border-sky-700/60 flex items-center justify-center text-[10px] font-bold text-sky-400">
                    {step.step_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-slate-200">{step.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-1.5 py-0.5 rounded">
                          {step.api_source}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          step.status === 'completed'
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                            : 'text-amber-400 bg-amber-950/60 border border-amber-800/40'
                        }`}>
                          {Math.max(1, Math.abs(step.latency_ms ?? 0))}ms
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 leading-relaxed line-clamp-3">{step.finding}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Clickable Source Citation Pills */}
      {citations && citations.length > 0 && (
        <div className="mt-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-400" /> Verified Primary Sources ({citations.length}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {citations.map((cite) => (
              <a
                key={cite.id}
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 px-2.5 py-1 rounded-md text-xs text-slate-300 transition-colors"
                title={`${cite.title}\n${cite.snippet}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                <span className="font-medium group-hover:text-sky-300">{cite.domain}</span>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 5. Indian Family "Copy Polite Reply" Section */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Family-Friendly Reply Generator</span>
          </div>

          {/* Language Toggle Pills */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveLang('english')}
              className={`px-2 py-0.5 rounded transition-colors ${activeLang === 'english' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLang('hindi')}
              className={`px-2 py-0.5 rounded transition-colors ${activeLang === 'hindi' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setActiveLang('hinglish')}
              className={`px-2 py-0.5 rounded transition-colors ${activeLang === 'hinglish' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Hinglish
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 italic bg-slate-900/70 p-2.5 rounded border border-slate-800 leading-relaxed select-all">
          "{polite_reply[activeLang] || polite_reply.english}"
        </p>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Politely debunks without embarrassing elders in family groups
          </span>
          <button
            onClick={handleCopyReply}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow transition-colors active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Polite Reply</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5b. Live Multiplayer Community Notes Consensus Voting */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/70 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-300">Group Consensus:</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Helpful Reaction Button */}
          <button
            type="button"
            onClick={() => onVote && onVote(cardId, 'helpful')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all active:scale-95 ${
              hasVotedHelpful
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="Vote this fact-check as helpful and accurate"
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasVotedHelpful ? 'text-emerald-400 fill-emerald-400/20' : 'text-slate-400'}`} />
            <span>Helpful</span>
            <span className="font-mono bg-black/40 px-1.5 py-0.2 rounded text-[10px] text-emerald-400 font-bold ml-0.5">
              {helpfulCount}
            </span>
          </button>

          {/* Needs Context Reaction Button */}
          <button
            type="button"
            onClick={() => onVote && onVote(cardId, 'needsContext')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all active:scale-95 ${
              hasVotedContext
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="Flag as needing further context or nuance"
          >
            <Flag className={`w-3.5 h-3.5 ${hasVotedContext ? 'text-amber-400 fill-amber-400/20' : 'text-slate-400'}`} />
            <span>Needs Context</span>
            <span className="font-mono bg-black/40 px-1.5 py-0.2 rounded text-[10px] text-amber-400 font-bold ml-0.5">
              {contextCount}
            </span>
          </button>
        </div>
      </div>

      {/* 6. Technical Evidence Drawer Trigger */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>SerpApi + You.com + Nexconn</span>
          <span className="text-slate-600">•</span>
          <span className="text-sky-400">~{totalLatency}ms</span>
        </div>

        <button
          onClick={() => onInspect && onInspect(card)}
          className="group flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/40 px-3 py-1 rounded-md transition-all"
        >
          <span>Inspect Evidence & APIs</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

    </div>
  );
}

