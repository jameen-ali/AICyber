import React from "react";

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
function IconURL()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>; }
function IconSMS()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>; }
function IconEmail(){ return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>; }
function IconTxn()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>; }
function IconFile() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>; }
function IconQR()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="14" y1="14" x2="20" y2="14" /><line x1="14" y1="14" x2="14" y2="20" /><line x1="20" y1="20" x2="20" y2="20" /></svg>; }

/* ─── Pipeline ──────────────────────────────────────────────────────────────── */
function Pipeline({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-col gap-1 my-3">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="text-xs font-mono bg-slate-950/80 border border-slate-700/60 text-cyan-400 px-3 py-1.5 rounded-lg text-center">{s}</div>
          {i < steps.length - 1 && <div className="text-slate-600 text-center text-xs">↓</div>}
        </React.Fragment>
      ))}
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{label}</span>;
}

function Notice({ warn, children }: { warn?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex gap-2 rounded-lg px-3 py-2 mt-3 ${warn ? "bg-amber-950/30 border border-amber-800/40" : "bg-slate-800/40 border border-slate-700/40"}`}>
      <span className={`text-xs mt-0.5 shrink-0 ${warn ? "text-amber-400" : "text-slate-500"}`}>{warn ? "⚠" : "ℹ"}</span>
      <p className={`text-xs leading-relaxed ${warn ? "text-amber-300/80" : "text-slate-400"}`}>{children}</p>
    </div>
  );
}

/* ─── Guide Card ─────────────────────────────────────────────────────────────── */
interface GuideCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  pipeline: string[];
  description: string;
  bestFor: string[];
  limitations: string;
  notices?: { warn: boolean; text: string }[];
  example?: { label: string; text: string };
  accentColor: string;
  disabled?: boolean;
}

function GuideCard({ icon, title, subtitle, pipeline, description, bestFor, limitations, notices, example, accentColor, disabled }: GuideCardProps) {
  return (
    <div className={`bg-slate-900 border rounded-2xl p-5 flex flex-col gap-3 transition-colors duration-300 ${disabled ? "border-slate-800/50 opacity-70" : "border-slate-800 hover:border-slate-700"}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl shrink-0" style={{ background: `${accentColor}20`, color: accentColor }}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide text-slate-100">{title}</h3>
            {disabled && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded border border-slate-700">Not enabled</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>

      <Pipeline steps={pipeline} />

      {example && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">{example.label}</p>
          <p className="text-xs font-mono text-slate-400 italic leading-relaxed">"{example.text}"</p>
          <p className="text-xs text-slate-600 mt-1">↑ Example only — not auto-classified</p>
        </div>
      )}

      {notices?.map((n, i) => <Notice key={i} warn={n.warn}>{n.text}</Notice>)}

      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Best for</p>
        <div className="flex flex-wrap gap-1.5">{bestFor.map((t) => <Tag key={t} label={t} />)}</div>
      </div>

      <div className="mt-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Limitations</p>
        <p className="text-xs text-slate-500 leading-relaxed">{limitations}</p>
      </div>
    </div>
  );
}

/* ─── Main Guide Section ─────────────────────────────────────────────────────── */
export function CyberShieldGuide() {
  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
          <span className="text-cyan-400 text-xs">◈</span>
          <span className="text-xs font-bold text-slate-300 tracking-widest uppercase">How to Use AI CyberShield</span>
          <span className="text-cyan-400 text-xs">◈</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* 1 — URL */}
        <GuideCard
          icon={<IconURL />}
          title="URL Threat Analysis"
          subtitle="Module 1 — Random Forest Ensemble"
          accentColor="#8b5cf6"
          description="Enter a suspicious URL to evaluate its structural characteristics without visiting the destination."
          pipeline={["URL INPUT", "FEATURE EXTRACTION", "RANDOM FOREST", "RISK SCORE", "SECURITY VERDICT"]}
          notices={[
            { warn: true, text: "CyberShield analyzes URL structure only. It does not open or execute the submitted URL — safe by design." }
          ]}
          bestFor={["Suspicious links", "Login URLs", "Verification links", "Unknown domains", "Shortened URLs"]}
          limitations="The model evaluates structural features only (length, dots, hyphens, IP, @ symbol). It does not inspect page content, DNS, or SSL certificates."
        />

        {/* 2 — SMS */}
        <GuideCard
          icon={<IconSMS />}
          title="SMS & Text Analysis"
          subtitle="Module 2 — NLP Classifier"
          accentColor="#06b6d4"
          description="Paste a suspicious SMS, message or social-engineering text to evaluate its likelihood of being a phishing threat."
          pipeline={["TEXT INPUT", "TF-IDF VECTORIZATION", "NAIVE BAYES", "RISK SCORE", "SECURITY VERDICT"]}
          example={{ label: "Example input", text: "URGENT: Your account has been suspended. Verify immediately." }}
          bestFor={["SMS messages", "Suspicious texts", "Social-engineering attempts", "OTP abuse messages"]}
          limitations="The current phishing classifier is trained on a demonstration-scale dataset. Results should not be treated as production-grade detection."
        />

        {/* 3 — Email */}
        <GuideCard
          icon={<IconEmail />}
          title="Email Analysis"
          subtitle="Module 3 — NLP + URL Structural Analysis"
          accentColor="#3b82f6"
          description="Analyze email content including sender, subject, and body. Embedded URLs are structurally analyzed without being visited."
          pipeline={["EMAIL BODY", "TF-IDF + NAIVE BAYES", "URL EXTRACTION", "URL STRUCTURAL ANALYSIS", "COMBINED RISK SCORE", "VERDICT"]}
          notices={[
            { warn: false, text: "URLs detected in the email body are structurally analyzed through the URL engine. No URLs are visited or executed." },
            { warn: true,  text: "Sender reputation and domain reputation data are not available in this prototype. Only content is analyzed." }
          ]}
          bestFor={["Phishing emails", "Suspicious newsletters", "Account verification emails", "Urgent action emails"]}
          limitations="Email analysis uses text-based phishing classification and structural URL analysis only. Header analysis, DKIM, SPF, and DMARC validation are not supported."
        />

        {/* 4 — Transaction */}
        <GuideCard
          icon={<IconTxn />}
          title="Transaction Anomaly Analysis"
          subtitle="Module 4 — Isolation Forest Anomaly Detection"
          accentColor="#f59e0b"
          description="Evaluates transaction parameters (volume, amount jump, velocity, time of day, account age, cross-border flag) against demonstration baseline distributions to identify behavioral outliers."
          pipeline={["TRANSACTION INPUT", "FEATURE EXTRACTION", "STANDARD SCALER", "ISOLATION FOREST", "ANOMALY SCORE", "RISK SCORE", "VERDICT"]}
          notices={[
            { warn: false, text: "Unsupervised Isolation Forest algorithm scores deviations from normal personal banking baseline distributions." },
            { warn: true,  text: "This is a prototype anomaly-detection system and should not be treated as a production financial fraud-detection service." }
          ]}
          bestFor={[
            "Demonstrating transaction anomaly detection",
            "Identifying unusual transaction patterns",
            "Academic cybersecurity analysis",
            "Card velocity and off-peak spikes"
          ]}
          limitations="Unsupervised anomaly detection identifies statistical outliers relative to the configured demonstration dataset; it does not constitute conclusive legal proof of criminal fraud."
        />

        {/* 5 — File */}
        <GuideCard
          icon={<IconFile />}
          title="File Integrity Analysis"
          subtitle="Module 5 — SHA-256 Signature Match"
          accentColor="#f97316"
          description="Upload a file to calculate its SHA-256 hash and compare it against the configured local malware signature database."
          pipeline={["FILE UPLOAD", "SHA-256 COMPUTATION", "SIGNATURE DATABASE LOOKUP", "RISK RESULT", "VERDICT"]}
          notices={[
            { warn: true, text: "A file not matching the local database is NOT automatically proven safe. A non-matching hash indicates no signature was found — not that the file is clean." }
          ]}
          bestFor={["Suspicious downloads", "Unknown executables", "Archive files", "Integrity verification"]}
          limitations="Only files whose SHA-256 hash exists in the configured local signature database will be flagged. Unknown malware will not be detected."
        />

        {/* 6 — QR */}
        <GuideCard
          icon={<IconQR />}
          title="QR Code Analysis"
          subtitle="Module 6 — OpenCV QR Decode + URL/Text Engine"
          accentColor="#10b981"
          description="Upload a QR code image. CyberShield decodes the content using OpenCV and routes it through the URL or text analysis engine."
          pipeline={["QR IMAGE UPLOAD", "OPENCV QR DECODE", "CONTENT TYPE DETECTION", "URL OR TEXT ENGINE", "RISK SCORE", "VERDICT"]}
          notices={[
            { warn: false, text: "If decoded content is a URL, it is analyzed structurally using the Random Forest engine. If it is text, the phishing classifier is used." },
            { warn: true,  text: "CyberShield decodes QR content for analysis only. No URLs extracted from QR codes are visited or executed." }
          ]}
          bestFor={["Suspicious QR codes", "Unknown QR images", "QR phishing detection", "Malicious redirect detection"]}
          limitations="QR decoding requires a clear, unobstructed QR code image in a supported format (PNG, JPG, WEBP). Heavily distorted or damaged QR codes may not decode successfully."
        />

      </div>
    </section>
  );
}
