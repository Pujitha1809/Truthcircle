import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Settings, 
  Bell, 
  MessageSquare,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import DemoControlBar from './components/DemoControlBar';
import ChatPane from './components/ChatPane';
import EvidenceDrawer from './components/EvidenceDrawer';
import { fetchHealth, fetchPresets, fetchRooms, fetchRoomMessages, verifyClaim } from './services/api';
import NexconnAdapter, { nexconn } from './services/nexconnAdapter';

export default function App() {
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState('family-circle');
  const [messages, setMessages] = useState([]);
  const [presets, setPresets] = useState([]);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCardForInspection, setActiveCardForInspection] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [typingStatus, setTypingStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Radar session counters
  const [stats, setStats] = useState({
    checked: 14,
    stopped: 11,
    avgSpeed: 410
  });

  // Dedicated secondary Nexconn adapter for User B in Split-Screen Mode
  const nexconnUserB = useRef(new NexconnAdapter());

  // Initial data loading
  useEffect(() => {
    async function init() {
      const [fetchedRooms, fetchedPresets] = await Promise.all([
        fetchRooms(),
        fetchPresets()
      ]);
      setRooms(fetchedRooms);
      setPresets(fetchedPresets);

      const initMsgs = await fetchRoomMessages('family-circle');
      setMessages(initMsgs);
    }
    init();
  }, []);

  // Connect Primary Nexconn Adapter (User A: Rohan)
  useEffect(() => {
    nexconn.connect({
      roomId: activeRoomId,
      userId: 'rohan',
      userName: 'Rohan'
    });

    const unsubMsg = nexconn.onMessage((msg) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // If message contains a verified card, trigger confetti
      if (msg.card && msg.card.verdict === 'VERIFIED') {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.8 } });
      }
    });

    const unsubTyping = nexconn.onTyping((status) => {
      setTypingStatus(status);
    });

    return () => {
      unsubMsg();
      unsubTyping();
      nexconn.disconnect();
    };
  }, [activeRoomId]);

  // Connect Secondary Nexconn Adapter for User B (Maa) when split screen is active
  useEffect(() => {
    if (isSplitScreen) {
      nexconnUserB.current.connect({
        roomId: activeRoomId,
        userId: 'maa',
        userName: 'Maa'
      });
    } else {
      nexconnUserB.current.disconnect();
    }
    return () => {
      nexconnUserB.current.disconnect();
    };
  }, [isSplitScreen, activeRoomId]);

  // Switch Room
  const handleSelectRoom = async (roomId) => {
    setActiveRoomId(roomId);
    const msgs = await fetchRoomMessages(roomId);
    setMessages(msgs);
  };

  // Send message from User A
  const handleSendMessageUserA = (msg) => {
    nexconn.sendMessage(msg);
  };

  // Send message from User B (Maa) in Split-Screen Mode
  const handleSendMessageUserB = (msg) => {
    nexconnUserB.current.sendMessage(msg);
  };

  // Fact-Check a forwarded message or specific claim
  const handleFactCheckMessage = async (msg) => {
    const claim = msg.text.replace(/^[↪\s]+/, '').trim();
    await executeFactCheck(claim, msg.sender_name);
  };

  // Main Fact-Check Executor
  const executeFactCheck = async (claimText, author = 'Rohan') => {
    setIsLoading(true);
    setTypingStatus({ is_typing: true, sender_name: 'TruthCircle AI' });

    try {
      const res = await verifyClaim({
        claim: claimText,
        roomId: activeRoomId,
        author: author
      });

      // Update session stats
      setStats((prev) => ({
        checked: prev.checked + 1,
        stopped: res.card.verdict === 'FALSE' || res.card.verdict === 'MISLEADING' ? prev.stopped + 1 : prev.stopped,
        avgSpeed: res.processing_time_ms || 410
      }));

      // Automatically inspect the card if requested
      setActiveCardForInspection(res.card);

      if (res.card.verdict === 'VERIFIED') {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.75 } });
      }

    } catch (err) {
      console.error('[FactCheck] Error running verification:', err);
    } finally {
      setIsLoading(false);
      setTypingStatus({ is_typing: false, sender_name: 'TruthCircle AI' });
    }
  };

  // Handle Preset Injection
  const handleInjectPreset = async (presetId) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    // Send the rumor forward into the chat first to mimic viral forwarding
    const rumorMsg = {
      id: `msg-forward-${Date.now()}`,
      room_id: activeRoomId,
      sender_id: 'vijay',
      sender_name: 'Uncle Vijay',
      sender_avatar: '🧔',
      text: preset.claim,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_forwarded: true,
      forwarded_many_times: true,
      card: null
    };

    nexconn.sendMessage(rumorMsg);

    // After 400ms, trigger TruthCircle Fact-Check Bot
    setTimeout(() => {
      executeFactCheck(preset.claim, 'Uncle Vijay');
    }, 400);
  };

  const currentRoom = rooms.find((r) => r.id === activeRoomId) || {
    id: 'family-circle',
    name: 'Family Circle 🇮🇳',
    avatar: '👨‍👩‍👧‍👦',
    members: ['Maa', 'Rohan', 'Uncle Vijay', 'TruthCircle Bot']
  };

  const filteredRooms = rooms.filter((r) => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100 font-sans">
      
      {/* 1. Top Workspace Header & Misinformation Radar */}
      <DemoControlBar
        onInjectPreset={handleInjectPreset}
        onCustomVerify={(claim) => executeFactCheck(claim, 'Judge Demo')}
        presets={presets}
        isSplitScreen={isSplitScreen}
        onToggleSplitScreen={() => setIsSplitScreen(!isSplitScreen)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        stats={stats}
        isLoading={isLoading}
      />

      {/* 2. Main Stage: Sidebar + Chat Panes */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar (WhatsApp / Linear style) */}
        {isSidebarOpen && (
          <aside className="w-80 shrink-0 border-r border-slate-800 bg-[#0d121f] flex flex-col transition-all">
          
          {/* User profile & search */}
          <div className="p-3.5 border-b border-slate-800 bg-[#111827]/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-950 border border-emerald-700/50 text-base">
                  👨‍💻
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Rohan Sharma</h3>
                  <span className="text-[10px] text-emerald-400 font-mono">● Protected by TruthCircle</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
                USER A
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms or chats..."
                className="w-full bg-slate-900 text-xs text-slate-200 placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Active Rooms ({filteredRooms.length})
            </div>

            {filteredRooms.map((room) => {
              const isActive = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                    isActive 
                      ? 'bg-slate-800/90 border border-slate-700 shadow-sm' 
                      : 'hover:bg-slate-850 text-slate-300'
                  }`}
                >
                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-xl border border-slate-700">
                      {room.avatar || '💬'}
                    </span>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-900"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-100 truncate">{room.name}</h4>
                      {room.unread_count > 0 && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-emerald-600 text-[10px] font-bold text-white flex items-center justify-center">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {room.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono bg-slate-950/40">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Nexconn Engine
            </span>
            <span>v1.0.0</span>
          </div>
        </aside>
        )}

        {/* Central Chat Panes (Supports Single View and Dual Split-Screen View) */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Left Pane: User A ("Rohan") */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            <ChatPane
              room={currentRoom}
              currentUser={{ id: 'rohan', name: 'Rohan (You)', avatar: '👨‍💻' }}
              messages={messages}
              onSendMessage={handleSendMessageUserA}
              onFactCheckMessage={handleFactCheckMessage}
              onInspectCard={(card) => {
                setActiveCardForInspection(card);
                setIsDrawerOpen(true);
              }}
              typingStatus={typingStatus}
              isSplitView={isSplitScreen}
            />
          </div>

          {/* Right Pane: User B ("Maa") in Split-Screen Multiplayer Stage Mode */}
          {isSplitScreen && (
            <div className="flex-1 flex flex-col h-full min-w-0 border-l-2 border-indigo-500/40 animate-in slide-in-from-right duration-300">
              <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 px-3 py-1 border-b border-indigo-500/30 text-[11px] font-mono font-semibold text-purple-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Synced Phone 2: Maa's Device (User B)</span>
                </span>
                <span className="text-emerald-400 font-bold">● LIVE PEER SYNCED</span>
              </div>
              <ChatPane
                room={currentRoom}
                currentUser={{ id: 'maa', name: 'Maa (Elder)', avatar: '👵' }}
                messages={messages}
                onSendMessage={handleSendMessageUserB}
                onFactCheckMessage={handleFactCheckMessage}
                onInspectCard={(card) => {
                  setActiveCardForInspection(card);
                  setIsDrawerOpen(true);
                }}
                typingStatus={typingStatus}
                isSplitView={true}
              />
            </div>
          )}

        </main>
      </div>

      {/* 3. Under-the-Hood API Telemetry & Evidence Drawer (Judge Inspector) */}
      <EvidenceDrawer
        card={activeCardForInspection}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

    </div>
  );
}

