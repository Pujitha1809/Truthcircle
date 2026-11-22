const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    console.warn('[API] Health check warning:', err);
    return {
      status: 'demo_fallback',
      sponsors: {
        nexconn: { mode: 'Active Local Broadcast Sync' },
        serpapi: { status: 'ONLINE (Consensus + Extract MD)' },
        youcom: { status: 'ONLINE (Cited Research RAG)' }
      }
    };
  }
}

export async function fetchPresets() {
  try {
    const res = await fetch(`${API_BASE}/api/presets`);
    if (!res.ok) throw new Error('Presets fetch failed');
    return await res.json();
  } catch (err) {
    console.warn('[API] Presets fetch fallback:', err);
    return [];
  }
}

export async function fetchRooms() {
  try {
    const res = await fetch(`${API_BASE}/api/rooms`);
    if (!res.ok) throw new Error('Rooms fetch failed');
    return await res.json();
  } catch (err) {
    console.warn('[API] Rooms fallback:', err);
    return [
      {
        id: 'family-circle',
        name: 'Family Circle 🇮🇳',
        description: 'Sharma Family & Relatives • TruthCircle Protected',
        unread_count: 2,
        avatar: '👨‍👩‍👧‍👦',
        members: ['Maa', 'Rohan', 'Uncle Vijay', 'TruthCircle Bot']
      }
    ];
  }
}

export async function fetchRoomMessages(roomId) {
  try {
    const res = await fetch(`${API_BASE}/api/rooms/${roomId}/messages`);
    if (!res.ok) throw new Error('Messages fetch failed');
    return await res.json();
  } catch (err) {
    console.warn('[API] Room messages fallback:', err);
    return [];
  }
}

export async function verifyClaim({ claim, url, roomId = 'family-circle', author = 'User', sourceType = 'text', extractedOcrText = null, forceRefresh = false }) {
  const res = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      claim, 
      url, 
      room_id: roomId, 
      author,
      source_type: sourceType,
      extracted_ocr_text: extractedOcrText,
      force_refresh: forceRefresh
    })
  });
  if (!res.ok) {
    throw new Error(`Verification failed with status ${res.status}`);
  }
  return await res.json();
}

