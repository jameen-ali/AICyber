# AI CyberShield Core 🛡️
### AI-Powered Multi-Modal Cybersecurity Threat Detection & Analytics Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-F7931E.svg?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://python.org)

**AI CyberShield Core** is an enterprise-grade, multi-modal threat intelligence and cyber risk assessment platform designed to detect, analyze, and mitigate digital security risks across multiple vectors. Combining machine learning models (Random Forest, Multinomial Naive Bayes, and Isolation Forest) with heuristic rule engines, cryptographic hashing, and computer vision, CyberShield delivers real-time explainable security assessments.

---

## 🚀 Key Modules & Capabilities

AI CyberShield integrates 6 specialized threat detection modules into a unified, responsive dashboard:

### 1. 🌐 URL Threat Analysis
- **Engine**: Scikit-Learn **Random Forest Classifier** (`url_model.pkl`) + Rule-Based Heuristics
- **Features Extracted**: URL length, subdomain depth, path length, count of suspicious punctuation (`-`, `@`, `?`, `=`, `%`), presence of direct IP addresses, brand impersonation keywords, and TLD anomaly flags.
- **Output**: Deterministic 0–100 risk score, categorization (`SAFE`, `SUSPICIOUS`, `MALICIOUS`), and granular threat factor evidence.

### 2. 💬 SMS Phishing (Smishing) Analysis
- **Engine**: Natural Language Processing via **TF-IDF Vectorization** + **Multinomial Naive Bayes** (`phishing_model.pkl`)
- **Detection**: High-urgency vocabulary ("immediate action required", "account suspended"), credential solicitation patterns, OTP requests, and fraudulent financial claim language.

### 3. 📧 Email Threat Analysis
- **Engine**: Dual-Pass Content & Structural Link Engine
- **Inspection**: Natural language email body analysis combined with automatic regex-based extraction of embedded hyperlinks. Embedded URLs are evaluated through the URL threat model, ensuring full protection against evasive phishing campaigns.

### 4. 💳 Transaction Anomaly Analysis (Financial Fraud)
- **Engine**: Unsupervised Machine Learning via **Isolation Forest** (`transaction_model.pkl`) + Deterministic Risk Scoring
- **Telemetry Evaluated**:
  - `amount`: Deviation against baseline expenditure profile.
  - `velocity_1h`: High-frequency burst transfer detection.
  - `is_cross_border`: International transaction routing checks.
  - `high_risk_country`: Geo-spatial sanction and high-fraud jurisdiction flags.
  - `recipient_is_new`: Cold-start relationship vulnerability analysis.
  - `rapid_successive_transfers`: Automated draining pattern identification.
- **Explainability**: Granular risk factor breakdown, deviation multipliers, and actionable mitigation guidance.

### 5. 📁 File Integrity & Malware Analysis
- **Engine**: Cryptographic Fingerprinting & Signature Matching
- **Verification**: Real-time SHA-256 hash generation, local signature matching against known malicious payload signatures, and inspection of dangerous double extensions, executable containers, and macro-enabled files.

### 6. 📷 QR Code Threat Inspection (Quishing)
- **Engine**: Computer Vision via **OpenCV QR Detector** & **Pillow**
- **Process**: Extracts and decodes payloads embedded inside uploaded QR code images (PNG, JPG, WebP), identifies URL destinations, and dispatches them directly through the URL threat classification pipeline.

---

## 📊 Live Risk Analytics & User Guide

- **Live Threat Analytics Dashboard**: Real-time aggregate telemetry displaying total scans, critical threat ratio, safe scan percentage, average risk scores, category breakdown charts, and chronological audit log.
- **Interactive CyberShield User Guide**: Integrated guide tab featuring operational guidance for every module, test scenarios, risk level interpretations, and security best practices.
- **Dynamic Evidence & Explainability**: Transparent evidence table detailing exact triggers, risk contribution percentages, and prescriptive action recommendations.

---

## 🛠️ Technology Architecture

```
AI-Cybershield/
├── backend/
│   ├── main.py                     # FastAPI backend & unified inference orchestrator
│   ├── requirements.txt            # Python dependencies
│   ├── train_nlp.py                # SMS & Email NLP training pipeline
│   ├── train_url.py                # URL Random Forest training pipeline
│   ├── train_transaction.py        # Financial Isolation Forest training pipeline
│   ├── phishing_model.pkl          # Trained NLP model
│   ├── url_model.pkl               # Trained URL model
│   ├── transaction_model.pkl       # Trained Transaction Anomaly model
│   └── scan_history.json           # Persistent scan audit log
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Core UI with multi-modal switcher
│   │   ├── ResultPanel.tsx         # Comprehensive result & evidence display
│   │   ├── AnalyticsDashboard.tsx  # Threat metrics, charts, & audit log
│   │   ├── CyberShieldGuide.tsx    # Interactive security guide & cheat-sheet
│   │   └── index.css               # Tailwind CSS & custom design system
│   ├── package.json                # Frontend dependencies
│   ├── tsconfig.json               # TypeScript configuration
│   └── vite.config.ts              # Vite build configuration
├── requirements.txt                # Root Python dependencies
└── README.md                       # Project documentation
```

---

## ⚡ Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/jameen-ali/AICyber.git
cd AICyber
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv AICS_venv

# On Windows:
AICS_venv\Scripts\activate
# On Linux/macOS:
source AICS_venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Retrain models if needed:
# python train_nlp.py
# python train_url.py
# python train_transaction.py

# Launch FastAPI server
python -m uvicorn main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### 3. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API health check & status |
| `POST` | `/api/analyze/url` | URL feature extraction & threat evaluation |
| `POST` | `/api/analyze/text` | NLP SMS & text phishing classification |
| `POST` | `/api/analyze/email` | Comprehensive email body & hyperlink analysis |
| `POST` | `/api/analyze/transaction` | Isolation Forest financial fraud analysis |
| `POST` | `/api/analyze/file` | Multipart file upload, SHA-256 hash & integrity check |
| `POST` | `/api/analyze/qr` | QR image upload, computer vision decoding & routing |
| `GET` | `/api/analytics` | Summary metrics, threat breakdown & scan audit history |

---

## 🛡️ Disclaimer

*AI CyberShield Core is developed as a Project-Based Learning (PBL) academic prototype and threat assessment aid. Machine learning classifications and heuristic indicators provide probabilistic guidance and should be complemented by multi-layered defense-in-depth enterprise security policies.*
