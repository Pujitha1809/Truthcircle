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
  Check,
  Sparkles,
  Bot
} from 'lucide-react';
import CredibilityCard from './CredibilityCard';

export default function ChatPane({
  room,
  currentUser = { id: 'rohan', name: 'Rohan', avatar: '👨‍💻' },
  messages = [],
  onSendMessage,
  onFactCheckMessage,
  onInspectCard,
  typingStatus = null,
  isSplitView = false
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage({
      id: `msg-${Date.now()}`,
      room_id: room.id,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_forwarded: false,
      card: null
    });

    setInputText('');
  };

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
                <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 text-[10px] font-mono font-bold">
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

                {/* Message Body Text */}
                {!isBot && (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap select-text">
                    {msg.text}
                  </p>
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
        
        {/* Helper Hint Pill */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Tag <code className="text-emerald-400 font-mono font-bold">@truthcircle &lt;claim&gt;</code> to verify</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Enter ↵ to send
          </span>
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
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message as ${currentUser.name}... (e.g. @truthcircle claim)`}
            className="flex-1 bg-slate-900 text-xs text-slate-200 placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
          />

          {inputText.trim() ? (
            <button
              type="submit"
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all active:scale-95"
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

