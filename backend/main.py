import os
import io
import re
import json
import uuid
import joblib
import numpy as np
import pandas as pd
import hashlib
import cv2
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from PIL import Image

app = FastAPI(title="AI CyberShield API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Scan History Storage ──────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
HISTORY_FILE = os.path.join(BASE_DIR, "scan_history.json")

ALL_TYPES = ["text", "sms", "url", "file", "email", "qr", "transaction"]

def load_history() -> List[Dict[str, Any]]:
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []

def save_history(history: List[Dict[str, Any]]) -> None:
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except IOError:
        pass

def append_scan(record: Dict[str, Any]) -> None:
    history = load_history()
    history.append(record)
    if len(history) > 500:
        history = history[-500:]
    save_history(history)


# ─── URL Feature Extraction ────────────────────────────────────────────────────
def extract_url_features(url: str) -> Dict[str, Any]:
    clean_url = url.replace("http://", "").replace("https://", "")
    return {
        "url_length": len(url),
        "dot_count": clean_url.count("."),
        "hyphen_count": clean_url.count("-"),
        "is_ip": 1 if any(char.isdigit() for char in clean_url.split('/')[0].replace('.', ''))
                      and clean_url.split('/')[0].replace('.', '').isdigit() else 0,
        "has_at_symbol": 1 if "@" in url else 0,
    }

# ─── URL extraction from text ──────────────────────────────────────────────────
URL_PATTERN = re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+', re.IGNORECASE)

def extract_urls_from_text(text: str) -> List[str]:
    return URL_PATTERN.findall(text)


# ─── Request Models ────────────────────────────────────────────────────────────
class TextAnalysisRequest(BaseModel):
    text: str

class UrlAnalysisRequest(BaseModel):
    url: str

class EmailAnalysisRequest(BaseModel):
    sender: Optional[str] = ""
    subject: Optional[str] = ""
    body: str

class TransactionAnalysisRequest(BaseModel):
    amount: float
    transaction_type: str = "online_purchase"
    location: Optional[str] = "India"
    transaction_time: Optional[str] = "14:30"
    transaction_hour: Optional[int] = None
    account_age_days: float = 365
    previous_amount: float = 0
    recent_transaction_count: int = 1
    channel: str = "web"
    international: bool = False

TXN_CHANNEL_MAP = {"web": 0, "mobile": 1, "pos": 2, "atm": 3, "branch": 4}
TXN_TYPE_MAP = {
    "online_purchase": 0,
    "transfer": 1,
    "withdrawal": 2,
    "payment": 3,
    "other": 4,
}
TXN_FEATURE_COLUMNS = [
    "amount",
    "transaction_hour",
    "account_age_days",
    "previous_amount",
    "amount_difference",
    "amount_ratio",
    "recent_transaction_count",
    "international_flag",
    "channel_encoded",
    "transaction_type_encoded",
]


# ─── Model Loading ─────────────────────────────────────────────────────────────
nlp_path = os.path.join(BASE_DIR, "phishing_model.pkl")
url_path  = os.path.join(BASE_DIR, "url_model.pkl")
txn_path  = os.path.join(BASE_DIR, "transaction_model.pkl")

ml_pipeline  = joblib.load(nlp_path) if os.path.exists(nlp_path) else None
rf_model     = joblib.load(url_path)  if os.path.exists(url_path)  else None
txn_pipeline = joblib.load(txn_path) if os.path.exists(txn_path) else None

KNOWN_MALWARE_HASHES = {
    "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
    "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
}

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "online", "message": "AI CyberShield Backend Orchestrator Core Running", "version": "3.0"}


# ── Module 1 — Text / SMS / Phishing Analysis ──────────────────────────────────
@app.post("/api/analyze/text")
def analyze_text(payload: TextAnalysisRequest):
    if not ml_pipeline:
        raise HTTPException(status_code=503, detail="Text analysis engine is currently offline.")
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")

    prediction    = int(ml_pipeline.predict([payload.text])[0])
    probabilities = ml_pipeline.predict_proba([payload.text])[0]
    risk_score    = round(float(probabilities[1]) * 100, 2)
    verdict       = "THREAT" if prediction == 1 or risk_score > 50.0 else "SAFE"
    text_ref      = payload.text[:80] + ("..." if len(payload.text) > 80 else "")

    record = {
        "id":              str(uuid.uuid4()),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "analysis_type":   "text",
        "verdict":         verdict,
        "risk_score":      risk_score,
        "engine":          "Multinomial Naive Bayes",
        "input_reference": text_ref,
        "evidence": {
            "safe_probability":   round(float(probabilities[0]) * 100, 2),
            "threat_probability": round(float(probabilities[1]) * 100, 2),
        },
    }
    append_scan(record)

    return {
        "verdict":    verdict,
        "risk_score": risk_score,
        "engine":     "Multinomial Naive Bayes",
        "evidence": {
            "safe_probability":   round(float(probabilities[0]) * 100, 2),
            "threat_probability": round(float(probabilities[1]) * 100, 2),
        },
    }


# ── Module 2 — URL Threat Analysis ────────────────────────────────────────────
@app.post("/api/analyze/url")
def analyze_url(payload: UrlAnalysisRequest):
    if not rf_model:
        raise HTTPException(status_code=503, detail="URL analysis engine is offline.")

    url_target = payload.url.strip()
    if not url_target:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
    if len(url_target) > 2048:
        raise HTTPException(status_code=400, detail="URL exceeds maximum allowed length.")

    features    = extract_url_features(url_target)
    features_df = pd.DataFrame([features])

    prediction    = int(rf_model.predict(features_df)[0])
    probabilities = rf_model.predict_proba(features_df)[0]
    risk_score    = round(float(probabilities[1]) * 100, 2)
    verdict       = "THREAT" if prediction == 1 or risk_score > 50.0 else "SAFE"

    record = {
        "id":              str(uuid.uuid4()),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "analysis_type":   "url",
        "verdict":         verdict,
        "risk_score":      risk_score,
        "engine":          "Random Forest Ensemble",
        "input_reference": url_target[:200],
        "evidence":        features,
    }
    append_scan(record)

    return {
        "url":        url_target,
        "verdict":    verdict,
        "risk_score": risk_score,
        "engine":     "Random Forest Ensemble",
        "features":   features,
        "evidence": {
            "safe_probability":   round(float(probabilities[0]) * 100, 2),
            "threat_probability": round(float(probabilities[1]) * 100, 2),
        },
    }


# ── Module 3 — File Integrity (SHA-256) ───────────────────────────────────────
@app.post("/api/analyze/file")
async def analyze_file(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size of 50 MB.")

    file_size  = len(content)
    file_hash  = hashlib.sha256(content).hexdigest()
    is_threat  = file_hash in KNOWN_MALWARE_HASHES
    risk_score = 99.0 if is_threat else 0.0
    verdict    = "THREAT" if is_threat else "SAFE"

    record = {
        "id":              str(uuid.uuid4()),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "analysis_type":   "file",
        "verdict":         verdict,
        "risk_score":      risk_score,
        "engine":          "SHA-256 Hash Signature Match",
        "input_reference": file.filename,
        "evidence": {
            "filename":        file.filename,
            "file_size":       file_size,
            "sha256":          file_hash,
            "signature_match": is_threat,
            "database_checked": True,
        },
    }
    append_scan(record)

    return {
        "filename":        file.filename,
        "file_size":       file_size,
        "hash":            file_hash,
        "verdict":         verdict,
        "risk_score":      risk_score,
        "engine":          "SHA-256 Hash Signature Match",
        "signature_match": is_threat,
    }


# ── Module 4 — Email Analysis ──────────────────────────────────────────────────
@app.post("/api/analyze/email")
def analyze_email(payload: EmailAnalysisRequest):
    if not ml_pipeline:
        raise HTTPException(status_code=503, detail="Text analysis engine (used by email module) is currently offline.")
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="Email body cannot be empty.")

    # Combine subject + body for phishing classification
    combined = f"{payload.subject} {payload.body}".strip()

    prediction    = int(ml_pipeline.predict([combined])[0])
    probabilities = ml_pipeline.predict_proba([combined])[0]
    risk_score    = round(float(probabilities[1]) * 100, 2)
    verdict       = "THREAT" if prediction == 1 or risk_score > 50.0 else "SAFE"

    # Extract URLs from body
    detected_urls = extract_urls_from_text(payload.body)
    # Analyze each URL structurally if the URL model is available (no visit)
    url_results = []
    if rf_model:
        for u in detected_urls[:5]:  # Limit to 5 URLs
            try:
                feats = extract_url_features(u)
                df    = pd.DataFrame([feats])
                pred  = int(rf_model.predict(df)[0])
                probs = rf_model.predict_proba(df)[0]
                u_risk = round(float(probs[1]) * 100, 2)
                url_results.append({
                    "url": u,
                    "risk_score": u_risk,
                    "verdict": "THREAT" if pred == 1 or u_risk > 50.0 else "SAFE",
                    "features": feats,
                })
            except Exception:
                pass

    # Escalate risk if any detected URL is a threat
    max_url_risk = max((u["risk_score"] for u in url_results), default=0)
    if url_results and max_url_risk > risk_score:
        risk_score = round((risk_score + max_url_risk) / 2, 2)
        if any(u["verdict"] == "THREAT" for u in url_results):
            verdict = "THREAT"

    sender_ref = payload.sender[:60] if payload.sender else "(not provided)"
    record = {
        "id":              str(uuid.uuid4()),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "analysis_type":   "email",
        "verdict":         verdict,
        "risk_score":      risk_score,
        "engine":          "Multinomial Naive Bayes + URL Structural Analysis",
        "input_reference": f"From: {sender_ref} | Subject: {(payload.subject or '')[:40]}",
        "evidence": {
            "sender":              payload.sender,
            "subject":             payload.subject,
            "safe_probability":    round(float(probabilities[0]) * 100, 2),
            "threat_probability":  round(float(probabilities[1]) * 100, 2),
            "detected_urls":       len(detected_urls),
            "url_analyses":        url_results,
        },
    }
    append_scan(record)

    return {
        "verdict":    verdict,
        "risk_score": risk_score,
        "engine":     "Multinomial Naive Bayes + URL Structural Analysis",
        "sender":     payload.sender,
        "subject":    payload.subject,
        "evidence": {
            "safe_probability":   round(float(probabilities[0]) * 100, 2),
            "threat_probability": round(float(probabilities[1]) * 100, 2),
            "detected_urls":      detected_urls,
            "url_analyses":       url_results,
        },
    }


# ── Module 5 — QR Code Analysis ───────────────────────────────────────────────
@app.post("/api/analyze/qr")
async def analyze_qr(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No QR image uploaded.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit for images
        raise HTTPException(status_code=413, detail="Image file too large. Maximum 10 MB.")

    # Decode using OpenCV QR detector
    try:
        img_array = np.frombuffer(content, dtype=np.uint8)
        img       = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode the uploaded image. Ensure it is a valid image file (PNG, JPG, etc.).")
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to process the uploaded image file.")

    qr_detector = cv2.QRCodeDetector()
    decoded_text, points, _ = qr_detector.detectAndDecode(img)

    if not decoded_text:
        raise HTTPException(
            status_code=422,
            detail="No QR code detected in the uploaded image. Ensure the image contains a clear, unobstructed QR code."
        )

    qr_content = decoded_text.strip()

    # Determine content type
    is_url = bool(re.match(r'^https?://', qr_content, re.IGNORECASE))
    content_type = "url" if is_url else "text"

    # Run appropriate analysis
    if is_url and rf_model:
        features    = extract_url_features(qr_content)
        features_df = pd.DataFrame([features])
        prediction    = int(rf_model.predict(features_df)[0])
        probabilities = rf_model.predict_proba(features_df)[0]
        risk_score    = round(float(probabilities[1]) * 100, 2)
        verdict       = "THREAT" if prediction == 1 or risk_score > 50.0 else "SAFE"
        underlying_engine = "Random Forest Ensemble (URL)"
        sub_evidence = {
            "url_features": features,
            "safe_probability":   round(float(probabilities[0]) * 100, 2),
            "threat_probability": round(float(probabilities[1]) * 100, 2),
        }
    elif not is_url and ml_pipeline:
        prediction    = int(ml_pipeline.predict([qr_content])[0])
        probabilities = ml_pipeline.predict_proba([qr_content])[0]
        risk_score    = round(float(probabilities[1]) * 100, 2)
        verdict       = "THREAT" if prediction == 1 or risk_score > 50.0 else "SAFE"
        underlying_engine = "Multinomial Naive Bayes (Text)"
        sub_evidence = {
            "safe_probability":   round(float(probabilities[0]) * 100, 2),
            "threat_probability": round(float(probabilities[1]) * 100, 2),
        }
    else:
        raise HTTPException(status_code=503, detail="Required analysis engine is offline.")

    record = {
        "id":              str(uuid.uuid4()),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "analysis_type":   "qr",
        "verdict":         verdict,
        "risk_score":      risk_score,
        "engine":          f"QR Decode + {underlying_engine}",
        "input_reference": qr_content[:100],
        "evidence": {
            "decoded_content": qr_content,
            "content_type":    content_type,
            **sub_evidence,
        },
    }
    append_scan(record)

    return {
        "verdict":          verdict,
        "risk_score":       risk_score,
        "engine":           f"QR Decode + {underlying_engine}",
        "decoded_content":  qr_content,
        "content_type":     content_type,
        "underlying_engine": underlying_engine,
        "evidence":         sub_evidence,
    }


# ── Module 4 — Transaction Anomaly Analysis ───────────────────────────────────
@app.post("/api/analyze/transaction")
def analyze_transaction(payload: TransactionAnalysisRequest):
    if not txn_pipeline:
        raise HTTPException(status_code=503, detail="Transaction anomaly analysis engine is currently offline.")

    # Input validation
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Transaction amount must be greater than zero.")
    if payload.account_age_days < 0:
        raise HTTPException(status_code=400, detail="Account age cannot be negative.")
    if payload.previous_amount < 0:
        raise HTTPException(status_code=400, detail="Previous transaction amount cannot be negative.")
    if payload.recent_transaction_count < 0:
        raise HTTPException(status_code=400, detail="Recent transaction count cannot be negative.")

    # Parse transaction hour
    hour = payload.transaction_hour
    if hour is None and payload.transaction_time:
        try:
            hour = int(payload.transaction_time.split(":")[0])
        except Exception:
            hour = 12
    if hour is None:
        hour = 12
    hour = max(0, min(23, int(hour)))

    amt = float(payload.amount)
    prev_amt = float(payload.previous_amount)
    amt_diff = round(abs(amt - prev_amt), 2)
    amt_ratio = round(amt / (prev_amt + 1.0), 2)
    age = float(payload.account_age_days)
    recent_cnt = int(payload.recent_transaction_count)
    intl_flag = 1 if payload.international else 0
    ch_enc = TXN_CHANNEL_MAP.get(payload.channel.lower().strip(), 0)
    type_enc = TXN_TYPE_MAP.get(payload.transaction_type.lower().strip(), 0)

    # Feature vector matching training feature columns
    feature_dict = {
        "amount": amt,
        "transaction_hour": hour,
        "account_age_days": age,
        "previous_amount": prev_amt,
        "amount_difference": amt_diff,
        "amount_ratio": amt_ratio,
        "recent_transaction_count": recent_cnt,
        "international_flag": intl_flag,
        "channel_encoded": ch_enc,
        "transaction_type_encoded": type_enc,
    }

    feature_df = pd.DataFrame([feature_dict])[TXN_FEATURE_COLUMNS]

    # Model evaluation:
    # IsolationForest decision_function: positive indicates inlier (normal), negative indicates outlier (anomaly)
    raw_decision_score = float(txn_pipeline.decision_function(feature_df)[0])

    # Calibrated risk score mapping:
    # Typical normal score ~ +0.16 -> ~21% risk (LOW)
    # Anomaly boundary 0.00 -> 50% risk (MODERATE)
    # Anomaly score -0.12 -> ~71% risk (HIGH RISK)
    # Formula: risk_score = 50.0 - (score * 180.0), clamped to [0.0, 100.0]
    calculated_risk = 50.0 - (raw_decision_score * 180.0)
    risk_score = round(max(0.0, min(100.0, calculated_risk)), 1)

    # Risk band and dynamic verdict
    if risk_score < 30.0:
        verdict = "SAFE"
    elif risk_score < 70.0:
        verdict = "SUSPICIOUS"
    else:
        verdict = "HIGH RISK"

    # Identify contributing factors based on actual calculated deviations from normal baseline
    contributing_factors = []
    if amt > 20000:
        contributing_factors.append(f"High transaction volume (INR {amt:,.2f}) deviates from standard personal baseline.")
    if amt_diff > 12000:
        contributing_factors.append(f"Significant difference (+INR {amt_diff:,.2f}) compared to previous transaction amount.")
    if amt_ratio > 8.0 and prev_amt > 0:
        contributing_factors.append(f"Transaction is {amt_ratio:.1f}x higher than recent baseline.")
    if hour in [0, 1, 2, 3, 4]:
        contributing_factors.append(f"Transaction occurred during off-peak night hours ({hour:02d}:00).")
    if recent_cnt > 12:
        contributing_factors.append(f"Elevated transaction velocity ({recent_cnt} transactions in recent period).")
    if payload.international:
        contributing_factors.append("Cross-border / international transaction flagged.")
    if age < 30:
        contributing_factors.append(f"Young account profile ({int(age)} days active).")

    if not contributing_factors and verdict == "SAFE":
        contributing_factors.append("Transaction parameters conform closely to normal baseline distributions.")

    record = {
        "id":              str(uuid.uuid4()),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "analysis_type":   "transaction",
        "verdict":         verdict,
        "risk_score":      risk_score,
        "engine":          "Isolation Forest",
        "input_reference": f"Txn INR {amt:,.2f} ({payload.channel}/{payload.transaction_type})",
        "evidence": {
            "amount":                  amt,
            "previous_amount":         prev_amt,
            "amount_difference":       amt_diff,
            "amount_ratio":            amt_ratio,
            "transaction_hour":        hour,
            "account_age_days":        age,
            "recent_transaction_count": recent_cnt,
            "international":           payload.international,
            "channel":                 payload.channel,
            "transaction_type":        payload.transaction_type,
            "location":                payload.location or "Unspecified",
            "anomaly_score":           round(raw_decision_score, 4),
            "contributing_factors":    contributing_factors,
        },
    }
    append_scan(record)

    return {
        "verdict":              verdict,
        "risk_score":           risk_score,
        "engine":               "Isolation Forest",
        "anomaly_score":        round(raw_decision_score, 4),
        "features": {
            "amount":                  amt,
            "previous_amount":         prev_amt,
            "amount_difference":       amt_diff,
            "amount_ratio":            amt_ratio,
            "transaction_hour":        hour,
            "account_age_days":        age,
            "recent_transaction_count": recent_cnt,
            "international":           payload.international,
            "channel":                 payload.channel,
            "transaction_type":        payload.transaction_type,
            "location":                payload.location or "Unspecified",
        },
        "contributing_factors": contributing_factors,
    }


# ── Analytics & History APIs ──────────────────────────────────────────────────
@app.get("/api/history")
def get_history(limit: int = 50):
    history = load_history()
    return {"records": list(reversed(history[-limit:]))}


@app.get("/api/analytics")
def get_analytics():
    history = load_history()

    empty_types = {t: 0 for t in ALL_TYPES}

    if not history:
        return {
            "total_scans":       0,
            "safe":              0,
            "threat":            0,
            "average_risk":      None,
            "analysis_types":    empty_types,
            "risk_distribution": {"low": 0, "moderate": 0, "high": 0},
            "risk_trend":        [],
            "url_analytics":     None,
            "text_analytics":    None,
            "file_analytics":    None,
            "email_analytics":   None,
            "qr_analytics":      None,
            "transaction_analytics": None,
        }

    total_scans  = len(history)
    safe_count   = sum(1 for r in history if r.get("verdict") == "SAFE")
    threat_count = total_scans - safe_count

    risk_scores  = [r.get("risk_score", 0) for r in history]
    average_risk = round(sum(risk_scores) / total_scans, 2)

    analysis_types = {t: sum(1 for r in history if r.get("analysis_type") == t) for t in ALL_TYPES}

    low_count      = sum(1 for s in risk_scores if s < 30)
    moderate_count = sum(1 for s in risk_scores if 30 <= s < 70)
    high_count     = sum(1 for s in risk_scores if s >= 70)

    risk_trend = [
        {
            "timestamp":     r.get("timestamp"),
            "risk_score":    r.get("risk_score", 0),
            "analysis_type": r.get("analysis_type"),
            "verdict":       r.get("verdict"),
        }
        for r in history
    ]

    # URL analytics
    url_records = [r for r in history if r.get("analysis_type") == "url"]
    url_analytics = None
    if url_records:
        url_risk_scores = [r.get("risk_score", 0) for r in url_records]
        url_features    = [r.get("evidence", {}) for r in url_records]
        url_analytics = {
            "total":            len(url_records),
            "threats":          sum(1 for r in url_records if r.get("verdict") == "THREAT"),
            "safe":             sum(1 for r in url_records if r.get("verdict") == "SAFE"),
            "average_risk":     round(sum(url_risk_scores) / len(url_risk_scores), 2),
            "avg_url_length":   round(sum(f.get("url_length", 0) for f in url_features) / len(url_features), 1),
            "avg_dot_count":    round(sum(f.get("dot_count", 0) for f in url_features) / len(url_features), 2),
            "avg_hyphen_count": round(sum(f.get("hyphen_count", 0) for f in url_features) / len(url_features), 2),
            "ip_based_count":   sum(1 for f in url_features if f.get("is_ip") == 1),
            "at_symbol_count":  sum(1 for f in url_features if f.get("has_at_symbol") == 1),
        }

    # Text analytics (text + sms types both use text engine)
    text_records = [r for r in history if r.get("analysis_type") in ("text", "sms")]
    text_analytics = None
    if text_records:
        text_risk_scores = [r.get("risk_score", 0) for r in text_records]
        text_analytics = {
            "total":        len(text_records),
            "threats":      sum(1 for r in text_records if r.get("verdict") == "THREAT"),
            "safe":         sum(1 for r in text_records if r.get("verdict") == "SAFE"),
            "average_risk": round(sum(text_risk_scores) / len(text_risk_scores), 2),
        }

    # File analytics
    file_records  = [r for r in history if r.get("analysis_type") == "file"]
    file_analytics = None
    if file_records:
        file_evidence = [r.get("evidence", {}) for r in file_records]
        file_analytics = {
            "total":              len(file_records),
            "threats":            sum(1 for r in file_records if r.get("verdict") == "THREAT"),
            "safe":               sum(1 for r in file_records if r.get("verdict") == "SAFE"),
            "signature_matches":  sum(1 for e in file_evidence if e.get("signature_match") is True),
        }

    # Email analytics
    email_records  = [r for r in history if r.get("analysis_type") == "email"]
    email_analytics = None
    if email_records:
        email_risk_scores = [r.get("risk_score", 0) for r in email_records]
        email_analytics = {
            "total":        len(email_records),
            "threats":      sum(1 for r in email_records if r.get("verdict") == "THREAT"),
            "safe":         sum(1 for r in email_records if r.get("verdict") == "SAFE"),
            "average_risk": round(sum(email_risk_scores) / len(email_risk_scores), 2),
        }

    # QR analytics
    # QR analytics
    qr_records  = [r for r in history if r.get("analysis_type") == "qr"]
    qr_analytics = None
    if qr_records:
        qr_risk_scores = [r.get("risk_score", 0) for r in qr_records]
        qr_analytics = {
            "total":        len(qr_records),
            "threats":      sum(1 for r in qr_records if r.get("verdict") == "THREAT"),
            "safe":         sum(1 for r in qr_records if r.get("verdict") == "SAFE"),
            "average_risk": round(sum(qr_risk_scores) / len(qr_risk_scores), 2),
            "url_type":     sum(1 for r in qr_records if r.get("evidence", {}).get("content_type") == "url"),
            "text_type":    sum(1 for r in qr_records if r.get("evidence", {}).get("content_type") == "text"),
        }

    # Transaction analytics
    txn_records = [r for r in history if r.get("analysis_type") == "transaction"]
    txn_analytics = None
    if txn_records:
        txn_risk_scores = [r.get("risk_score", 0) for r in txn_records]
        txn_evidences = [r.get("evidence", {}) for r in txn_records]
        txn_amounts = [float(e.get("amount", 0)) for e in txn_evidences]
        txn_recent_counts = [float(e.get("recent_transaction_count", 0)) for e in txn_evidences]

        # By transaction type breakdown
        type_counts: Dict[str, Dict[str, Any]] = {}
        for r in txn_records:
            t_type = r.get("evidence", {}).get("transaction_type", "other")
            if t_type not in type_counts:
                type_counts[t_type] = {"count": 0, "total_risk": 0.0}
            type_counts[t_type]["count"] += 1
            type_counts[t_type]["total_risk"] += r.get("risk_score", 0)

        by_type = [
            {
                "type": t,
                "count": data["count"],
                "avg_risk": round(data["total_risk"] / data["count"], 1),
            }
            for t, data in type_counts.items()
        ]

        txn_analytics = {
            "total":               len(txn_records),
            "threats":             sum(1 for r in txn_records if r.get("verdict") == "HIGH RISK"),
            "suspicious":          sum(1 for r in txn_records if r.get("verdict") == "SUSPICIOUS"),
            "safe":                sum(1 for r in txn_records if r.get("verdict") == "SAFE"),
            "average_risk":        round(sum(txn_risk_scores) / len(txn_risk_scores), 2),
            "avg_amount":          round(sum(txn_amounts) / len(txn_amounts), 2) if txn_amounts else 0.0,
            "avg_recent_count":    round(sum(txn_recent_counts) / len(txn_recent_counts), 1) if txn_recent_counts else 0.0,
            "international_count": sum(1 for e in txn_evidences if e.get("international") is True),
            "risk_distribution": {
                "low":      sum(1 for s in txn_risk_scores if s < 30),
                "moderate": sum(1 for s in txn_risk_scores if 30 <= s < 70),
                "high":     sum(1 for s in txn_risk_scores if s >= 70),
            },
            "by_type": by_type,
        }

    return {
        "total_scans":           total_scans,
        "safe":                  safe_count,
        "threat":                threat_count,
        "average_risk":          average_risk,
        "analysis_types":        analysis_types,
        "risk_distribution":     {"low": low_count, "moderate": moderate_count, "high": high_count},
        "risk_trend":            risk_trend,
        "url_analytics":         url_analytics,
        "text_analytics":        text_analytics,
        "file_analytics":        file_analytics,
        "email_analytics":       email_analytics,
        "qr_analytics":          qr_analytics,
        "transaction_analytics": txn_analytics,
    }