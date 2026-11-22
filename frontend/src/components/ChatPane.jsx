import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  Shield, 
  Forward, 
  Search, 
  MoreVertical, 
  CheckCheck,
  Sparkles,
  Bot,
  Reply,
  X
} from 'lucide-react';
import CredibilityCard from './CredibilityCard';

// ─── Live Step-by-Step Verification Progress Bubble ─────────────────────────
function VerifyingBubble({ steps }) {
  return (
    <div className="flex flex-col items-start group transition-all">
      <div className="mt-2 mb-2 w-full max-w-xl rounded-xl border border-sky-500/30 bg-gradient-to-b from-[#0d1626] to-[#080b12] p-4 text-slate-200">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
          </span>
          <span className="text-xs font-bold text-sky-300 tracking-wide">
            🔍 TruthCircle AI — Live Verification in Progress
          </span>
        </div>
        <div className="space-y-2.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-sky-950 border border-sky-700 flex items-center justify-center text-[9px] font-bold text-sky-400 shrink-0">
                {i + 1}
              </span>
              <span className={i === steps.length - 1 ? 'text-sky-300 font-medium flex-1' : 'text-slate-400 flex-1'}>
                {step}
              </span>
              {i === steps.length - 1 && (
                <span className="flex gap-0.5 mt-1 shrink-0">
                  <span className="w-1 h-1 rounded-full bg-sky-400 animate-bounce"></span>
                  <span className="w-1 h-1 rounded-full bg-sky-400 animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-1 h-1 rounded-full bg-sky-400 animate-bounce [animation-delay:0.3s]"></span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ChatPane Component ─────────────────────────────────────────────────
const TRUTHCIRCLE_PATTERN = /^\s*@truthcircle\s*(.*)/i;

export default function ChatPane({
  room,
  currentUser = { id: 'rohan', name: 'Rohan', avatar: '👨‍💻' },
  messages = [],
  onSendMessage,
  onFactCheckMessage,
  onInspectCard,
  onTruthCircleVerify,
  verifyingSteps = null,
  typingStatus = null,
  isSplitView = false
}) {
  const [inputText, setInputText] = useState('');
  const [isForwarded, setIsForwarded] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, sender_name, text }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new message or new verifying step
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus, verifyingSteps]);

  // Auto-detect "forwarded" heuristic: multi-line paste or starts with common viral patterns
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    // Auto-toggle forwarded for multi-line pastes (WhatsApp forwards are typically multi-line)
    if (val.includes('\n') && val.length > 80) {
      setIsForwarded(true);
    }
  };

  const handleReply = (msg) => {
    setReplyTo({ id: msg.id, sender_name: msg.sender_name, text: msg.text });
    inputRef.current?.focus();
  };

  const clearReply = () => setReplyTo(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();

    // Build message payload
    const msgPayload = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      room_id: room.id,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_forwarded: isForwarded,
      forwarded_many_times: isForwarded,
      reply_to: replyTo ? replyTo.id : null,
      reply_to_text: replyTo ? replyTo.text : null,
      reply_to_sender: replyTo ? replyTo.sender_name : null,
      card: null
    };

    // Post the message into the room first (always)
    onSendMessage(msgPayload);

    // Reset input state
    const wasForwarded = isForwarded;
    setInputText('');
    setIsForwarded(false);

    // Detect @truthcircle trigger
    const match = text.match(TRUTHCIRCLE_PATTERN);
    if (match && onTruthCircleVerify) {
      let claimText = (match[1] || '').trim();
      // If bare @truthcircle (no extra text) + replying to a message, use the quoted message as the claim
      if (!claimText && replyTo) {
        claimText = replyTo.text.replace(/^[↪\s]+/, '').trim();
      }
      if (claimText) {
        onTruthCircleVerify(claimText);
      }
    }

    setReplyTo(null);
  };

  // Check if input looks like @truthcircle
  const isAtTruthCircle = TRUTHCIRCLE_PATTERN.test(inputText);

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-slate-800 last:border-r-0 relative overflow-hidden">
      
      {/* 1. Pane Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111827]/90 border-b border-slate-800 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xl border border-slate-700 shadow-inner">
              {room.avatar || '💬'}
            </span>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">{room.name}</h2>
              {isSplitView && (
                <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-mono font-bold">
                  View: {currentUser.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>TruthCircle Bot Active • {room.members?.length || 4} members</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
            <Bot className="w-3 h-3" /> Auto-Firewall
          </span>
          <button className="text-slate-400 hover:text-slate-200 p-1 rounded-md">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-[#0b0f19] to-[#080b12]">
        
        {/* Today Divider */}
        <div className="flex items-center justify-center my-2">
          <span className="bg-slate-900 text-slate-400 text-[11px] font-medium px-3 py-0.5 rounded-full border border-slate-800 shadow-sm">
            Today
          </span>
        </div>

        {/* Security / Encryption Notice */}
        <div className="text-center my-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900/60 px-3 py-1 rounded-md border border-slate-800/60">
            <Shield className="w-3 h-3 text-emerald-400" />
            Messages are analyzed in real-time by TruthCircle's multi-engine fact-check firewall
          </span>
        </div>

        {/* Message Items */}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser.id;
          const isBot = msg.sender_id === 'truthcircle-bot';

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group transition-all`}
            >
              {/* Message Bubble Container */}
              <div 
                className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 chat-bubble-shadow transition-all ${
                  isBot
                    ? 'w-full max-w-xl bg-transparent p-0'
                    : isMe
                      ? 'bg-gradient-to-tr from-emerald-800/90 to-teal-700/90 text-white rounded-br-xs border border-emerald-600/40'
                      : 'bg-[#182030] text-slate-200 rounded-bl-xs border border-slate-750'
                }`}
              >
                {/* Regular Chat Bubble Header */}
                {!isBot && (
                  <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <span>{msg.sender_avatar}</span>
                      <span>{msg.sender_name}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                )}

                {/* Forwarded Header with One-Click Fact-Check Button */}
                {msg.is_forwarded && !isBot && (
                  <div className="mb-2 flex items-center justify-between bg-black/30 px-2 py-1 rounded border border-slate-750 text-xs">
                    <div className="flex items-center gap-1 text-[11px] italic text-amber-300">
                      <Forward className="w-3.5 h-3.5 text-amber-400" />
                      <span>{msg.forwarded_many_times ? 'Forwarded many times' : 'Forwarded'}</span>
                    </div>

                    <button
                      onClick={() => onFactCheckMessage(msg)}
                      className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold transition-all active:scale-95"
                    >
                      <Search className="w-2.5 h-2.5" />
                      <span>🔍 Fact-Check</span>
                    </button>
                  </div>
                )}

                {/* Reply-to quoted message preview */}
                {msg.reply_to_text && !isBot && (
                  <div className="mb-2 bg-sky-950/40 border-l-2 border-sky-500 px-2 py-1 rounded-r text-[11px]">
                    <span className="text-sky-400 font-semibold">{msg.reply_to_sender || 'Message'}</span>
                    <p className="text-slate-400 line-clamp-2 mt-0.5">{msg.reply_to_text}</p>
                  </div>
                )}

                {/* @truthcircle highlight in message text */}
                {!isBot && (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap select-text">
                    {msg.text.split(/(@truthcircle)/i).map((part, idx) =>
                      /^@truthcircle$/i.test(part)
                        ? <span key={idx} className="text-emerald-400 font-bold bg-emerald-950/40 px-0.5 rounded">{part}</span>
                        : part
                    )}
                  </p>
                )}

                {/* Hover action bar: Reply + Fact-Check (for non-forwarded messages) */}
                {!isBot && !msg.is_forwarded && (
                  <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleReply(msg)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-sky-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-2 py-0.5 rounded transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                    <button
                      onClick={() => onFactCheckMessage(msg)}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-2 py-0.5 rounded transition-colors"
                    >
                      <Search className="w-2.5 h-2.5" />
                      <span>🔍 Fact-Check</span>
                    </button>
                  </div>
                )}

                {/* Message Read Receipt Footer */}
                {!isBot && isMe && (
                  <div className="flex justify-end mt-1">
                    <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                  </div>
                )}

                {/* Inline Credibility Card */}
                {msg.card && (
                  <CredibilityCard 
                    card={msg.card} 
                    onInspect={onInspectCard} 
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Live Verification Progress Bubble */}
        {verifyingSteps && verifyingSteps.length > 0 && (
          <VerifyingBubble steps={verifyingSteps} />
        )}

        {/* Live Typing Indicator */}
        {typingStatus && typingStatus.is_typing && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 w-fit animate-pulse">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-300">
              {typingStatus.sender_name || 'TruthCircle AI'} is analyzing fact-check evidence...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Controls Bar */}
      <div className="p-3 bg-[#111827] border-t border-slate-800">

        {/* Reply-to preview bar */}
        {replyTo && (
          <div className="flex items-center justify-between bg-sky-950/30 border border-sky-800/40 rounded-lg px-3 py-1.5 mb-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-sky-400 font-semibold">{replyTo.sender_name}</span>
                <p className="text-slate-400 truncate">{replyTo.text}</p>
              </div>
            </div>
            <button
              onClick={clearReply}
              className="text-slate-500 hover:text-slate-200 p-0.5 rounded shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {/* Helper Hint + Forwarded Toggle */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Tag <code className="text-emerald-400 font-mono font-bold">@truthcircle</code> to verify live</span>
          </span>

          {/* ↪ Forwarded Toggle Pill */}
          <button
            type="button"
            onClick={() => setIsForwarded(f => !f)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
              isForwarded
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <Forward className="w-3 h-3" />
            <span>{isForwarded ? '↪ Forwarded ✓' : '↪ Forwarded'}</span>
          </button>
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button 
            type="button" 
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              replyTo
                ? `Reply to ${replyTo.sender_name}... (type @truthcircle to verify)`
                : `Message as ${currentUser.name}... (try: @truthcircle <any claim>)`
            }
            className={`flex-1 bg-slate-900 text-xs text-slate-200 placeholder-slate-500 px-3.5 py-2.5 rounded-xl border transition-colors shadow-inner focus:outline-none ${
              isAtTruthCircle
                ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                : isForwarded
                  ? 'border-amber-500/50 ring-1 ring-amber-500/20'
                  : 'border-slate-800 focus:border-emerald-500'
            }`}
          />

          {inputText.trim() ? (
            <button
              type="submit"
              className={`p-2.5 text-white rounded-xl shadow-md transition-all active:scale-95 ${
                isAtTruthCircle
                  ? 'bg-emerald-500 hover:bg-emerald-400 ring-2 ring-emerald-400/40'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button" 
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
