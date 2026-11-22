import os
import json
import asyncio
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    MOTOR_AVAILABLE = True
except ImportError:
    MOTOR_AVAILABLE = False


class TruthCircleDB:
    """
    Async persistence layer for TruthCircle.
    Targeting MongoDB database 'truthcircle' with three collections:
      - rooms
      - messages
      - audit_logs

    Resilient Automatic Fallback:
      Pings MongoDB on startup with a 3-second timeout.
      If MONGODB_URI is missing or unreachable, automatically falls back to
      persisting the exact same schema to backend/data/truthcircle_db.json on disk.
    """

    def __init__(self):
        self.storage_mode: str = "local_disk"  # "mongodb" | "local_disk"
        self.connected: bool = False
        self.client: Any = None
        self.db: Any = None
        self.data_dir: Path = Path(__file__).parent / "data"
        self.disk_file: Path = self.data_dir / "truthcircle_db.json"
        self._lock = asyncio.Lock()

        # In-memory store (active cache for ultra-fast <5ms lookups + local disk source)
        self._memory: Dict[str, Any] = {
            "rooms": {},      # invite_code -> dict
            "messages": {},   # invite_code -> list of dicts
            "audit_logs": []  # list of dicts
        }

    def _load_from_disk(self) -> None:
        """Loads data from truthcircle_db.json if it exists."""
        if not self.disk_file.exists():
            return
        try:
            with open(self.disk_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    self._memory["rooms"] = data.get("rooms", {})
                    self._memory["messages"] = data.get("messages", {})
                    self._memory["audit_logs"] = data.get("audit_logs", [])
                    print(f"[TruthCircleDB] Loaded {len(self._memory['rooms'])} rooms, "
                          f"{sum(len(m) for m in self._memory['messages'].values())} messages, "
                          f"and {len(self._memory['audit_logs'])} audit records from local disk.")
        except Exception as e:
            print(f"[TruthCircleDB] Warning loading local disk backup: {e}")

    async def _save_to_disk(self) -> None:
        """Persists current state to truthcircle_db.json asynchronously."""
        async with self._lock:
            try:
                self.data_dir.mkdir(parents=True, exist_ok=True)
                temp_file = self.data_dir / "truthcircle_db.json.tmp"
                content = json.dumps(self._memory, indent=2, ensure_ascii=False)
                with open(temp_file, "w", encoding="utf-8") as f:
                    f.write(content)
                if temp_file.exists():
                    temp_file.replace(self.disk_file)
            except Exception as e:
                print(f"[TruthCircleDB] Error saving to disk: {e}")

    async def initialize(self) -> str:
        """
        Initializes storage.
        1. Loads any existing local disk data.
        2. Tries to connect to MongoDB if MONGODB_URI is provided with 3s timeout.
        3. If unavailable or missing, defaults to local_disk.
        """
        # Always load local disk data first
        self._load_from_disk()

        mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")

        if mongo_uri and MOTOR_AVAILABLE:
            try:
                print(f"[TruthCircleDB] Attempting connection to MongoDB Atlas (3s timeout)...")
                client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=3000)
                # Ping with 3-second timeout
                await asyncio.wait_for(client.admin.command("ping"), timeout=3.0)

                self.client = client
                self.db = client["truthcircle"]
                self.storage_mode = "mongodb"
                self.connected = True
                print("[TruthCircleDB] Connected to MongoDB Atlas ('truthcircle' database).")

                # Hydrate in-memory cache from MongoDB collections
                await self._hydrate_from_mongo()
                return self.storage_mode
            except Exception as e:
                print(f"[TruthCircleDB] MongoDB ping failed ({e}). Seamlessly falling back to local_disk storage.")
                self.storage_mode = "local_disk"
                self.connected = False
        else:
            if not mongo_uri:
                print("[TruthCircleDB] No MONGODB_URI detected. Running in resilient local_disk storage mode.")
            elif not MOTOR_AVAILABLE:
                print("[TruthCircleDB] Motor package not available. Running in resilient local_disk storage mode.")
            self.storage_mode = "local_disk"
            self.connected = False

        return self.storage_mode

    async def _hydrate_from_mongo(self) -> None:
        """Loads existing MongoDB records into memory cache."""
        if not self.connected or self.db is None:
            return
        try:
            # 1. Rooms
            async for doc in self.db.rooms.find({}, {"_id": 0}):
                code = doc.get("invite_code")
                if code:
                    self._memory["rooms"][code] = doc

            # 2. Messages
            async for doc in self.db.messages.find({}, {"_id": 0}):
                code = doc.get("invite_code") or doc.get("room_id")
                if code:
                    if code not in self._memory["messages"]:
                        self._memory["messages"][code] = []
                    # Avoid duplicates
                    if not any(m.get("id") == doc.get("id") for m in self._memory["messages"][code]):
                        self._memory["messages"][code].append(doc)

            # 3. Audit logs
            mongo_logs = []
            async for doc in self.db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(150):
                mongo_logs.append(doc)
            if mongo_logs:
                self._memory["audit_logs"] = mongo_logs

            # If MongoDB was completely empty, seed it with whatever was on disk
            if not self._memory["rooms"] and self.disk_file.exists():
                print("[TruthCircleDB] Seeding empty MongoDB with local disk state...")
                for code, r_data in self._memory["rooms"].items():
                    await self.db.rooms.update_one({"invite_code": code}, {"$set": r_data}, upsert=True)
                for code, msgs in self._memory["messages"].items():
                    for m in msgs:
                        await self.db.messages.update_one({"id": m.get("id")}, {"$set": m}, upsert=True)
                for log in self._memory["audit_logs"]:
                    await self.db.audit_logs.update_one({"card_id": log.get("card_id")}, {"$set": log}, upsert=True)

        except Exception as e:
            print(f"[TruthCircleDB] Error hydrating from MongoDB: {e}")

    # ─── Room Operations ────────────────────────────────────────────────────────

    async def create_room(self, room_data: dict) -> dict:
        """Creates or upserts a room record."""
        code = room_data.get("invite_code") or room_data.get("id")
        code = code.strip().upper()
        now = datetime.now(timezone.utc).isoformat()
        
        doc = {
            "id": code,
            "invite_code": code,
            "name": room_data.get("name", f"Group {code}"),
            "group_name": room_data.get("group_name", room_data.get("name", f"Group {code}")),
            "creator_name": room_data.get("creator_name", "Creator"),
            "description": room_data.get("description", f"Created by {room_data.get('creator_name', 'User')} • Code: {code}"),
            "unread_count": 0,
            "avatar": room_data.get("avatar", "💬"),
            "members": room_data.get("members", []),
            "is_protected": True,
            "created_at": room_data.get("created_at", now),
            "updated_at": now
        }

        self._memory["rooms"][code] = doc
        if code not in self._memory["messages"]:
            self._memory["messages"][code] = []

        if self.connected and self.db is not None:
            try:
                await self.db.rooms.update_one(
                    {"invite_code": code},
                    {"$set": doc},
                    upsert=True
                )
            except Exception as e:
                print(f"[TruthCircleDB] Mongo create_room error: {e}")

        await self._save_to_disk()
        return doc

    async def get_room(self, invite_code: str) -> Optional[dict]:
        """Fetches room by 6-character code (case-insensitive)."""
        code = invite_code.strip().upper()
        matched_code = next((k for k in self._memory["rooms"].keys() if k.upper() == code), None)
        if matched_code:
            return self._memory["rooms"][matched_code]

        if self.connected and self.db is not None:
            try:
                pattern = f"^{re.escape(code)}$"
                doc = await self.db.rooms.find_one({"invite_code": {"$regex": pattern, "$options": "i"}}, {"_id": 0})
                if doc:
                    self._memory["rooms"][doc["invite_code"]] = doc
                    return doc
            except Exception as e:
                print(f"[TruthCircleDB] Mongo get_room error: {e}")

        return None

    async def get_all_rooms(self) -> List[dict]:
        """Returns all rooms sorted by most recently updated."""
        rooms = list(self._memory["rooms"].values())
        return sorted(rooms, key=lambda r: r.get("updated_at", r.get("created_at", "")), reverse=True)

    async def add_room_member(self, invite_code: str, user_name: str) -> Optional[dict]:
        """Adds a new member to an existing room."""
        room = await self.get_room(invite_code)
        if not room:
            return None

        uname = user_name.strip()
        if uname and uname not in room.get("members", []):
            room["members"].append(uname)
            room["updated_at"] = datetime.now(timezone.utc).isoformat()
            code = room.get("invite_code", invite_code).upper()
            self._memory["rooms"][code] = room

            if self.connected and self.db is not None:
                try:
                    await self.db.rooms.update_one(
                        {"invite_code": code},
                        {"$set": {"members": room["members"], "updated_at": room["updated_at"]}}
                    )
                except Exception as e:
                    print(f"[TruthCircleDB] Mongo add_room_member error: {e}")

            await self._save_to_disk()

        return room

    # ─── Message Operations ─────────────────────────────────────────────────────

    async def save_message(self, invite_code: str, message: dict) -> dict:
        """Saves a message with spam predictions, cards, or attachments."""
        code = invite_code.strip().upper()
        msg_id = message.get("id") or f"msg-{int(datetime.now().timestamp() * 1000)}"
        message["id"] = msg_id
        message["invite_code"] = code
        message["room_id"] = code

        if "helpful_votes" not in message:
            message["helpful_votes"] = ["initial-reviewer"] if message.get("card") else []
        if "context_votes" not in message:
            message["context_votes"] = []

        if code not in self._memory["messages"]:
            self._memory["messages"][code] = []

        # Deduplicate by id if already present, otherwise append
        existing_idx = next((i for i, m in enumerate(self._memory["messages"][code]) if m.get("id") == msg_id), None)
        if existing_idx is not None:
            self._memory["messages"][code][existing_idx] = message
        else:
            self._memory["messages"][code].append(message)

        if self.connected and self.db is not None:
            try:
                await self.db.messages.update_one(
                    {"id": msg_id},
                    {"$set": message},
                    upsert=True
                )
            except Exception as e:
                print(f"[TruthCircleDB] Mongo save_message error: {e}")

        await self._save_to_disk()
        return message

    async def get_messages(self, invite_code: str) -> List[dict]:
        """Gets all messages for a given room code."""
        code = invite_code.strip().upper()
        matched = next((k for k in self._memory["messages"].keys() if k.upper() == code), None)
        if matched:
            return self._memory["messages"][matched]
        return []

    async def update_consensus_vote(self, card_id: str, user_id: str, vote_type: str, room_id: Optional[str] = None) -> dict:
        """
        Updates live consensus votes on a CredibilityCard and its hosting message.
        Toggles vote from user_id:
          - vote_type == 'helpful': adds user_id to helpful_votes, removes from context_votes
          - vote_type == 'needsContext': adds user_id to context_votes, removes from helpful_votes
        """
        updated_card_votes = {"helpful": [], "needsContext": []}

        # Search across all room messages (or target room)
        rooms_to_search = [room_id] if room_id and room_id in self._memory["messages"] else list(self._memory["messages"].keys())

        for r_code in rooms_to_search:
            for msg in self._memory["messages"].get(r_code, []):
                card = msg.get("card")
                if card and (card.get("id") == card_id or msg.get("id") == card_id):
                    helpful = msg.get("helpful_votes", [])
                    needs_context = msg.get("context_votes", [])

                    if vote_type == "helpful":
                        if user_id in helpful:
                            helpful.remove(user_id)
                        else:
                            helpful.append(user_id)
                            if user_id in needs_context:
                                needs_context.remove(user_id)
                    elif vote_type == "needsContext":
                        if user_id in needs_context:
                            needs_context.remove(user_id)
                        else:
                            needs_context.append(user_id)
                            if user_id in helpful:
                                helpful.remove(user_id)

                    msg["helpful_votes"] = helpful
                    msg["context_votes"] = needs_context
                    updated_card_votes = {"helpful": helpful, "needsContext": needs_context}

                    # Also update MongoDB message record
                    if self.connected and self.db is not None:
                        try:
                            await self.db.messages.update_one(
                                {"id": msg.get("id")},
                                {"$set": {"helpful_votes": helpful, "context_votes": needs_context}}
                            )
                        except Exception as e:
                            print(f"[TruthCircleDB] Mongo update vote error: {e}")

        await self._save_to_disk()
        return updated_card_votes

    # ─── Audit Log Operations ───────────────────────────────────────────────────

    async def save_audit_log(self, audit_record: dict) -> dict:
        """Stores a verified claim record for compliance and the Misinformation Radar."""
        card_id = audit_record.get("card_id") or audit_record.get("id")
        audit_record["card_id"] = card_id
        if "created_at" not in audit_record:
            audit_record["created_at"] = datetime.now(timezone.utc).isoformat()

        # Update or prepend in memory
        existing_idx = next((i for i, a in enumerate(self._memory["audit_logs"]) if a.get("card_id") == card_id), None)
        if existing_idx is not None:
            self._memory["audit_logs"][existing_idx] = audit_record
        else:
            self._memory["audit_logs"].insert(0, audit_record)

        if self.connected and self.db is not None:
            try:
                await self.db.audit_logs.update_one(
                    {"card_id": card_id},
                    {"$set": audit_record},
                    upsert=True
                )
            except Exception as e:
                print(f"[TruthCircleDB] Mongo save_audit_log error: {e}")

        await self._save_to_disk()
        return audit_record

    async def get_audit_logs(self, limit: int = 150) -> List[dict]:
        """Returns sorted audit logs for RadarModal."""
        logs = list(self._memory["audit_logs"])
        return logs[:limit]

    # ─── Status / Health ────────────────────────────────────────────────────────

    def get_status(self) -> dict:
        """Returns storage health for /api/health."""
        return {
            "storage_mode": self.storage_mode,
            "connected": self.connected,
            "rooms_count": len(self._memory["rooms"]),
            "messages_count": sum(len(m) for m in self._memory["messages"].values()),
            "audit_count": len(self._memory["audit_logs"]),
            "disk_path": str(self.disk_file)
        }


# Singleton instance exported across backend
db = TruthCircleDB()
