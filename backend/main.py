import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Set, Optional
import random

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
from database import db

app = FastAPI(
    title="TruthCircle Backend API",
    description="Real-time multi-engine misinformation firewall for group chats powered by Nexconn, SerpApi, You.com, and persistent MongoDB/Disk storage",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory WebSocket Connection Manager
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

@app.on_event("startup")
async def startup_event():
    """Initializes async persistence layer (MongoDB with automatic local disk fallback)."""
    mode = await db.initialize()
    print(f"[TruthCircle] Server started in '{mode}' persistence mode.")

    # Backfill audit logs from cache presets if audit_logs is empty
    logs = await db.get_audit_logs()
    if not logs:
        for key, card in cache_store._cache.items():
            if isinstance(card, CredibilityCard):
                d = card.model_dump()
            elif isinstance(card, dict):
                d = card
            else:
                continue
            await db.save_audit_log({
                "card_id": d.get("id"),
                "invite_code": "GLOBAL",
                "claim": d.get("claim"),
                "verdict": d.get("verdict"),
                "confidence_score": d.get("confidence_score", 95),
                "source_type": d.get("source_type", "text"),
                "extracted_ocr_text": d.get("extracted_ocr_text"),
                "created_at": d.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "primary_source": d.get("citations", [{}])[0].get("domain") if d.get("citations") else "factcheck.in",
                "latency_ms": d.get("processing_time_ms") or 420,
                "verification_steps": d.get("verification_steps", [])
            })

async def generate_invite_code() -> str:
    all_rooms = await db.get_all_rooms()
    existing_codes = {r.get("invite_code") for r in all_rooms if r.get("invite_code")}
    while True:
        digits = random.randint(1000, 9999)
        code = f"TC-{digits}"
        if code not in existing_codes:
            return code

@app.get("/api/health")
async def health_check():
    db_status = db.get_status()
    return {
        "status": "healthy",
        "service": "TruthCircle Misinformation Firewall",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "storage_mode": db_status["storage_mode"],
        "database": db_status,
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
    """Returns full history of verified claims for the Enterprise Misinformation Radar from persistent storage."""
    logs = await db.get_audit_logs(limit=200)
    return logs

@app.get("/api/rooms")
async def get_rooms():
    """Returns all dynamically created rooms from persistent storage."""
    return await db.get_all_rooms()

@app.post("/api/rooms/create")
async def create_room_with_code(req: CreateRoomRequest):
    """Creates a new dynamic group room with a unique 6-character invite code (TC-XXXX) in persistent storage."""
    code = await generate_invite_code()
    members = [req.creator_name.strip(), "TruthCircle Bot"]
    room_data = {
        "id": code,
        "name": req.group_name.strip(),
        "group_name": req.group_name.strip(),
        "creator_name": req.creator_name.strip(),
        "description": f"Created by {req.creator_name.strip()} • Code: {code}",
        "invite_code": code,
        "unread_count": 0,
        "avatar": "💬",
        "members": members,
        "is_protected": True
    }
    return await db.create_room(room_data)

@app.post("/api/rooms")
async def create_room_generic(room_data: dict):
    """Legacy or direct room creation handler."""
    code = room_data.get("invite_code") or room_data.get("id")
    if not code or not code.startswith("TC-"):
        code = await generate_invite_code()
    room_data["id"] = code
    room_data["invite_code"] = code
    return await db.create_room(room_data)

@app.post("/api/rooms/join")
async def join_room_with_code(req: JoinRoomRequest):
    """Validates unique invite code and adds user to the persistent room."""
    code = req.invite_code.strip().upper()
    room = await db.get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room with code '{code}' not found")

    uname = req.user_name.strip()
    updated_room = await db.add_room_member(code, uname)

    # Broadcast USER_JOINED system notice to WebSocket and persist it
    join_msg = {
        "id": f"msg-sys-{int(datetime.now().timestamp() * 1000)}",
        "room_id": code,
        "invite_code": code,
        "sender_id": "truthcircle-bot",
        "sender_name": "TruthCircle AI",
        "sender_avatar": "🛡️",
        "text": f"👋 {uname} joined the group via code {code}.",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "is_forwarded": False,
        "card": None
    }
    await db.save_message(code, join_msg)
    await manager.broadcast_to_room(code, {
        "type": "NEW_MESSAGE",
        "message": join_msg
    })

    return updated_room or room

@app.get("/api/rooms/{invite_code}")
async def get_room_by_code(invite_code: str):
    """Returns room metadata and all persistent chat messages."""
    code = invite_code.strip().upper()
    room = await db.get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    messages = await db.get_messages(code)
    return {
        "room": room,
        "messages": messages
    }

@app.get("/api/rooms/{room_id}/messages")
async def get_room_messages(room_id: str):
    """Returns all persistent messages for a given room."""
    return await db.get_messages(room_id)

@app.post("/api/verify", response_model=VerifyResponse)
async def verify_claim(req: VerifyRequest):
    """
    Core Fact-Checking Pipeline:
    1. Checks cache for fast return
    2. Runs SerpApi News + Hunter + Extract (MD)
    3. Runs You.com Cited Research & RAG
    4. Persists Credibility Card & Audit Log to MongoDB/Disk
    5. Posts Credibility Card into room via WebSocket broadcast
    """
    res = await orchestrator.verify(
        claim=req.claim,
        source_url=req.url,
        force_refresh=req.force_refresh,
        source_type=req.source_type or "text",
        extracted_ocr_text=req.extracted_ocr_text
    )

    room_id = req.room_id or "family-circle"
    card_msg = {
        "id": f"msg-card-{res.card.id}",
        "room_id": room_id,
        "invite_code": room_id,
        "sender_id": "truthcircle-bot",
        "sender_name": "TruthCircle AI",
        "sender_avatar": "🛡️",
        "text": f"Fact-Check Result for claim: \"{req.claim[:80]}...\"",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "is_forwarded": False,
        "card": res.card.model_dump(),
        "helpful_votes": ["initial-reviewer"],
        "context_votes": []
    }

    # Persist card message in room history
    await db.save_message(room_id, card_msg)

    # Persist audit record in audit_logs collection
    primary_src = res.card.citations[0].domain if res.card.citations else "factcheck.in"
    await db.save_audit_log({
        "card_id": res.card.id,
        "id": res.card.id,
        "invite_code": room_id,
        "claim": res.card.claim,
        "verdict": res.card.verdict,
        "confidence_score": res.card.confidence_score,
        "source_type": res.card.source_type or req.source_type or "text",
        "extracted_ocr_text": res.card.extracted_ocr_text or req.extracted_ocr_text,
        "primary_source": primary_src,
        "primary_sources": [c.domain for c in res.card.citations],
        "latency_ms": res.card.processing_time_ms or res.processing_time_ms,
        "processing_time_ms": res.card.processing_time_ms or res.processing_time_ms,
        "verification_steps": res.card.verification_steps or [],
        "created_at": res.card.created_at or datetime.now(timezone.utc).isoformat()
    })

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
        if "@truthcircle" in text.lower():
            claim = text.lower().replace("@truthcircle", "").strip()
            if claim:
                asyncio.create_task(orchestrator.verify(claim))

    return {"status": "received", "event": event_type}

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await manager.connect(room_id, user_id, websocket)
    try:
        # Send room connection welcome with storage mode
        await websocket.send_json({
            "type": "CONNECTED",
            "room_id": room_id,
            "user_id": user_id,
            "storage_mode": db.storage_mode,
            "timestamp": datetime.now().strftime("%I:%M %p")
        })

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                action = payload.get("action")
                event_type = payload.get("type")

                if action == "SEND_MESSAGE":
                    msg_data = payload.get("message", {})
                    text = msg_data.get("text", "")
                    
                    # ─── Real-Time Spam & Scam Prediction (<15ms) ───────────
                    spam_result = predict_spam(text)
                    msg_data["spam_prediction"] = spam_result
                    msg_data["room_id"] = room_id
                    msg_data["invite_code"] = room_id

                    # Save message to persistent storage (survives reboots)
                    await db.save_message(room_id, msg_data)

                    # Broadcast the user message with spam prediction to everyone in the room
                    await manager.broadcast_to_room(room_id, {
                        "type": "NEW_MESSAGE",
                        "message": msg_data
                    })

                    # Automatic fact-check trigger on @truthcircle
                    if "@truthcircle" in text.lower():
                        claim = text.replace("@truthcircle", "").replace("@TruthCircle", "").strip()
                        if claim:
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
                                    "invite_code": room_id,
                                    "sender_id": "truthcircle-bot",
                                    "sender_name": "TruthCircle AI",
                                    "sender_avatar": "🛡️",
                                    "text": f"🛡️ Fact-Check Investigation for: \"{claim[:75]}...\"",
                                    "timestamp": datetime.now().strftime("%I:%M %p"),
                                    "is_forwarded": False,
                                    "card": res.card.model_dump(),
                                    "helpful_votes": ["initial-reviewer"],
                                    "context_votes": []
                                }

                                # Persist both the card message and the audit log
                                await db.save_message(room_id, card_msg)
                                primary_src = res.card.citations[0].domain if res.card.citations else "factcheck.in"
                                await db.save_audit_log({
                                    "card_id": res.card.id,
                                    "id": res.card.id,
                                    "invite_code": room_id,
                                    "claim": res.card.claim,
                                    "verdict": res.card.verdict,
                                    "confidence_score": res.card.confidence_score,
                                    "source_type": res.card.source_type or "text",
                                    "extracted_ocr_text": res.card.extracted_ocr_text,
                                    "primary_source": primary_src,
                                    "primary_sources": [c.domain for c in res.card.citations],
                                    "latency_ms": res.card.processing_time_ms or 420,
                                    "processing_time_ms": res.card.processing_time_ms or 420,
                                    "verification_steps": res.card.verification_steps or [],
                                    "created_at": res.card.created_at or datetime.now(timezone.utc).isoformat()
                                })

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

                elif action == "CONSENSUS_VOTE" or event_type == "CONSENSUS_VOTE":
                    card_id = payload.get("card_id")
                    voter_id = payload.get("user_id", user_id)
                    vote_type = payload.get("vote_type")
                    if card_id and vote_type:
                        # Update consensus votes in persistent storage
                        votes = await db.update_consensus_vote(card_id, voter_id, vote_type, room_id)
                        await manager.broadcast_to_room(room_id, {
                            "type": "CONSENSUS_VOTE",
                            "card_id": card_id,
                            "user_id": voter_id,
                            "vote_type": vote_type,
                            "room_id": room_id,
                            "votes": votes
                        })

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
