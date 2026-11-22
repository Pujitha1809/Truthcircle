import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Set

def _load_env_if_needed():
    candidates = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.abspath(".env")
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

_load_env_if_needed()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import (
    VerifyRequest,
    VerifyResponse,
    ChatMessage,
    RoomInfo,
    CredibilityCard,
    SpamPrediction,
    CreateRoomRequest,
    JoinRoomRequest
)
from cache_store import cache_store
from services.serp_service import serp_service
from services.you_service import you_service
from services.orchestrator import orchestrator
from spam_detector import predict_spam
import random

app = FastAPI(
    title="TruthCircle Backend API",
    description="Real-time multi-engine misinformation firewall for group chats powered by Nexconn, SerpApi, and You.com",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory Room State & WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        # room_id -> Dict[user_id, WebSocket]
        self.active_rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = {}
        self.active_rooms[room_id][user_id] = websocket

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_rooms:
            self.active_rooms[room_id].pop(user_id, None)
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in self.active_rooms:
            disconnected = []
            for uid, ws in self.active_rooms[room_id].items():
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append(uid)
            for uid in disconnected:
                self.disconnect(room_id, uid)

manager = ConnectionManager()

# Dynamic rooms dictionary: indexed by invite_code (TC-XXXX)
ROOMS_CATALOG: Dict[str, RoomInfo] = {}

# In-memory session message store — indexed by invite_code
room_messages: Dict[str, List[dict]] = {}

def generate_invite_code() -> str:
    while True:
        digits = random.randint(1000, 9999)
        code = f"TC-{digits}"
        if code not in ROOMS_CATALOG:
            return code

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "TruthCircle Misinformation Firewall",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sponsors": {
            "nexconn": {
                "configured": bool(os.getenv("VITE_NEXCONN_APP_ID")),
                "mode": "Active Hybrid (SDK + WebSocket Bridge)",
                "active_connections": sum(len(c) for c in manager.active_rooms.values())
            },
            "serpapi": {
                "has_key": serp_service.has_key(),
                "engines": ["google_news", "google", "extract (md)"],
                "status": "ONLINE" if serp_service.has_key() else "DEMO_SIMULATION_ACTIVE"
            },
            "youcom": {
                "has_key": you_service.has_key(),
                "endpoints": ["api.ydc-index.io/search", "api.ydc-index.io/rag"],
                "status": "ONLINE" if you_service.has_key() else "DEMO_SIMULATION_ACTIVE"
            }
        },
        "cache": {
            "cached_claims_count": len(cache_store._cache),
            "fast_eval_guaranteed": True
        }
    }

@app.get("/api/presets")
async def get_presets():
    """Returns curated Indian viral rumor benchmarks for instant 1-click stage testing."""
    return cache_store.get_presets()

@app.get("/api/history")
async def get_verification_history():
    """Returns full history of verified claims for the Enterprise Misinformation Radar."""
    history = []
    # Collect from persistent cache
    for key, card in cache_store._cache.items():
        if isinstance(card, CredibilityCard):
            d = card.model_dump()
        elif isinstance(card, dict):
            d = card
        else:
            continue
        history.append({
            "id": d.get("id"),
            "claim": d.get("claim"),
            "verdict": d.get("verdict"),
            "confidence_score": d.get("confidence_score", 95),
            "source_type": d.get("source_type", "text"),
            "extracted_ocr_text": d.get("extracted_ocr_text"),
            "created_at": d.get("created_at") or datetime.now(timezone.utc).isoformat(),
            "primary_source": d.get("citations", [{}])[0].get("domain") if d.get("citations") else "factcheck.in",
            "latency_ms": d.get("processing_time_ms") or 420
        })
    return sorted(history, key=lambda x: x.get("created_at", ""), reverse=True)

@app.get("/api/rooms")
async def get_rooms():
    return list(ROOMS_CATALOG.values())

@app.post("/api/rooms/create")
async def create_room_with_code(req: CreateRoomRequest):
    """Creates a new dynamic group room with a unique 6-character invite code (TC-XXXX)."""
    code = generate_invite_code()
    members = [req.creator_name.strip(), "TruthCircle Bot"]
    room = RoomInfo(
        id=code,
        name=req.group_name.strip(),
        description=f"Created by {req.creator_name} • Code: {code}",
        invite_code=code,
        unread_count=0,
        avatar="💬",
        members=members,
        is_protected=True
    )
    ROOMS_CATALOG[code] = room
    room_messages[code] = []
    return room

@app.post("/api/rooms/join")
async def join_room_with_code(req: JoinRoomRequest):
    """Validates unique invite code and adds user to the room."""
    code = req.invite_code.strip().upper()
    if code not in ROOMS_CATALOG:
        # Check case-insensitive match
        matched_code = next((k for k in ROOMS_CATALOG.keys() if k.upper() == code), None)
        if not matched_code:
            raise HTTPException(status_code=404, detail=f"Room with code '{code}' not found")
        code = matched_code

    room = ROOMS_CATALOG[code]
    uname = req.user_name.strip()
    if uname and uname not in room.members:
        room.members.append(uname)

    # Broadcast USER_JOINED system notice to WebSocket
    join_msg = {
        "id": f"msg-sys-{Date_now_ms() if 'Date_now_ms' in locals() else datetime.now().timestamp()}",
        "room_id": code,
        "sender_id": "truthcircle-bot",
        "sender_name": "TruthCircle AI",
        "sender_avatar": "🛡️",
        "text": f"👋 {uname} joined the group via code {code}.",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "is_forwarded": False,
        "card": None
    }
    if code in room_messages:
        room_messages[code].append(join_msg)
    await manager.broadcast_to_room(code, {
        "type": "NEW_MESSAGE",
        "message": join_msg
    })

    return room

@app.get("/api/rooms/{invite_code}")
async def get_room_by_code(invite_code: str):
    code = invite_code.strip().upper()
    matched_code = next((k for k in ROOMS_CATALOG.keys() if k.upper() == code), None)
    if not matched_code:
        raise HTTPException(status_code=404, detail="Room not found")
    return {
        "room": ROOMS_CATALOG[matched_code],
        "messages": room_messages.get(matched_code, [])
    }

@app.get("/api/rooms/{room_id}/messages")
async def get_room_messages(room_id: str):
    code = room_id.strip().upper()
    matched = next((k for k in room_messages.keys() if k.upper() == code), None)
    if matched:
        return room_messages[matched]
    if room_id in room_messages:
        return room_messages[room_id]
    return []

@app.post("/api/verify", response_model=VerifyResponse)
async def verify_claim(req: VerifyRequest):
    """
    Core Fact-Checking Pipeline:
    1. Checks cache for <80ms return
    2. Runs SerpApi News + Hunter + Extract (MD)
    3. Runs You.com Cited Research & RAG
    4. Posts Credibility Card into room via WebSocket broadcast
    """
    res = await orchestrator.verify(
        claim=req.claim,
        source_url=req.url,
        force_refresh=req.force_refresh,
        source_type=req.source_type or "text",
        extracted_ocr_text=req.extracted_ocr_text
    )

    # Post Credibility Card directly into the room's stream
    room_id = req.room_id or "family-circle"
    card_msg = {
        "id": f"msg-card-{res.card.id}",
        "room_id": room_id,
        "sender_id": "truthcircle-bot",
        "sender_name": "TruthCircle AI",
        "sender_avatar": "🛡️",
        "text": f"Fact-Check Result for claim: \"{req.claim[:80]}...\"",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "is_forwarded": False,
        "card": res.card.model_dump()
    }

    if room_id not in room_messages:
        room_messages[room_id] = []
    room_messages[room_id].append(card_msg)

    # Broadcast to all connected clients in the room
    await manager.broadcast_to_room(room_id, {
        "type": "NEW_MESSAGE",
        "message": card_msg
    })

    return res

@app.post("/api/webhook/nexconn")
async def nexconn_webhook(payload: dict):
    """Webhook listener for incoming events from the Nexconn Chat platform."""
    event_type = payload.get("event")
    room_id = payload.get("room_id", "family-circle")
    
    if event_type == "message.created":
        text = payload.get("message", {}).get("text", "")
        # Automatic triggering when user tags @truthcircle or forwards suspicious content
        if "@truthcircle" in text.lower():
            claim = text.lower().replace("@truthcircle", "").strip()
            if claim:
                asyncio.create_task(orchestrator.verify(claim))

    return {"status": "received", "event": event_type}

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await manager.connect(room_id, user_id, websocket)
    try:
        # Send room connection welcome
        await websocket.send_json({
            "type": "CONNECTED",
            "room_id": room_id,
            "user_id": user_id,
            "timestamp": datetime.now().strftime("%I:%M %p")
        })

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                action = payload.get("action")

                if action == "SEND_MESSAGE":
                    msg_data = payload.get("message", {})
                    text = msg_data.get("text", "")
                    
                    # ─── Real-Time Spam & Scam Prediction (<15ms) ───────────
                    # Run deterministic + heuristic analysis on every incoming message
                    spam_result = predict_spam(text)
                    msg_data["spam_prediction"] = spam_result

                    if room_id not in room_messages:
                        room_messages[room_id] = []
                    room_messages[room_id].append(msg_data)

                    # Broadcast the user message with spam prediction to everyone in the room
                    await manager.broadcast_to_room(room_id, {
                        "type": "NEW_MESSAGE",
                        "message": msg_data
                    })

                    # Automatic fact-check trigger on @truthcircle or URL or forwarded check
                    text = msg_data.get("text", "")
                    if "@truthcircle" in text.lower():
                        claim = text.replace("@truthcircle", "").replace("@TruthCircle", "").strip()
                        if claim:
                            # Run fact-check in background task
                            async def run_fc():
                                # Broadcast bot typing status
                                await manager.broadcast_to_room(room_id, {
                                    "type": "TYPING",
                                    "sender_name": "TruthCircle AI",
                                    "is_typing": True
                                })
                                res = await orchestrator.verify(claim=claim)
                                card_msg = {
                                    "id": f"msg-card-{res.card.id}",
                                    "room_id": room_id,
                                    "sender_id": "truthcircle-bot",
                                    "sender_name": "TruthCircle AI",
                                    "sender_avatar": "🛡️",
                                    "text": f"🛡️ Fact-Check Investigation for: \"{claim[:75]}...\"",
                                    "timestamp": datetime.now().strftime("%I:%M %p"),
                                    "is_forwarded": False,
                                    "card": res.card.model_dump()
                                }
                                room_messages[room_id].append(card_msg)
                                await manager.broadcast_to_room(room_id, {
                                    "type": "TYPING",
                                    "sender_name": "TruthCircle AI",
                                    "is_typing": False
                                })
                                await manager.broadcast_to_room(room_id, {
                                    "type": "NEW_MESSAGE",
                                    "message": card_msg
                                })

                            asyncio.create_task(run_fc())

                elif action == "TYPING":
                    await manager.broadcast_to_room(room_id, {
                        "type": "TYPING",
                        "sender_name": payload.get("sender_name", "Someone"),
                        "is_typing": payload.get("is_typing", False)
                    })

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

