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
import RadarModal from './components/RadarModal';
import RoomLobby from './components/RoomLobby';
import { fetchPresets, fetchHistory, createRoomWithCode, joinRoomWithCode } from './services/api';
import NexconnAdapter, { nexconn } from './services/nexconnAdapter';

export default function App() {
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null); // null = show lobby
  const [activeUserName, setActiveUserName] = useState('Rohan');
  const [phoneBUserName, setPhoneBUserName] = useState('Maa');
  const [lobbyError, setLobbyError] = useState(null);
  const [isLobbyLoading, setIsLobbyLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [presets, setPresets] = useState([]);
  const [history, setHistory] = useState([]);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCardForInspection, setActiveCardForInspection] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMembers, setNewRoomMembers] = useState('');
  const [newRoomAvatar, setNewRoomAvatar] = useState('💬');
  const [typingStatus, setTypingStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingSteps, setVerifyingSteps] = useState(null); // animated @truthcircle progress
  const [cardVotes, setCardVotes] = useState({}); // { [cardId]: { helpful: string[], needsContext: string[] } }

  // Radar session counters
  const [stats, setStats] = useState({
    checked: 0,
    stopped: 0,
    avgSpeed: 0
  });

  // Dedicated secondary Nexconn adapter for User B in Split-Screen Mode
  const nexconnUserB = useRef(new NexconnAdapter());

  // Initial data loading
  useEffect(() => {
    async function init() {
      const [fetchedPresets, fetchedHistory] = await Promise.all([
        fetchPresets(),
        fetchHistory()
      ]);
      setPresets(fetchedPresets);
      if (fetchedHistory && fetchedHistory.length > 0) {
        setHistory(fetchedHistory);
      }
    }
    init();
  }, []);

  // Connect Primary Nexconn Adapter (User A)
  useEffect(() => {
    if (!activeRoomId) return; // Don't connect until we have a room
    nexconn.connect({
      roomId: activeRoomId,
      userId: 'userA',
      userName: activeUserName
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

    const unsubVote = nexconn.onVote((voteEvent) => {
      if (!voteEvent || !voteEvent.card_id) return;
      setCardVotes((prev) => {
        const current = prev[voteEvent.card_id] || { helpful: ['initial-bot-reviewer'], needsContext: [] };
        const { user_id, vote_type } = voteEvent;
        
        let newHelpful = [...(current.helpful || [])];
        let newContext = [...(current.needsContext || [])];

        if (vote_type === 'helpful') {
          if (newHelpful.includes(user_id)) {
            newHelpful = newHelpful.filter(id => id !== user_id);
          } else {
            newHelpful.push(user_id);
            newContext = newContext.filter(id => id !== user_id);
          }
        } else if (vote_type === 'needsContext') {
          if (newContext.includes(user_id)) {
            newContext = newContext.filter(id => id !== user_id);
          } else {
            newContext.push(user_id);
            newHelpful = newHelpful.filter(id => id !== user_id);
          }
        }

        return {
          ...prev,
          [voteEvent.card_id]: {
            helpful: newHelpful,
            needsContext: newContext
          }
        };
      });
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubVote();
      nexconn.disconnect();
    };
  }, [activeRoomId]);

  // Connect Secondary Nexconn Adapter for User B when split screen is active
  useEffect(() => {
    if (isSplitScreen && activeRoomId) {
      nexconnUserB.current.connect({
        roomId: activeRoomId,
        userId: 'userB',
        userName: phoneBUserName
      });
    } else {
      nexconnUserB.current.disconnect();
    }
    return () => {
      nexconnUserB.current.disconnect();
    };
  }, [isSplitScreen, activeRoomId]);

  // Handle live multiplayer consensus vote
  const handleConsensusVote = (cardId, voteType, userId = 'rohan') => {
    nexconn.sendVote({
      card_id: cardId,
      user_id: userId,
      vote_type: voteType,
      room_id: activeRoomId
    });
  };

  // ─── RoomLobby handlers (TC-XXXX invite code flow) ──────────────────────────
  const handleLobbyCreate = async ({ groupName, creatorName }) => {
    setIsLobbyLoading(true);
    setLobbyError(null);
    try {
      const room = await createRoomWithCode({ groupName, creatorName });
      setRooms(prev => [...prev, room]);
      setActiveUserName(creatorName);
      setActiveRoomId(room.invite_code);
      setMessages([]);
    } catch (err) {
      setLobbyError('Failed to create room. Is the backend running?');
    } finally {
      setIsLobbyLoading(false);
    }
  };

  const handleLobbyJoin = async ({ inviteCode, userName }) => {
    setIsLobbyLoading(true);
    setLobbyError(null);
    try {
      const room = await joinRoomWithCode({ inviteCode, userName });
      // Add to rooms list if not already there
      setRooms(prev => prev.some(r => r.id === room.id) ? prev : [...prev, room]);
      setActiveUserName(userName);
      setActiveRoomId(room.invite_code);
      setMessages([]);
    } catch (err) {
      setLobbyError(`Room code "${inviteCode}" not found. Ask the group creator for the correct code.`);
    } finally {
      setIsLobbyLoading(false);
    }
  };

  // Switch Room
  const handleSelectRoom = async (roomId) => {
    setActiveRoomId(roomId);
    setMessages([]);
  };

  // Create New Group via sidebar — opens lobby in create tab overlay
  const handleCreateNewGroup = async (e) => {
    e?.preventDefault();
    if (!newRoomName.trim()) return;
    setIsLobbyLoading(true);
    try {
      const room = await createRoomWithCode({ groupName: newRoomName.trim(), creatorName: newRoomMembers.trim() || activeUserName });
      setRooms(prev => [...prev, room]);
      setActiveRoomId(room.invite_code);
      setMessages([]);
      setIsCreateRoomOpen(false);
      setNewRoomName('');
      setNewRoomMembers('');
    } catch {
      // fallback: local room
      const roomId = `room-${Date.now().toString(36)}`;
      const newRoomObj = {
        id: roomId, name: newRoomName.trim(), description: `Created live`,
        unread_count: 0, avatar: newRoomAvatar || '💬',
        members: [activeUserName, 'TruthCircle Bot'],
        invite_code: `TC-LOCAL`, is_protected: true
      };
      setRooms(prev => [...prev, newRoomObj]);
      setActiveRoomId(roomId);
      setMessages([]);
      setIsCreateRoomOpen(false);
      setNewRoomName('');
      setNewRoomMembers('');
    } finally {
      setIsLobbyLoading(false);
    }
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
    await handleTruthCircleVerify(claim);
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

  // ─── Live @truthcircle verification flow ────────────────────────────────
  const VERIFY_STEP_LABELS = [
    'Step 1: Parsing claim & extracting key entities...',
    'Step 2: Querying SerpApi Google News (gl="in") for Indian outlet consensus...',
    'Step 3: Running SerpApi Fact-Check Hunter (PIB / AltNews / BoomLive)...',
    'Step 4: Extracting full-article Markdown via SerpApi engine="extract"...',
    'Step 5: Cross-verifying live web citations via You.com Cited Research API...',
  ];

  const executeFactCheckLive = async (claimText, author = 'User', sourceType = 'text', extractedOcrText = null) => {
    setIsLoading(true);
    setTypingStatus({ is_typing: true, sender_name: 'TruthCircle AI' });
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          claim: claimText, 
          room_id: activeRoomId, 
          author, 
          force_refresh: true,
          source_type: sourceType,
          extracted_ocr_text: extractedOcrText
        })
      });
      const data = await res.json();
      setStats(prev => ({
        checked: prev.checked + 1,
        stopped: data.card.verdict === 'FALSE' || data.card.verdict === 'MISLEADING' ? prev.stopped + 1 : prev.stopped,
        avgSpeed: data.processing_time_ms || prev.avgSpeed
      }));
      // Append to live history
      setHistory(prev => [
        {
          id: data.card.id,
          claim: data.card.claim,
          verdict: data.card.verdict,
          confidence_score: data.card.confidence_score,
          source_type: data.card.source_type || sourceType,
          extracted_ocr_text: data.card.extracted_ocr_text || extractedOcrText,
          created_at: data.card.created_at || new Date().toISOString(),
          primary_source: data.card.citations?.[0]?.domain || 'factcheck.in',
          latency_ms: data.card.processing_time_ms || 420
        },
        ...prev
      ]);
      setActiveCardForInspection(data.card);
      // Post the credibility card as a bot message in the chat stream
      const botMsg = {
        id: `msg-bot-${Date.now()}`,
        room_id: activeRoomId,
        sender_id: 'truthcircle-bot',
        sender_name: 'TruthCircle Bot',
        sender_avatar: '🛡️',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_forwarded: false,
        card: data.card
      };
      nexconn.sendMessage(botMsg);
      if (data.card.verdict === 'VERIFIED') {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.75 } });
      }
    } catch (err) {
      console.error('[FactCheck Live] Error:', err);
    } finally {
      setIsLoading(false);
      setTypingStatus({ is_typing: false });
    }
  };

  const handleTruthCircleVerify = async (claimText, sourceType = 'text', extractedOcrText = null) => {
    setVerifyingSteps([]);
    
    // Customize Step 1 if verifying image OCR
    const initialSteps = sourceType === 'image_ocr' ? [
      'Step 1: 🖼️ Scanning screenshot text via OCR & extracting claim entities...',
      'Step 2: Querying SerpApi Google News (gl="in") for Indian outlet consensus...',
      'Step 3: Running SerpApi Fact-Check Hunter (PIB / AltNews / BoomLive)...',
      'Step 4: Extracting full-article Markdown via SerpApi engine="extract"...',
      'Step 5: Cross-verifying live web citations via You.com Cited Research API...',
    ] : VERIFY_STEP_LABELS;

    for (let i = 0; i < initialSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 340));
      setVerifyingSteps(prev => [...(prev || []), initialSteps[i]]);
    }
    // Brief pause so the user sees all 5 steps, then hit the real API
    await new Promise(resolve => setTimeout(resolve, 400));
    setVerifyingSteps(null);
    await executeFactCheckLive(claimText, 'User', sourceType, extractedOcrText);
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
    id: activeRoomId || 'room',
    name: 'Group Chat',
    avatar: '💬',
    members: [activeUserName, phoneBUserName, 'TruthCircle Bot']
  };

  const filteredRooms = rooms.filter((r) => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100 font-sans">

      {/* ── Lobby Gate: shown when no active room ── */}
      {!activeRoomId && (
        <RoomLobby
          onCreateRoom={handleLobbyCreate}
          onJoinRoom={handleLobbyJoin}
          error={lobbyError}
          isLoading={isLobbyLoading}
        />
      )}

      {/* ── Main App: shown once room is active ── */}
      {activeRoomId && (
        <>
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
        onOpenRadarModal={() => setIsRadarModalOpen(true)}
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
                  <h3 className="text-xs font-bold text-slate-200">{activeUserName}</h3>
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
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Active Rooms ({filteredRooms.length})</span>
              <button
                type="button"
                onClick={() => setIsCreateRoomOpen(true)}
                className="flex items-center gap-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold transition-all active:scale-95"
              >
                <span>➕ New Group</span>
              </button>
            </div>

            {/* Inline New Group Input Bar if open */}
            {isCreateRoomOpen && (
              <form onSubmit={handleCreateNewGroup} className="bg-slate-900/90 border border-emerald-500/50 p-2.5 rounded-xl space-y-2 mb-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400">Create New Group</span>
                  <button 
                    type="button" 
                    onClick={() => setIsCreateRoomOpen(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newRoomAvatar}
                    onChange={(e) => setNewRoomAvatar(e.target.value)}
                    placeholder="💬"
                    className="w-10 bg-slate-950 text-center text-sm border border-slate-750 rounded p-1"
                    title="Room Emoji Avatar"
                  />
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Beyond 9to5 Judges"
                    className="flex-1 bg-slate-950 text-xs text-slate-200 border border-slate-750 rounded px-2 py-1 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
                <input
                  type="text"
                  value={newRoomMembers}
                  onChange={(e) => setNewRoomMembers(e.target.value)}
                  placeholder="Members (e.g. Pujitha, Teammate)"
                  className="w-full bg-slate-950 text-[11px] text-slate-300 border border-slate-750 rounded px-2 py-1 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded transition-all shadow-md active:scale-95"
                >
                  Create & Join Room
                </button>
              </form>
            )}

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
            <button
              type="button"
              onClick={() => { setActiveRoomId(null); setMessages([]); setLobbyError(null); }}
              className="text-[10px] text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-700/50 px-2 py-0.5 rounded transition-all"
              title="Leave current room and return to lobby"
            >
              ⬅ Leave Room
            </button>
          </div>
        </aside>
        )}

        {/* Central Chat Panes (Supports Single View and Dual Split-Screen View) */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Left Pane: User A */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            <ChatPane
              room={currentRoom}
              currentUser={{ id: 'userA', name: `${activeUserName} (You)`, avatar: '👨‍💻' }}
              messages={messages}
              onSendMessage={handleSendMessageUserA}
              onFactCheckMessage={handleFactCheckMessage}
              onInspectCard={(card) => {
                setActiveCardForInspection(card);
                setIsDrawerOpen(true);
              }}
              onTruthCircleVerify={handleTruthCircleVerify}
              onVote={(cId, vType) => handleConsensusVote(cId, vType, 'userA')}
              votes={cardVotes}
              verifyingSteps={verifyingSteps}
              typingStatus={typingStatus}
              isSplitView={isSplitScreen}
            />
          </div>

          {/* Right Pane: User B in Split-Screen Multiplayer Stage Mode */}
          {isSplitScreen && (
            <div className="flex-1 flex flex-col h-full min-w-0 border-l-2 border-indigo-500/40 animate-in slide-in-from-right duration-300">
              <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 px-3 py-1 border-b border-indigo-500/30 text-[11px] font-mono font-semibold text-purple-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Synced Phone 2: {phoneBUserName}'s Device (User B)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">● LIVE PEER SYNCED</span>
                  {currentRoom.invite_code && (
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded">
                      Code: {currentRoom.invite_code}
                    </span>
                  )}
                </div>
              </div>
              <ChatPane
                room={currentRoom}
                currentUser={{ id: 'userB', name: `${phoneBUserName}`, avatar: '👵' }}
                messages={messages}
                onSendMessage={handleSendMessageUserB}
                onFactCheckMessage={handleFactCheckMessage}
                onInspectCard={(card) => {
                  setActiveCardForInspection(card);
                  setIsDrawerOpen(true);
                }}
                onTruthCircleVerify={handleTruthCircleVerify}
                onVote={(cId, vType) => handleConsensusVote(cId, vType, 'userB')}
                votes={cardVotes}
                verifyingSteps={verifyingSteps}
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

      {/* 4. Enterprise Misinformation Radar & Compliance Audit Modal */}
      <RadarModal
        isOpen={isRadarModalOpen}
        onClose={() => setIsRadarModalOpen(false)}
        stats={stats}
        history={history}
        activeRoomId={activeRoomId}
      />
    </>
    )}
    </div>
  );
}

