from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class VerdictEnum(str, Enum):
    VERIFIED = "VERIFIED"
    MISLEADING = "MISLEADING"
    FALSE = "FALSE"
    UNVERIFIED = "UNVERIFIED"

class ConsensusMeter(BaseModel):
    confirmed_count: int = Field(default=0, description="Outlets confirming the claim")
    debunked_count: int = Field(default=0, description="Outlets debunking the claim")
    neutral_count: int = Field(default=0, description="Outlets reporting neutrally or contextually")
    summary_text: str = Field(default="0 Confirmed • 0 Debunked", description="Short consensus string")

class Citation(BaseModel):
    id: str
    title: str
    url: str
    domain: str
    snippet: str
    source_type: str = "journalism" # fact_check, mainstream_news, official_gov, academic
    trust_score: int = 95 # 0-100

class PoliteReply(BaseModel):
    english: str
    hindi: str
    hinglish: str

class TelemetryStep(BaseModel):
    service: str # SerpApi, You.com, Nexconn, Orchestrator
    name: str # e.g. "SerpApi Google News (Consensus)", "SerpApi Fact Check Hunter", "SerpApi Deep Extract (MD)", "You.com Cited Research"
    status: str = "success" # success, cached, error, fallback
    latency_ms: int
    query: str
    details: Dict[str, Any] = Field(default_factory=dict)

class CredibilityCard(BaseModel):
    id: str
    claim: str
    verdict: VerdictEnum
    confidence_score: int = Field(ge=0, le=100)
    outlet_consensus: ConsensusMeter
    explanation: str
    citations: List[Citation] = Field(default_factory=list)
    polite_reply: PoliteReply
    serpapi_extract_markdown: Optional[str] = None
    youcom_raw_context: Optional[str] = None
    telemetry: List[TelemetryStep] = Field(default_factory=list)
    created_at: str
    source_url: Optional[str] = None
    processing_time_ms: Optional[int] = Field(default=None)
    detailed_analysis: Optional[str] = Field(default=None, description="3-4 sentence investigative breakdown explaining WHY the verdict was reached, citing exact evidence found.")
    verification_steps: Optional[List[Dict[str, Any]]] = Field(default=None, description="Ordered audit trail of each verification step performed.")
    source_type: Optional[str] = Field(default="text", description="text | image_ocr | forwarded_url")
    extracted_ocr_text: Optional[str] = Field(default=None, description="Raw OCR text extracted from screenshot if source_type == image_ocr")

class VerifyRequest(BaseModel):
    claim: str
    url: Optional[str] = None
    room_id: Optional[str] = "family-circle"
    author: Optional[str] = "User"
    force_refresh: bool = False
    source_type: Optional[str] = "text"
    extracted_ocr_text: Optional[str] = None

class VerifyResponse(BaseModel):
    card: CredibilityCard
    processing_time_ms: int
    cached: bool

class ChatMessage(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    sender_avatar: str
    text: str
    timestamp: str
    is_forwarded: bool = False
    forwarded_many_times: bool = False
    image_url: Optional[str] = None
    reply_to: Optional[str] = None
    card: Optional[CredibilityCard] = None

class RoomInfo(BaseModel):
    id: str
    name: str
    description: str
    unread_count: int = 0
    avatar: str
    members: List[str]
    is_protected: bool = True

