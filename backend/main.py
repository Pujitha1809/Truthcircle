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
    CredibilityCard
)
from cache_store import cache_store
from services.serp_service import serp_service
from services.you_service import you_service
from services.orchestrator import orchestrator

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

# Pre-seeded Room Data for Realistic Demo
ROOMS_CATALOG: Dict[str, RoomInfo] = {
    "family-circle": RoomInfo(
        id="family-circle",
        name="Family Circle 🇮🇳",
        description="Sharma Family & Relatives • TruthCircle Protected",
        unread_count=2,
        avatar="👨‍👩‍👧‍👦",
        members=["Maa", "Rohan", "Uncle Vijay", "Chachi Suman", "TruthCircle Bot"],
        is_protected=True
    ),
    "mumbai-commuters": RoomInfo(
        id="mumbai-commuters",
        name="Mumbai Commuters & News 🚆",
        description="Local trains, monsoon alerts & traffic verification",
        unread_count=0,
        avatar="🚆",
        members=["Admin Rahul", "Pooja", "Vikram", "TruthCircle Bot"],
        is_protected=True
    ),
    "brand-watch": RoomInfo(
        id="brand-watch",
        name="Enterprise Brand Watch 🛡️",
        description="Corporate reputation, fake coupon & PR monitoring",
        unread_count=1,
        avatar="🛡️",
        members=["Security Lead", "PR Director", "Rohan", "TruthCircle Bot"],
        is_protected=True
    )
}

# Initial Conversation Threads per Room
DEFAULT_CHAT_HISTORY: Dict[str, List[dict]] = {
    "family-circle": [
        {
            "id": "msg-1",
            "room_id": "family-circle",
            "sender_id": "maa",
            "sender_name": "Maa",
            "sender_avatar": "👵",
            "text": "Good morning beta! Have a blessed day ahead 🙏🌺",
            "timestamp": "08:15 AM",
            "is_forwarded": False,
            "forwarded_many_times": False,
            "card": None
        },
        {
            "id": "msg-2",
            "room_id": "family-circle",
            "sender_id": "vijay",
            "sender_name": "Uncle Vijay",
            "sender_avatar": "🧔",
            "text": "UNESCO has officially declared Jana Gana Mana as the best national anthem in the world! Forward to all groups 🇮🇳",
            "timestamp": "08:22 AM",
            "is_forwarded": True,
            "forwarded_many_times": True,
            "card": None
        }
    ],
    "mumbai-commuters": [
        {
            "id": "msg-mc-1",
            "room_id": "mumbai-commuters",
            "sender_id": "vikram",
            "sender_name": "Vikram",
            "sender_avatar": "🧑‍💼",
            "text": "Western Line trains running on schedule from Churchgate to Borivali today.",
            "timestamp": "09:02 AM",
            "is_forwarded": False,
            "card": None
        }
    ],
    "brand-watch": [
        {
            "id": "msg-bw-1",
            "room_id": "brand-watch",
            "sender_id": "security",
            "sender_name": "Security Lead",
            "sender_avatar": "🛡️",
            "text": "Monitoring 4 suspicious WhatsApp phishing links targeting Diwali gift vouchers.",
            "timestamp": "10:14 AM",
            "is_forwarded": False,
            "card": None
        }
    ]
}

# In-memory session message store
room_messages: Dict[str, List[dict]] = {k: list(v) for k, v in DEFAULT_CHAT_HISTORY.items()}

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

@app.get("/api/rooms")
async def get_rooms():
    return list(ROOMS_CATALOG.values())

@app.get("/api/rooms/{room_id}/messages")
async def get_room_messages(room_id: str):
    if room_id not in room_messages:
        room_messages[room_id] = []
    return room_messages[room_id]

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
                    if room_id not in room_messages:
                        room_messages[room_id] = []
                    room_messages[room_id].append(msg_data)

                    # Broadcast the user message to everyone in the room
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

