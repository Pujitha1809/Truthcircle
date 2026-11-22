"""Validate new detailed_analysis and verification_steps fields in live responses."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

c = TestClient(app)

print("=" * 60)
print("TruthCircle — New Fields Validation")
print("=" * 60)

# Test with force_refresh=True to get live enriched response
r = c.post("/api/verify", json={"claim": "Mumbai local trains suspended due to cyclone alert", "force_refresh": True})
assert r.status_code == 200, f"Non-200: {r.status_code}"
card = r.json()["card"]

print(f"\n✅ Verdict: {card['verdict']} ({card['confidence_score']}% confidence)")

da = card.get("detailed_analysis")
if da:
    print(f"✅ detailed_analysis present ({len(da)} chars):")
    print(f"   {da[:200]}...")
else:
    print("❌ detailed_analysis MISSING")
    sys.exit(1)

vs = card.get("verification_steps")
if vs and len(vs) == 5:
    print(f"\n✅ verification_steps present ({len(vs)} steps):")
    for step in vs:
        ms = step['latency_ms']
        status = "✅" if ms > 0 else "❌ NEGATIVE"
        print(f"  {status} Step {step['step_number']}: {step['title']} [{step['api_source']}] — {ms}ms")
        print(f"       Finding: {step['finding'][:100]}...")
else:
    print(f"❌ verification_steps MISSING or incomplete: {vs}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ ALL NEW FIELDS VALIDATED — upgrade complete!")
