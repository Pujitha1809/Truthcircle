"""Quick validation that all telemetry latency_ms values are positive."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app
import json

c = TestClient(app)

claims = [
    "UNESCO declared Jana Gana Mana as world's best national anthem",
    "5G towers are killing birds in India",
]

print("=" * 60)
print("TruthCircle — Latency Validation Test")
print("=" * 60)

all_ok = True
for claim in claims:
    r = c.post("/api/verify", json={"claim": claim})
    assert r.status_code == 200, f"Non-200 for claim: {claim}"
    card = r.json()["card"]
    telemetry = card.get("telemetry", [])
    processing_ms = card.get("processing_time_ms")
    print(f"\nClaim: {claim[:55]}...")
    print(f"  processing_time_ms = {processing_ms}")
    for step in telemetry:
        ms = step.get("latency_ms", 0)
        status = "✅" if ms > 0 else "❌ NEGATIVE"
        print(f"  {status}  {step['name']}: {ms}ms")
        if ms <= 0:
            all_ok = False

print("\n" + "=" * 60)
if all_ok:
    print("✅ ALL TELEMETRY VALUES ARE POSITIVE — ready for stage!")
else:
    print("❌ NEGATIVE VALUES FOUND — fix needed")
    sys.exit(1)

