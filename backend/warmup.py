import urllib.request
import json
import time

print("=== TRUTHCIRCLE HEALTH & PRE-FLIGHT DIAGNOSTICS ===")
try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as resp:
        health = json.loads(resp.read().decode())
        print("HTTP Status:", resp.status)
        print("Service:", health.get("service"))
        print("Version:", health.get("version"))
        print("Sponsors Status:")
        for sponsor, details in health.get("sponsors", {}).items():
            print(f"  - {sponsor.upper()}: {details}")
except Exception as e:
    print("Health Check Error:", e)

print("\n=== CACHE WARM-UP FOR STAGE DEMO PRESETS ===")
presets = [
    ("UNESCO Anthem", "UNESCO has officially declared Jana Gana Mana as the best national anthem in the world! Forward to all groups 🇮🇳"),
    ("5G Bird Deaths", "5G radiation towers are secretly causing mysterious sparrow deaths across Mumbai and Delhi"),
    ("RBI 500 Notes", "RBI announces discontinuation of ₹500 currency notes from next month, all old notes will expire"),
    ("ISRO Sulfur", "ISRO successfully lands Chandrayaan-3 rover Pragyan on lunar south pole and detects sulfur")
]

for name, claim in presets:
    # First test live force_refresh to exercise SerpApi and You.com
    payload = json.dumps({"claim": claim, "room_id": "family-circle", "author": "Pre-Flight Rehearsal", "force_refresh": True}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/verify", data=payload, headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req) as resp:
        elapsed = (time.time() - t0) * 1000
        res = json.loads(resp.read().decode())
        card = res.get("card", {})
        verdict = card.get("verdict")
        conf = card.get("confidence_score")
        cached = res.get("cached")
        telemetry = card.get("telemetry", [])
        live_steps = [t.get("name") for t in telemetry if t.get("status") == "success"]
        print(f"[LIVE REFRESH] {name}: Verdict={verdict} | Conf={conf}% | Latency={elapsed:.1f}ms | Live Steps={len(live_steps)}")

    # Second test to confirm instant sub-80ms stage cache response
    payload_cache = json.dumps({"claim": claim, "room_id": "family-circle", "author": "Stage Presenter", "force_refresh": False}).encode("utf-8")
    req_cache = urllib.request.Request("http://127.0.0.1:8000/api/verify", data=payload_cache, headers={"Content-Type": "application/json"})
    t1 = time.time()
    with urllib.request.urlopen(req_cache) as resp:
        elapsed_cache = (time.time() - t1) * 1000
        res_cache = json.loads(resp.read().decode())
        print(f"  ↳ [SUB-SECOND CACHE HIT] Latency={elapsed_cache:.1f}ms | Cached={res_cache.get('cached')}")

print("\n=== PRE-FLIGHT WARM-UP COMPLETE ===")

