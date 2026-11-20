# 🛡️ TruthCircle — Real-Time Misinformation Firewall for Group Chats

> **Stage-Ready Hackathon Submission**  
> Stopping viral disinformation inside group chats before it causes panic, radicalization, or financial fraud.

[![Multi-Sponsor Integration](https://img.shields.io/badge/Sponsors-Nexconn%20%7C%20SerpApi%20%7C%20You.com-emerald.svg)](#authentic-multi-sponsor-architecture)
[![FastAPI & React 18](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20Tailwind-blue.svg)](#architecture--quickstart)
[![Multiplayer Sync](https://img.shields.io/badge/Sync-WebSocket%20%2B%20BroadcastChannel-purple.svg)](#killer-features-that-impress-hackathon-judges)

---

## 🌟 Overview & Problem Statement
Every morning, millions of encrypted family and community group chats receive sensational forwards—ranging from fake financial deadlines (*"RBI discontinuing ₹500 notes"*) to bogus health rumors (*"5G towers killing birds"*) and fabricated awards (*"UNESCO declares national anthem best"*).

Most people hesitate to challenge elders or group admins because confronting them feels confrontational. **TruthCircle** acts as a gentle, intelligent in-chat guardian:
1. **Listens inline** for suspicious forwards, URLs, or `@truthcircle` mentions.
2. **Deploys a multi-engine fact-check pipeline** in real time across mainstream news, dedicated debunkers, and full-article journalistic extractions.
3. **Posts an authoritative "Credibility Card"** directly into the conversation stream with an **Outlet Consensus Meter**, citations, and an **Indian Family "Copy Polite Reply"** button (English, हिन्दी, Hinglish) so anyone can debunk rumors without causing embarrassment.

---

## 🏛️ Authentic Multi-Sponsor Architecture

TruthCircle deeply integrates all three sponsor technologies into its core data pipeline and user interface:

### 1. Nexconn Chat SDK (`@nexconn/engine`, `@nexconn/chat`)
- **Direct Connection & Hybrid Resilience**: Configured via `VITE_NEXCONN_APP_ID`. Implemented through `nexconnAdapter.js`, which bridges direct engine connectivity with an automatic local **WebSocket + `BroadcastChannel`** message bus.
- **Instant Stage Multiplayer**: Allows opening a second browser window or toggling the top-bar **"Split-Screen Multiplayer"** button to mirror **User A ("Rohan")** and **User B ("Maa")** simultaneously with zero configuration and zero ngrok tunnels.
- **Capabilities**: Powers multi-user rooms (`Family Circle`, `Mumbai Commuters & News`, `Enterprise Brand Watch`), live typing indicators, online member avatars, read receipts, and real-time `CredibilityCard` broadcasting.

### 2. SerpApi Multi-Engine Pipeline (`serpapi.com/search.json`)
- **News Consensus Engine (`engine="google_news"`)**:
  - Parameters: `engine="google_news"`, `q=claim`, `gl="in"`, `hl="en"`.
  - Gauges how mainstream national (e.g. *The Hindu, Indian Express, NDTV, Mint*) and international news outlets cover the claim.
- **Fact-Check Hunter Engine (`engine="google"`)**:
  - Parameters: `engine="google"`, `q=f"{claim} fact check PIB AltNews BoomLive"`, `gl="in"`.
  - Specifically hunts verified fact-checking desks (Press Information Bureau Fact Check, AltNews, BOOM Live, The Quint WebQoof).
- **Deep Page Extraction (`engine="extract"`)**:
  - Parameters: `engine="extract"`, `url=target_url`, `output="md"`, `include_markdown=true`.
  - Pulls clean full-article Markdown text from the top debunking article—guaranteeing that verdicts are grounded in full investigative journalism, not superficial search snippets.

### 3. You.com Cited Research & Search API (`X-API-Key` header)
- **Endpoint**: `https://api.ydc-index.io/search` and `https://api.ydc-index.io/rag`.
- **RAG Synthesis**: Ingests the claim alongside the deep Markdown extract to synthesize:
  - Neutral, definitive verdict: `VERIFIED` | `MISLEADING` | `FALSE` | `UNVERIFIED`.
  - 0–100 confidence score (e.g. `98% Confidence`).
  - Clickable web citations with domain trust ratings.
  - Multi-language polite reply text (English, Hindi हिन्दी, Hinglish).

---

## 🚀 Killer Features Built for Judges

| Feature | Description |
|---|---|
| **1. Inline "Credibility Card"** | High-contrast semantic header (`FALSE` in crimson, `MISLEADING` in amber, `VERIFIED` in emerald), animated confidence gauge, **Outlet Consensus Meter** (`0 Confirmed • 6 Debunked`), clickable source pills, and **"Copy Polite Reply"** with English/हिन्दी/Hinglish toggle. |
| **2. Under-the-Hood Evidence Drawer** | Slide-out technical drawer showing live latency badges (`SerpApi News: 384ms`, `SerpApi Extract: 528ms`, `You.com: 640ms`), raw extracted Markdown journalism, citation graph, and collapsible JSON payloads. |
| **3. One-Click Split-Screen Multiplayer** | Top-bar toggle splitting the screen into two synced phones (**User A: "Rohan"** and **User B: "Maa"**). Forward a rumor from Maa's side, click "Fact-Check" from Rohan's side, and watch the Credibility Card render in both views simultaneously. |
| **4. Misinformation Radar & Curated Presets** | Header tracking session stats (`Claims Checked`, `Rumors Stopped`, `Avg Speed`) with 4 curated real-world WhatsApp rumor presets (UNESCO Anthem, 5G Birds, RBI ₹500, ISRO Moon Landing). |

---

## 📁 Project Structure

```text
truthcircle/
├── .env.example               # Sponsor API keys & configuration
├── README.md                  # Comprehensive documentation
├── backend/
│   ├── main.py                # FastAPI + WebSockets + /api/verify + /api/health + /api/webhook/nexconn
│   ├── models.py              # Strict Pydantic v2 schemas
│   ├── cache_store.py         # Persistent JSON cache for instant sub-80ms stage evaluations
│   ├── services/
│   │   ├── serp_service.py    # Async httpx client for SerpApi (news, hunter, extract md)
│   │   ├── you_service.py     # Async httpx client for You.com Cited Research
│   │   └── orchestrator.py    # Concurrent asyncio.gather pipeline + synthesis engine
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx            # Main app wiring rooms, split-screen, and inspector drawer
        ├── services/
        │   ├── api.js         # REST endpoints client
        │   └── nexconnAdapter.js # Resilient Nexconn engine + WebSocket + BroadcastChannel bus
        └── components/
            ├── ChatPane.jsx        # Reusable chat room pane (supports single & split views)
            ├── CredibilityCard.jsx # Rich semantic card with language toggle & evidence trigger
            ├── EvidenceDrawer.jsx  # Slide-out inspector showing SerpApi Extract MD + You.com citations
            └── DemoControlBar.jsx  # Radar metrics, preset injector & split-screen toggle
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Note: If API keys are omitted, TruthCircle automatically activates its high-fidelity resilient demo engine with pre-loaded benchmarks so stage demos never stall or fail!)*

### 3. Start Backend Server
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API runs at `http://127.0.0.1:8000` (Docs available at `http://127.0.0.1:8000/docs`).

### 4. Start Frontend Client
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🎯 Stage Presentation Script (2-Minute Demo)

1. **The Hook (0:00 - 0:30)**:
   - Click **"Split-Screen Multiplayer"** in the top bar. Show judges the two synced phones: **Rohan** on the left, **Maa** on the right.
   - Click the preset: **"🇮🇳 UNESCO Best Anthem"**. Notice how Uncle Vijay forwards the viral rumor into the family group on both screens.
2. **The Verification (0:30 - 1:00)**:
   - From Rohan's side, click **"🔍 Fact-Check"** on the forwarded bubble (or type `@truthcircle`).
   - Watch the live typing bubble: *"TruthCircle AI is analyzing fact-check evidence..."*
   - In less than a second, the **Credibility Card** renders with high-contrast crimson `FALSE HOAX`, `98% Confidence`, and `0 Confirmed • 6 Debunked (PIB, BoomLive, The Quint)`.
3. **The Family Harmony Angle (1:00 - 1:25)**:
   - Toggle the language pills from **English** to **हिन्दी** to **Hinglish**.
   - Click **"📋 Copy Polite Reply"** to demonstrate how TruthCircle empowers users to correct elders gently without causing family tension.
4. **The Under-The-Hood Inspection for Judges (1:25 - 2:00)**:
   - Click **"Inspect Evidence & APIs"**. The technical Evidence Drawer slides open.
   - Point out the latency badges: `SerpApi News: 384ms`, `SerpApi Extract (MD): 528ms`, `You.com Cited Research: 640ms`.
   - Switch to **"SerpApi Deep Extract (MD)"** tab and show the raw extracted full-article Markdown text, proving that the verification is grounded in full investigative journalism.
   - Switch to **"You.com Citation Graph"** to showcase the authoritative domain trust metrics.

---

## 🛡️ License
Built with ❤️ for the Build-a-thon. MIT License.

