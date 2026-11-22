import re
from typing import Dict, Any, List

# Fast, deterministic & heuristic spam, scam & phishing classifier for instant (<15ms) detection
def predict_spam(text: str) -> Dict[str, Any]:
    if not text or not isinstance(text, str):
        return {
            "is_spam": False,
            "spam_score": 0,
            "spam_category": "safe",
            "triggers": []
        }

    raw = text.strip()
    low = raw.lower()
    triggers: List[str] = []
    score = 0
    category = "safe"

    # 1. UPI, Banking & KYC Phishing Scams
    kyc_patterns = [
        (r'\b(kyc|pan card|aadhaar)\b.*(block|suspend|expire|update|verify|deactivat)', "Urgent KYC / Account Suspension threat"),
        (r'\b(electricity bill|power cut|light bill)\b.*(tonight|disconnect|pay now|helpline)', "Fake Electricity Bill Disconnection scam"),
        (r'\b(bank account|sbi|hdfc|icici|pnb)\b.*(blocked|restricted|update immediate)', "Banking Security Impersonation"),
        (r'\b(apk|download app)\b.*(support|customercare|anydesk|teamviewer|rustdesk)', "Malicious APK / Remote Access Trojan"),
        (r'\b(send|pay)\s*(rs\.?|inr|₹)?\s*\d+\s*(to|on)\s*[a-zA-Z0-9.\-_]+@(oksbi|okhdfcbank|okicici|paytm|ybl|upi|apl)', "Unsolicited UPI payment transfer request")
    ]
    for pattern, desc in kyc_patterns:
        if re.search(pattern, low):
            score += 45
            triggers.append(desc)
            category = "UPI / KYC Banking Phishing"

    # 2. Fake Lottery, Free Recharge, Government Grant & Crypto Scams
    lottery_patterns = [
        (r'(won|win|winner|congratulations)\b.*(lottery|crore|lakh|cash prize|kbc|maruti|car|iphone)', "Fake Lottery / Grand Prize notification"),
        (r'\b(free recharge|free data|free 5g|free gift|free voucher)\b', "Viral Free Recharge / Coupon bait"),
        (r'\b(pm yojana|pradhan mantri|subsidy|modi scheme)\b.*(claim|apply now|click here|direct benefit)', "Fake Government Scheme / Grant impersonation"),
        (r'\b(crypto|bitcoin|usdt|forex|doubling|guaranteed return|daily profit)\b.*(invest|trading|telegram)', "Cryptocurrency / High-Yield Investment Fraud"),
        (r'\b(work from home|part time job)\b.*(per day|₹\d{3,5}|like youtube videos|telegram)', "Part-Time Task / Telegram Job Scam")
    ]
    for pattern, desc in lottery_patterns:
        if re.search(pattern, low):
            score += 40
            triggers.append(desc)
            if category == "safe":
                category = "Lottery / Financial Scam"

    # 3. Urgency & Chain-Forward Virality Traps
    urgency_patterns = [
        (r'(forward to|share with|send to)\s*(\d+|all|ten|five|10|20)\s*(friends|groups|people|contacts)', "Chain-Forward Virality coercion"),
        (r'(within\s*\d+\s*hours|tonight\s*at|strictly\s*urgent|immediately\s*or\s*else)', "Artificial high-urgency pressure"),
        (r'(do not ignore|otherwise your|police complaint|court notice)', "Intimidation & Fear-mongering tactic")
    ]
    for pattern, desc in urgency_patterns:
        if re.search(pattern, low):
            score += 25
            triggers.append(desc)
            if category == "safe":
                category = "Viral Chain-Forward Trap"

    # 4. Suspicious Shortened or Spoofed URLs
    url_patterns = [
        (r'https?://(bit\.ly|tinyurl\.com|t\.me|cutt\.ly|is\.gd|rb\.gy|wa\.me)/[^\s]+', "Suspicious shortened / obfuscated link"),
        (r'https?://[^\s]*(-free|-gift|kyc-update|claim-reward|offers-online)[^\s]*', "Phishing keyword in URL domain")
    ]
    for pattern, desc in url_patterns:
        if re.search(pattern, low):
            score += 30
            triggers.append(desc)
            if category == "safe":
                category = "Phishing / Obfuscated Link"

    # Normalize score
    final_score = min(100, max(0, score))
    is_spam = final_score >= 40

    return {
        "is_spam": is_spam,
        "spam_score": final_score,
        "spam_category": category if is_spam else "safe",
        "triggers": triggers[:3]
    }
