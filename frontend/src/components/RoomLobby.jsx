import React, { useState } from 'react';
import { ShieldCheck, Plus, ArrowRight, KeyRound, Sparkles, AlertCircle } from 'lucide-react';

export default function RoomLobby({ onCreateRoom, onJoinRoom, error, isLoading }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [creatorName, setCreatorName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [joinUserName, setJoinUserName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!creatorName.trim() || !groupName.trim()) return;
    onCreateRoom({
      groupName: groupName.trim(),
      creatorName: creatorName.trim()
    });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinUserName.trim() || !inviteCode.trim()) return;
    onJoinRoom({
      inviteCode: inviteCode.trim().toUpperCase(),
      userName: joinUserName.trim()
    });
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#070a12] via-[#0d121f] to-[#070a12] p-4 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            <span>TruthCircle</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Real-Time Misinformation Firewall with Automatic Spam Detection & Deep Fact-Checking
          </p>
        </div>

        {/* Tab Switcher: Create vs Join */}
        <div className="grid grid-cols-2 bg-slate-900 p-1 rounded-xl border border-slate-800 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'create'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create New Group
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'join'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/50 border border-red-800/60 p-3 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Create Room Form */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Name / Handle</label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Rohan Sharma"
                className="w-full bg-slate-900 text-xs text-slate-200 placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Group Room Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Beyond 9to5 Judges Group"
                className="w-full bg-slate-900 text-xs text-slate-200 placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Creating a group generates a unique 6-character code (e.g. <span className="font-mono text-emerald-400 font-semibold">TC-4829</span>) to invite friends or judges.
            </p>

            <button
              type="submit"
              disabled={isLoading || !creatorName.trim() || !groupName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isLoading ? 'Creating Group...' : 'Create Group & Generate Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Join Room Form */
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Name</label>
              <input
                type="text"
                value={joinUserName}
                onChange={(e) => setJoinUserName(e.target.value)}
                placeholder="e.g. Maa / Teammate / Judge"
                className="w-full bg-slate-900 text-xs text-slate-200 placeholder-slate-500 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">6-Character Invite Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="TC-XXXX"
                  maxLength={7}
                  className="w-full bg-slate-900 text-xs font-mono font-bold tracking-widest text-emerald-400 placeholder-slate-500 pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Enter the invite code shared by the group creator to join the live room session.
            </p>

            <button
              type="submit"
              disabled={isLoading || !joinUserName.trim() || !inviteCode.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isLoading ? 'Joining Group...' : 'Join Group Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
