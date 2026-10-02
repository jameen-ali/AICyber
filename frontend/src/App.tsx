import { useState, useRef, useCallback } from "react";
import type { AnalysisResult, ScanType, TransactionFormData } from "./types";
import { CyberShieldGuide } from "./CyberShieldGuide";
import { ResultPanel } from "./ResultPanel";
import { AnalyticsSection } from "./AnalyticsSection";

const API = "http://127.0.0.1:8000";

/* ─── Navigation ─────────────────────────────────────────────────────────── */
type NavTab = "guide" | "scan" | "analytics";
const NAV_TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: "guide",     label: "Guide",     icon: "◈" },
  { id: "scan",      label: "Scan",      icon: "⚡" },
  { id: "analytics", label: "Analytics", icon: "◉" },
];

/* ─── Scan Modules Config ─────────────────────────────────────────────────── */
interface ModuleConfig {
  id: ScanType;
  label: string;
  icon: React.ReactNode;
  engine: string;
  engineNote: string;
  placeholder?: string;
  inputLabel?: string;
  enabled: boolean;
}

function IconURL() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconSMS() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconTransaction() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}
function IconQR() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="14" /><line x1="17" y1="14" x2="17" y2="14" />
      <line x1="20" y1="14" x2="20" y2="14" /><line x1="14" y1="17" x2="14" y2="17" />
      <line x1="17" y1="17" x2="17" y2="17" /><line x1="20" y1="17" x2="20" y2="17" />
      <line x1="14" y1="20" x2="14" y2="20" /><line x1="17" y1="20" x2="17" y2="20" />
      <line x1="20" y1="20" x2="20" y2="20" />
    </svg>
  );
}

const MODULES: ModuleConfig[] = [
  {
    id: "url", label: "URL", enabled: true,
    icon: <IconURL />,
    engine: "Random Forest Ensemble",
    engineNote: "Analyzes URL structure (length, dots, hyphens, IP, @ symbol). Does not visit or execute the URL.",
    inputLabel: "Analyze Suspicious Link Structure",
    placeholder: "https://example.com/verify?ref=account",
  },
  {
    id: "sms", label: "SMS", enabled: true,
    icon: <IconSMS />,
    engine: "Multinomial Naive Bayes",
    engineNote: "TF-IDF + Naive Bayes phishing classifier. Trained on a demonstration-scale dataset.",
    inputLabel: "Analyze Incoming SMS Content",
    placeholder: "Paste suspicious SMS text here...",
  },
  {
    id: "email", label: "Email", enabled: true,
    icon: <IconEmail />,
    engine: "Multinomial Naive Bayes + URL Structural Analysis",
    engineNote: "Analyzes email body using the phishing text classifier. Detected URLs are also structurally analyzed without being visited.",
    inputLabel: "Analyze Email Content",
    placeholder: "Paste the email body here...",
  },
  {
    id: "transaction", label: "Transaction", enabled: true,
    icon: <IconTransaction />,
    engine: "Isolation Forest Anomaly Engine",
    engineNote: "Unsupervised Isolation Forest anomaly detection evaluating transaction amount, velocity, timing, and deviations against demonstration baseline.",
    inputLabel: "Analyze Transaction Characteristics",
    placeholder: "",
  },
  {
    id: "file", label: "File", enabled: true,
    icon: <IconFile />,
    engine: "SHA-256 Hash Signature Match",
    engineNote: "Computes SHA-256 hash and checks against the local signature database. A non-match does not prove safety.",
    inputLabel: "Upload File for Signature Verification",
  },
  {
    id: "qr", label: "QR", enabled: true,
    icon: <IconQR />,
    engine: "OpenCV QR Decode + URL/Text Analysis",
    engineNote: "Decodes the QR image using OpenCV, then routes decoded content through the URL or text analysis engine.",
    inputLabel: "Upload QR Code Image",
  },
];

/* ─── Email form state ───────────────────────────────────────────────────── */
interface EmailForm {
  sender: string;
  subject: string;
  body: string;
}

/* ─── App ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const [activeTab, setActiveTab]       = useState<NavTab>("guide");
  const [scanType, setScanType]         = useState<ScanType>("url");
  const [inputText, setInputText]             = useState("");
  const [emailForm, setEmailForm]             = useState<EmailForm>({ sender: "", subject: "", body: "" });
  const [transactionForm, setTransactionForm] = useState<TransactionFormData>({
    amount: "2500",
    transaction_type: "online_purchase",
    location: "India",
    transaction_time: "14:35",
    account_age_days: "365",
    previous_amount: "450",
    recent_transaction_count: "8",
    channel: "web",
    international: false,
  });
  const [selectedFile, setSelectedFile]       = useState<File | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [result, setResult]                   = useState<AnalysisResult | null>(null);
  const [error, setError]                     = useState("");
  const [analyticsKey, setAnalyticsKey]       = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const activeModule = MODULES.find((m) => m.id === scanType)!;

  const clearScan = useCallback(() => {
    setResult(null);
    setInputText("");
    setSelectedFile(null);
    setError("");
    setEmailForm({ sender: "", subject: "", body: "" });
  }, []);

  const switchModule = (t: ScanType) => {
    setScanType(t);
    clearScan();
  };

  const switchTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === "analytics") setAnalyticsKey((k) => k + 1);
  };

  const isFileType = scanType === "file" || scanType === "qr";
  const isEmailType = scanType === "email";
  const isTransactionType = scanType === "transaction";
  const isDisabled = !activeModule.enabled;

  const getButtonDisabled = () => {
    if (loading || isDisabled) return true;
    if (isFileType)        return !selectedFile;
    if (isEmailType)       return !emailForm.body.trim();
    if (isTransactionType) return !transactionForm.amount || parseFloat(transactionForm.amount) <= 0;
    return !inputText.trim();
  };

  const getLoadingText = () => {
    switch (scanType) {
      case "url":         return "Analyzing URL structure...";
      case "sms":         return "Scanning message content...";
      case "email":       return "Analyzing email...";
      case "transaction": return "Evaluating transaction anomaly metrics...";
      case "file":        return "Computing SHA-256 hash...";
      case "qr":          return "Decoding QR code...";
      default:            return "Processing...";
    }
  };

  /* ── Analysis handler ── */
  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let endpoint = "";
      let options: RequestInit = {};

      if (scanType === "sms") {
        if (!inputText.trim()) throw new Error("Please enter SMS text to scan.");
        endpoint = `${API}/api/analyze/text`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({ text: inputText }),
        };

      } else if (scanType === "url") {
        if (!inputText.trim()) throw new Error("Please enter a URL to scan.");
        endpoint = `${API}/api/analyze/url`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({ url: inputText }),
        };

      } else if (scanType === "email") {
        if (!emailForm.body.trim()) throw new Error("Please enter the email body to scan.");
        endpoint = `${API}/api/analyze/email`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender:  emailForm.sender,
            subject: emailForm.subject,
            body:    emailForm.body,
          }),
        };

      } else if (scanType === "file") {
        if (!selectedFile) throw new Error("Please select a file to scan.");
        endpoint = `${API}/api/analyze/file`;
        const fd = new FormData();
        fd.append("file", selectedFile);
        options = { method: "POST", headers: { accept: "application/json" }, body: fd };

      } else if (scanType === "qr") {
        if (!selectedFile) throw new Error("Please select a QR code image to scan.");
        endpoint = `${API}/api/analyze/qr`;
        const fd = new FormData();
        fd.append("file", selectedFile);
        options = { method: "POST", headers: { accept: "application/json" }, body: fd };

      } else if (scanType === "transaction") {
        const amt = parseFloat(transactionForm.amount);
        if (isNaN(amt) || amt <= 0) throw new Error("Please enter a valid transaction amount greater than zero.");
        endpoint = `${API}/api/analyze/transaction`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            amount:                   amt,
            transaction_type:         transactionForm.transaction_type,
            location:                 transactionForm.location.trim() || "India",
            transaction_time:         transactionForm.transaction_time,
            account_age_days:         parseFloat(transactionForm.account_age_days) || 365,
            previous_amount:          parseFloat(transactionForm.previous_amount) || 0,
            recent_transaction_count: parseInt(transactionForm.recent_transaction_count, 10) || 1,
            channel:                  transactionForm.channel,
            international:            Boolean(transactionForm.international),
          }),
        };
      }

      const response = await fetch(endpoint, options);
      if (!response.ok) {
        let detail = `Analysis failed (HTTP ${response.status}).`;
        try {
          const err = await response.json();
          detail = err.detail ?? detail;
        } catch { /* ignore */ }
        throw new Error(detail);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      setAnalyticsKey((k) => k + 1);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Cannot connect to the CyberShield backend. Ensure the server is running on port 8000.");
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-900/30">
              AI
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 leading-none">
                AI CyberShield Core
              </h1>
              <p className="text-xs text-slate-500 leading-none mt-0.5">
                Multi-Modal Threat Analysis Engine
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                aria-label={`Switch to ${tab.label} tab`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-800 text-cyan-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span aria-hidden>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === "scan" && result && (
                  <span className={`ml-1 w-1.5 h-1.5 rounded-full ${result.verdict === "THREAT" ? "bg-red-500" : "bg-emerald-500"}`} />
                )}
              </button>
            ))}
          </nav>

          {/* Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500 hidden sm:block">Online</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* ═══ GUIDE TAB ═══ */}
        {activeTab === "guide" && (
          <div className="space-y-8">
            <CyberShieldGuide />
            <div className="flex justify-center">
              <button
                onClick={() => switchTab("scan")}
                className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-cyan-900/30"
              >
                <span>⚡</span>
                Start Analysis
              </button>
            </div>
          </div>
        )}

        {/* ═══ SCAN TAB ═══ */}
        {activeTab === "scan" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

            {/* Left — Input Panel */}
            <div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">

                {/* Module Switcher — 6 tiles */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Analysis Module</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    {MODULES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => switchModule(m.id)}
                        aria-label={`Switch to ${m.label} analysis`}
                        title={m.enabled ? m.label : `${m.label} — not enabled`}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all relative ${
                          scanType === m.id
                            ? "bg-slate-800 text-cyan-400 shadow"
                            : m.enabled
                            ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                            : "text-slate-700 cursor-not-allowed"
                        }`}
                      >
                        <span className={scanType === m.id ? "text-cyan-400" : m.enabled ? "text-slate-400" : "text-slate-700"}>
                          {m.icon}
                        </span>
                        <span>{m.label}</span>
                        {!m.enabled && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-700" title="Not enabled" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Disabled Module Notice ── */}
                {isDisabled && (
                  <div className="bg-slate-950/80 border border-dashed border-slate-700 rounded-xl p-5 text-center space-y-2">
                    <div className="text-3xl text-slate-600">{activeModule.icon}</div>
                    <p className="text-sm font-semibold text-slate-400">{activeModule.label} Analysis</p>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                      {activeModule.engineNote}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span className="text-xs text-slate-600 font-medium">Analysis engine not currently enabled</span>
                    </div>
                  </div>
                )}

                {/* ── URL / SMS input ── */}
                {!isDisabled && !isFileType && !isEmailType && !isTransactionType && (
                  <div>
                    <label
                      htmlFor="main-input"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                    >
                      {activeModule.inputLabel}
                    </label>
                    <textarea
                      id="main-input"
                      className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition resize-none text-sm"
                      placeholder={activeModule.placeholder}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                )}

                {/* ── Email multi-field input ── */}
                {!isDisabled && isEmailType && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {activeModule.inputLabel}
                    </p>
                    <div>
                      <label htmlFor="email-sender" className="block text-xs text-slate-500 mb-1">Sender (optional)</label>
                      <input
                        id="email-sender"
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition text-sm"
                        placeholder="sender@example.com"
                        value={emailForm.sender}
                        onChange={(e) => setEmailForm((f) => ({ ...f, sender: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="email-subject" className="block text-xs text-slate-500 mb-1">Subject (optional)</label>
                      <input
                        id="email-subject"
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition text-sm"
                        placeholder="Urgent Account Verification"
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="email-body" className="block text-xs text-slate-500 mb-1">
                        Email Body <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        id="email-body"
                        className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition resize-none text-sm"
                        placeholder="Paste the email body here..."
                        value={emailForm.body}
                        onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* ── Transaction Anomaly Input Form ── */}
                {!isDisabled && isTransactionType && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Transaction Parameters
                      </p>
                      <span className="text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full font-mono">
                        Isolation Forest
                      </span>
                    </div>

                    {/* Demonstration Presets */}
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Demo Presets:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTransactionForm({
                            amount: "450",
                            previous_amount: "380",
                            transaction_type: "online_purchase",
                            channel: "web",
                            transaction_time: "14:35",
                            account_age_days: "365",
                            recent_transaction_count: "2",
                            international: false,
                            location: "India",
                          })}
                          className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-800/50 transition font-medium text-left truncate"
                          title="Normal everyday purchase"
                        >
                          ✓ Normal (₹450)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransactionForm({
                            amount: "85000",
                            previous_amount: "450",
                            transaction_type: "transfer",
                            channel: "web",
                            transaction_time: "14:35",
                            account_age_days: "365",
                            recent_transaction_count: "3",
                            international: false,
                            location: "India",
                          })}
                          className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-red-400 hover:border-red-800/50 transition font-medium text-left truncate"
                          title="Large amount spike from ₹450 to ₹85,000"
                        >
                          ⚠ Large Spike (₹85k)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransactionForm({
                            amount: "3500",
                            previous_amount: "1500",
                            transaction_type: "online_purchase",
                            channel: "web",
                            transaction_time: "02:40",
                            account_age_days: "120",
                            recent_transaction_count: "48",
                            international: false,
                            location: "India",
                          })}
                          className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-800/50 transition font-medium text-left truncate"
                          title="High frequency velocity burst (48 recent txns at 2 AM)"
                        >
                          ⚡ High Velocity (48x)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransactionForm({
                            amount: "42000",
                            previous_amount: "300",
                            transaction_type: "transfer",
                            channel: "mobile",
                            transaction_time: "03:15",
                            account_age_days: "8",
                            recent_transaction_count: "15",
                            international: true,
                            location: "Cyprus",
                          })}
                          className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-red-400 hover:border-red-800/50 transition font-medium text-left truncate"
                          title="Cross-border transfer on young account at 3 AM"
                        >
                          🌐 Intl Transfer
                        </button>
                      </div>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Amount */}
                      <div>
                        <label htmlFor="txn-amount" className="block text-xs text-slate-400 font-semibold mb-1">
                          Transaction Amount (INR) <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-500 text-sm font-mono">₹</span>
                          <input
                            id="txn-amount"
                            type="number"
                            step="any"
                            min="1"
                            value={transactionForm.amount}
                            onChange={(e) => setTransactionForm((f) => ({ ...f, amount: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition text-sm font-mono"
                            placeholder="2500"
                          />
                        </div>
                      </div>

                      {/* Previous Amount */}
                      <div>
                        <label htmlFor="txn-prev-amount" className="block text-xs text-slate-400 font-semibold mb-1">
                          Previous Transaction Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-500 text-sm font-mono">₹</span>
                          <input
                            id="txn-prev-amount"
                            type="number"
                            step="any"
                            min="0"
                            value={transactionForm.previous_amount}
                            onChange={(e) => setTransactionForm((f) => ({ ...f, previous_amount: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition text-sm font-mono"
                            placeholder="450"
                          />
                        </div>
                      </div>

                      {/* Transaction Type */}
                      <div>
                        <label htmlFor="txn-type" className="block text-xs text-slate-400 font-semibold mb-1">
                          Transaction Type
                        </label>
                        <select
                          id="txn-type"
                          value={transactionForm.transaction_type}
                          onChange={(e) => setTransactionForm((f) => ({ ...f, transaction_type: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition text-sm"
                        >
                          <option value="online_purchase">Online Purchase</option>
                          <option value="transfer">Fund Transfer</option>
                          <option value="withdrawal">ATM / Cash Withdrawal</option>
                          <option value="payment">Bill / Merchant Payment</option>
                          <option value="other">Other Transaction</option>
                        </select>
                      </div>

                      {/* Channel */}
                      <div>
                        <label htmlFor="txn-channel" className="block text-xs text-slate-400 font-semibold mb-1">
                          Device / Channel
                        </label>
                        <select
                          id="txn-channel"
                          value={transactionForm.channel}
                          onChange={(e) => setTransactionForm((f) => ({ ...f, channel: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition text-sm"
                        >
                          <option value="web">Web Browser</option>
                          <option value="mobile">Mobile Application</option>
                          <option value="pos">Point of Sale (POS)</option>
                          <option value="atm">ATM Terminal</option>
                          <option value="branch">Branch Over-the-counter</option>
                        </select>
                      </div>

                      {/* Transaction Time */}
                      <div>
                        <label htmlFor="txn-time" className="block text-xs text-slate-400 font-semibold mb-1">
                          Transaction Time (24h)
                        </label>
                        <input
                          id="txn-time"
                          type="time"
                          value={transactionForm.transaction_time}
                          onChange={(e) => setTransactionForm((f) => ({ ...f, transaction_time: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition text-sm"
                        />
                      </div>

                      {/* Recent Transaction Count */}
                      <div>
                        <label htmlFor="txn-recent-count" className="block text-xs text-slate-400 font-semibold mb-1">
                          Recent Transaction Count (Velocity)
                        </label>
                        <input
                          id="txn-recent-count"
                          type="number"
                          min="0"
                          value={transactionForm.recent_transaction_count}
                          onChange={(e) => setTransactionForm((f) => ({ ...f, recent_transaction_count: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 transition text-sm font-mono"
                          placeholder="8"
                        />
                      </div>

                      {/* Account Age */}
                      <div>
                        <label htmlFor="txn-age" className="block text-xs text-slate-400 font-semibold mb-1">
                          Account Age (Days)
                        </label>
                        <input
                          id="txn-age"
                          type="number"
                          min="1"
                          value={transactionForm.account_age_days}
                          onChange={(e) => setTransactionForm((f) => ({ ...f, account_age_days: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 transition text-sm font-mono"
                          placeholder="365"
                        />
                      </div>

                      {/* International */}
                      <div>
                        <label htmlFor="txn-intl" className="block text-xs text-slate-400 font-semibold mb-1">
                          International Transaction?
                        </label>
                        <select
                          id="txn-intl"
                          value={transactionForm.international ? "yes" : "no"}
                          onChange={(e) => setTransactionForm((f) => ({ ...f, international: e.target.value === "yes" }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition text-sm"
                        >
                          <option value="no">No (Domestic)</option>
                          <option value="yes">Yes (Cross-Border / International)</option>
                        </select>
                      </div>

                      {/* Location / Country */}
                      <div className="sm:col-span-2">
                        <label htmlFor="txn-location" className="block text-xs text-slate-400 font-semibold mb-1">
                          Location / Country
                        </label>
                        <input
                          id="txn-location"
                          type="text"
                          value={transactionForm.location}
                          onChange={(e) => setTransactionForm((f) => ({ ...f, location: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition text-sm"
                          placeholder="India"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── File / QR upload ── */}
                {!isDisabled && isFileType && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      {activeModule.inputLabel}
                    </label>
                    <div className="flex flex-col items-center justify-center w-full min-h-28 border-2 border-dashed border-slate-800 bg-slate-950 rounded-xl p-4 cursor-pointer hover:border-cyan-500 transition relative">
                      <input
                        type="file"
                        aria-label={`Upload ${scanType === "qr" ? "QR code image" : "file"} for analysis`}
                        accept={scanType === "qr" ? "image/*" : undefined}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                            setResult(null);
                            setError("");
                          }
                        }}
                      />
                      {selectedFile ? (
                        <div className="text-center space-y-1">
                          <div className="text-2xl">{scanType === "qr" ? "🔲" : "📄"}</div>
                          <p className="text-sm text-slate-300 font-semibold">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      ) : (
                        <>
                          <span className="text-3xl text-slate-600 mb-2">
                            {scanType === "qr" ? "🔲" : "📄"}
                          </span>
                          <span className="text-sm text-slate-400">
                            {scanType === "qr"
                              ? "Click or drag a QR code image (PNG, JPG, etc.)"
                              : "Click or drag a file to upload"}
                          </span>
                          <span className="text-xs text-slate-600 mt-1">
                            {scanType === "qr"
                              ? "Supported: PNG, JPG, WEBP, BMP"
                              : "Supports any file — max 50 MB"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Scan Button ── */}
                {!isDisabled && (
                  <button
                    onClick={handleAnalyze}
                    disabled={getButtonDisabled()}
                    aria-label="Run scan analysis"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 font-semibold text-white py-3 px-4 rounded-xl transition duration-200 shadow-lg"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {getLoadingText()}
                      </span>
                    ) : isTransactionType ? "⚡ ANALYZE TRANSACTION" : "⚡ Scan Target"}
                  </button>
                )}

                {/* Error */}
                {error && (
                  <div role="alert" className="p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm rounded-xl">
                    {error}
                  </div>
                )}

                {/* Engine info */}
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Engine: {activeModule.engine}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{activeModule.engineNote}</p>
                </div>

              </div>
            </div>

            {/* Right — Result */}
            <div ref={resultRef}>
              {result ? (
                <ResultPanel result={result} scanType={scanType} />
              ) : (
                <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl min-h-64 flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <span className="text-4xl text-slate-700">◌</span>
                  <p className="text-slate-500 font-semibold">Analysis result will appear here</p>
                  <p className="text-xs text-slate-600 max-w-xs">
                    Select an analysis module, enter your target, and click Scan Target.
                  </p>
                  <button
                    onClick={() => switchTab("guide")}
                    className="text-xs text-cyan-600 hover:text-cyan-400 underline-offset-2 hover:underline transition-colors"
                  >
                    Need help? View the guide →
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ═══ ANALYTICS TAB ═══ */}
        {activeTab === "analytics" && (
          <div>
            <AnalyticsSection key={analyticsKey} />
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center">
        <p className="text-xs text-slate-600">
          AI CyberShield Core · Risk scores represent model outputs, not guaranteed probabilities of compromise.
        </p>
      </footer>
    </div>
  );
}
