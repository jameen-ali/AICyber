import { useMemo } from "react";
import type { AnalysisResult, ScanType, TextEvidence, EmailEvidence, UrlFeatures, TransactionFeatures, Verdict } from "./types";
import { getRiskBand, getRiskBandColor, getRiskColor, getVerdictColor, formatBytes } from "./utils";

/* ─── SVG Gauge ────────────────────────────────────────────────────────────── */
function RiskGauge({ score }: { score: number }) {
  const radius      = 72;
  const stroke      = 12;
  const cx          = 90;
  const cy          = 90;
  const circumference = Math.PI * radius;
  const progress    = (score / 100) * circumference;
  const color       = getRiskColor(score);

  const ticks = [0, 30, 70, 100].map((pct) => {
    const angle  = Math.PI + (pct / 100) * Math.PI;
    const innerR = radius - stroke / 2 - 4;
    const outerR = radius - stroke / 2 + 4;
    return {
      x1: cx + innerR * Math.cos(angle),
      y1: cy + innerR * Math.sin(angle),
      x2: cx + outerR * Math.cos(angle),
      y2: cy + outerR * Math.sin(angle),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-56 overflow-visible">
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none" stroke="#1e293b" strokeWidth={stroke} strokeLinecap="round" />
        {[
          { pct: 30, color: "#10b981" },
          { pct: 40, color: "#f59e0b", offset: 30 },
          { pct: 30, color: "#ef4444", offset: 70 },
        ].map(({ pct, color: c, offset = 0 }) => {
          const sa = Math.PI + (offset / 100) * Math.PI;
          const ea = Math.PI + ((offset + pct) / 100) * Math.PI;
          return (
            <path key={offset}
                  d={`M ${cx + radius * Math.cos(sa)} ${cy + radius * Math.sin(sa)} A ${radius} ${radius} 0 ${pct > 50 ? 1 : 0} 1 ${cx + radius * Math.cos(ea)} ${cy + radius * Math.sin(ea)}`}
                  fill="none" stroke={c} strokeWidth={stroke} opacity={0.15} />
          );
        })}
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              style={{ transition: "stroke-dasharray 0.7s ease, stroke 0.4s ease" }} />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#334155" strokeWidth={1.5} />
        ))}
        <text x={cx - radius - 4} y={cy + 14} textAnchor="middle" fontSize={7} fill="#64748b">LOW</text>
        <text x={cx}              y={cy - radius - 10} textAnchor="middle" fontSize={7} fill="#64748b">MED</text>
        <text x={cx + radius + 4} y={cy + 14} textAnchor="middle" fontSize={7} fill="#64748b">HIGH</text>
      </svg>
      <div className="-mt-12 flex flex-col items-center">
        <span className="text-5xl font-extrabold tabular-nums tracking-tight" style={{ color }}>
          {score.toFixed(0)}
        </span>
        <span className="text-xs text-slate-500 font-semibold tracking-widest uppercase mt-0.5">Risk Score</span>
      </div>
    </div>
  );
}

/* ─── Risk Band Badge ──────────────────────────────────────────────────────── */
function RiskBandBadge({ score }: { score: number }) {
  const band  = getRiskBand(score);
  const color = getRiskBandColor(band);
  const desc  = { LOW: "0–29", MODERATE: "30–69", HIGH: "70–100" }[band];
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-bold px-3 py-1 rounded-full border"
            style={{ color, borderColor: color, background: `${color}15` }}>
        {band} RISK
      </span>
      <span className="text-xs text-slate-600">Application risk band: {desc}</span>
    </div>
  );
}

/* ─── Verdict Badge ─────────────────────────────────────────────────────────── */
function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const color = getVerdictColor(verdict);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-extrabold tracking-widest" style={{ color }}>{verdict}</span>
      <span className="text-xs text-slate-500">Security Verdict</span>
    </div>
  );
}

/* ─── Feature Bar ──────────────────────────────────────────────────────────── */
function FeatureBar({ label, value, max, unit = "" }: { label: string; value: number; max: number; unit?: string }) {
  const pct   = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#06b6d4";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono font-semibold">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Indicator Pill ─────────────────────────────────────────────────────────── */
function IndicatorPill({ label, detected }: { label: string; detected: boolean }) {
  return (
    <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${detected
        ? "bg-red-900/40 text-red-400 border border-red-800"
        : "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"}`}>
        {detected ? "Detected" : "Not Detected"}
      </span>
    </div>
  );
}

/* ─── Evidence Row ───────────────────────────────────────────────────────────── */
function EvidenceRow({ label, value }: { label: string; value: string | number | boolean }) {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <tr className="border-b border-slate-800/60">
      <td className="py-2 pr-4 text-xs text-slate-500 font-mono whitespace-nowrap">{label}</td>
      <td className="py-2 text-xs text-slate-200 font-mono break-all">{display}</td>
    </tr>
  );
}

/* ─── Section Card ───────────────────────────────────────────────────────────── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">⬡ {title}</p>
      {children}
    </div>
  );
}

/* ─── URL Feature Breakdown (shared by url and qr+url) ───────────────────── */
function UrlFeatureSection({ features }: { features: UrlFeatures }) {
  return (
    <div className="space-y-3">
      <FeatureBar label="URL Length"   value={features.url_length}   max={200} />
      <FeatureBar label="Dot Count"    value={features.dot_count}    max={10} />
      <FeatureBar label="Hyphen Count" value={features.hyphen_count} max={10} />
      <div className="space-y-2 mt-3">
        <IndicatorPill label="IP Address in URL" detected={features.is_ip === 1} />
        <IndicatorPill label="@ Symbol in URL"   detected={features.has_at_symbol === 1} />
      </div>
      <p className="text-xs text-slate-600 mt-2">
        Feature values extracted from URL structure. Lengths normalized for display only.
      </p>
    </div>
  );
}

/* ─── Transaction Feature Breakdown ─────────────────────────────────────────── */
function TransactionEvidenceSection({
  features,
  anomalyScore,
  contributingFactors,
}: {
  features: TransactionFeatures;
  anomalyScore?: number;
  contributingFactors?: string[];
}) {
  const diffSign = features.amount_difference >= 0 ? "+" : "";
  const ratio = features.amount_ratio ?? (features.amount / (features.previous_amount + 1));

  return (
    <div className="space-y-4">
      {/* Metric Callout Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold">Transaction Amount</p>
          <p className="text-base font-mono font-bold text-slate-100 mt-0.5">₹{features.amount.toLocaleString()}</p>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold">Previous Amount</p>
          <p className="text-base font-mono font-bold text-slate-300 mt-0.5">₹{features.previous_amount.toLocaleString()}</p>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold">Amount Change</p>
          <p className={`text-base font-mono font-bold mt-0.5 ${features.amount_difference > 15000 ? "text-red-400" : "text-cyan-400"}`}>
            {diffSign}₹{features.amount_difference.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold">Recent Txn Count</p>
          <p className="text-base font-mono font-bold text-slate-200 mt-0.5">{features.recent_transaction_count}</p>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold">Account Age</p>
          <p className="text-base font-mono font-bold text-slate-200 mt-0.5">{features.account_age_days} days</p>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold">Cross-Border</p>
          <p className={`text-base font-mono font-bold mt-0.5 ${features.international ? "text-amber-400" : "text-emerald-400"}`}>
            {features.international ? "YES (INTL)" : "NO (DOMESTIC)"}
          </p>
        </div>
      </div>

      {/* Feature Level Progress Bars */}
      <div className="space-y-3 pt-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Anomaly Risk Factors</p>
        <FeatureBar label="Amount Relative to Normal Baseline" value={features.amount} max={40000} unit=" INR" />
        <FeatureBar label="Recent Transaction Velocity" value={features.recent_transaction_count} max={25} />
        <FeatureBar label="Amount Ratio vs Previous" value={Math.round(ratio * 10) / 10} max={10} unit="x" />
        <FeatureBar label="Transaction Timing" value={features.transaction_hour} max={24} unit=":00" />
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <IndicatorPill label="Cross-Border / International" detected={features.international} />
        <IndicatorPill label="Late-Night Off-Peak (00:00 - 05:00)" detected={features.transaction_hour < 6} />
      </div>

      {/* Contextual Badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-xs bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
          Channel: <strong className="text-slate-200">{features.channel.toUpperCase()}</strong>
        </span>
        <span className="text-xs bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
          Type: <strong className="text-slate-200">{features.transaction_type.replace(/_/g, ' ').toUpperCase()}</strong>
        </span>
        <span className="text-xs bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
          Location: <strong className="text-slate-200">{features.location}</strong>
        </span>
      </div>

      {/* Identified Contributing Indicators */}
      {contributingFactors && contributingFactors.length > 0 && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <span className="text-amber-400">⚡</span> Identified Contributing Indicators
          </p>
          <ul className="space-y-1.5">
            {contributingFactors.map((factor, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-cyan-400 shrink-0 font-mono">▸</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Isolation Forest Raw Metric */}
      {anomalyScore !== undefined && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-mono">
          <span>Isolation Forest raw score: {anomalyScore.toFixed(4)}</span>
          <span className="text-slate-600">(Negative values indicate anomaly)</span>
        </div>
      )}
    </div>
  );
}

/* ─── Explanations ──────────────────────────────────────────────────────────── */
function getExplanation(scanType: ScanType, result: AnalysisResult): string {
  const score = result.risk_score.toFixed(1);
  switch (scanType) {
    case "sms":
      return result.verdict === "THREAT"
        ? `The SMS content was classified as a potential phishing threat by the TF-IDF + Multinomial Naive Bayes engine (risk score: ${score}%). The model detected linguistic patterns associated with phishing or social-engineering attempts.`
        : `The SMS content received a low threat score (${score}%) from the phishing classifier. This does not guarantee the message is legitimate or completely safe.`;
    case "url":
      return result.verdict === "THREAT"
        ? `The submitted URL was classified as a threat by the Random Forest URL model (risk score: ${score}%). The model evaluated structural URL characteristics. CyberShield did not visit or execute the URL.`
        : `The submitted URL received a low threat score (${score}%) from the structural URL model. This does not guarantee the destination is safe. CyberShield did not visit the URL.`;
    case "email":
      return result.verdict === "THREAT"
        ? `The email was classified as a potential threat (risk score: ${score}%). The body was analyzed by the phishing classifier. ${(result.evidence as EmailEvidence)?.url_analyses?.some(u => u.verdict === "THREAT") ? "Additionally, one or more URLs detected in the email body were structurally classified as suspicious." : ""}`
        : `The email content received a low threat score (${score}%) from the phishing classifier. Any embedded URLs were also structurally analyzed without being visited.`;
    case "file":
      return result.verdict === "THREAT"
        ? `The uploaded file's SHA-256 hash matched a known signature in the configured local malware database. The file should be treated as potentially malicious.`
        : `The uploaded file's SHA-256 hash was compared against the local signature database. No matching signature was found. This does not prove the file is safe — it means no matching hash was present in the current database.`;
    case "qr":
      return result.verdict === "THREAT"
        ? `The QR code decoded to "${result.decoded_content?.substring(0, 60)}..." which was classified as a threat (risk score: ${score}%) by the underlying ${result.underlying_engine}.`
        : `The QR code decoded to "${result.decoded_content?.substring(0, 60)}..." which received a low threat score (${score}%) from the underlying ${result.underlying_engine}. CyberShield decoded the content only and did not navigate to any destination.`;
    case "transaction":
      if (result.verdict === "HIGH RISK") {
        return `The transaction was identified as highly anomalous by the configured analysis model (risk score: ${score}%). Significant statistical deviations detected across amount, velocity, or timing parameters. Additional verification is recommended.`;
      } else if (result.verdict === "SUSPICIOUS") {
        return `The transaction contains characteristics that differ from patterns represented in the configured analysis data (risk score: ${score}%). Consider verifying the transaction before proceeding.`;
      } else {
        return `The transaction does not appear anomalous according to the configured analysis model (risk score: ${score}%). This does not guarantee that the transaction is completely safe.`;
      }
    default:
      return "";
  }
}

function getRecommendation(scanType: ScanType, result: AnalysisResult): { text: string; severity: "safe" | "threat" | "moderate" } {
  const band = getRiskBand(result.risk_score);

  if (scanType === "transaction") {
    if (result.verdict === "HIGH RISK" || band === "HIGH") {
      return {
        severity: "threat",
        text: "Place transaction on temporary hold for manual verification. High anomaly score detected across amount, timing, or velocity parameters.",
      };
    }
    if (result.verdict === "SUSPICIOUS" || band === "MODERATE") {
      return {
        severity: "moderate",
        text: "Request secondary confirmation (such as 2FA or SMS OTP) before authorizing this transaction due to moderate deviations in transaction parameters.",
      };
    }
    return {
      severity: "safe",
      text: "Proceed with normal verification procedures. The transaction falls within expected behavioral patterns.",
    };
  }

  if (result.verdict === "THREAT") {
    return {
      severity: "threat",
      text: scanType === "file"
        ? "Do not execute or open this file. Treat it as potentially malicious until independently verified by a trusted security tool."
        : scanType === "qr"
        ? "Do not navigate to or interact with the content decoded from this QR code until it has been independently verified."
        : "Avoid interacting with this content until it has been independently verified by a trusted security source.",
    };
  }
  if (band === "MODERATE") {
    return {
      severity: "moderate",
      text: "Perform additional verification before interacting. The current score falls in the moderate risk range.",
    };
  }
  if (scanType === "file") {
    return {
      severity: "safe",
      text: "No matching signature was found in the local database. Do not treat a non-matching hash as proof of safety. Continue with caution.",
    };
  }
  return {
    severity: "safe",
    text: "Continue with normal caution. This result reflects the current model's assessment only and does not guarantee safety.",
  };
}

/* ─── Model Note ─────────────────────────────────────────────────────────────── */
function ModelNote({ scanType }: { scanType: ScanType }) {
  const notes: Record<ScanType, string> = {
    sms:         "The phishing classifier is trained on a demonstration-scale dataset. Risk scores represent model output probabilities, not guaranteed probabilities of compromise.",
    url:         "The URL engine evaluates structural URL features and does not visit the submitted destination. It does not inspect page content, DNS records, or certificate validity.",
    email:       "Email body analysis uses the same phishing text classifier. URL analysis within emails is structural only — no URLs are visited or executed.",
    transaction: "Transaction anomaly detection uses an unsupervised Isolation Forest model trained on demonstration transaction distributions. It identifies behavioral outliers and is intended for PBL demonstration, not production fraud prevention.",
    file:        "A non-matching hash does not prove that a file is safe. It indicates no matching signature was found in the configured local signature database.",
    qr:          "QR analysis decodes the image content and then routes it through the URL or text analysis engine. The underlying engine limitations apply. No URLs are visited.",
  };
  return (
    <div className="bg-slate-950/60 border border-slate-800/80 border-dashed rounded-xl p-4 flex gap-3">
      <span className="text-slate-500 text-base shrink-0 mt-0.5">ℹ</span>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Model / Analysis Note</p>
        <p className="text-xs text-slate-500 leading-relaxed">{notes[scanType]}</p>
      </div>
    </div>
  );
}

/* ─── Main Result Panel ────────────────────────────────────────────────────── */
interface ResultPanelProps {
  result: AnalysisResult;
  scanType: ScanType;
}

export function ResultPanel({ result, scanType }: ResultPanelProps) {
  const explanation    = useMemo(() => getExplanation(scanType, result), [scanType, result]);
  const recommendation = useMemo(() => getRecommendation(scanType, result), [scanType, result]);

  const rcColors = {
    safe:     { bg: "bg-emerald-950/30", border: "border-emerald-800/40", text: "text-emerald-300", icon: "✓" },
    threat:   { bg: "bg-red-950/40",     border: "border-red-800/50",     text: "text-red-300",     icon: "✕" },
    moderate: { bg: "bg-amber-950/30",   border: "border-amber-800/40",   text: "text-amber-300",   icon: "⚠" },
  };
  const rc = rcColors[recommendation.severity];

  const textEvidence  = (scanType === "sms") ? (result.evidence as TextEvidence) : null;
  const emailEvidence = (scanType === "email") ? (result.evidence as EmailEvidence) : null;
  const qrEvidence    = (scanType === "qr") ? (result.evidence as { safe_probability?: number; threat_probability?: number; url_features?: UrlFeatures }) : null;
  const urlFeatures   = (scanType === "url") ? (result.features as UrlFeatures) : null;
  const txnFeatures   = (scanType === "transaction") ? (result.features as TransactionFeatures) : null;

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Gauge + Verdict ── */}
      <SectionCard title="Current Scan Risk">
        <div className="flex flex-col items-center gap-4">
          <RiskGauge score={result.risk_score} />
          <RiskBandBadge score={result.risk_score} />
          <VerdictBadge verdict={result.verdict} />
          <p className="text-xs text-slate-600 text-center">Engine: {result.engine}</p>
        </div>
      </SectionCard>

      {/* ── URL Feature Breakdown ── */}
      {scanType === "url" && urlFeatures && (
        <SectionCard title="URL Structure — Why was this flagged?">
          <UrlFeatureSection features={urlFeatures} />
        </SectionCard>
      )}

      {/* ── SMS Text Probabilities ── */}
      {scanType === "sms" && textEvidence && (
        <SectionCard title="Why was this flagged?">
          <div className="space-y-3">
            <FeatureBar label="Threat Probability" value={textEvidence.threat_probability} max={100} unit="%" />
            <FeatureBar label="Safe Probability"   value={textEvidence.safe_probability}   max={100} unit="%" />
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Probabilities are direct outputs from the Multinomial Naive Bayes classifier.
          </p>
        </SectionCard>
      )}

      {/* ── Email Analysis ── */}
      {scanType === "email" && emailEvidence && (
        <SectionCard title="Email Analysis — Why was this flagged?">
          <div className="space-y-3 mb-4">
            <FeatureBar label="Text Threat Probability" value={emailEvidence.threat_probability} max={100} unit="%" />
            <FeatureBar label="Text Safe Probability"   value={emailEvidence.safe_probability}   max={100} unit="%" />
          </div>

          {/* Detected URLs */}
          {emailEvidence.detected_urls.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Detected URLs ({emailEvidence.detected_urls.length})
              </p>
              <div className="space-y-2">
                {emailEvidence.detected_urls.slice(0, 5).map((u, i) => {
                  const analysis = emailEvidence.url_analyses.find((a) => a.url === u);
                  return (
                    <div key={i} className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2">
                      <p className="text-xs font-mono text-slate-300 truncate">{u}</p>
                      {analysis && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">Risk: {analysis.risk_score.toFixed(1)}%</span>
                          <span className={`text-xs font-bold ${analysis.verdict === "THREAT" ? "text-red-400" : "text-emerald-400"}`}>
                            {analysis.verdict}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {emailEvidence.url_analyses.some(u => u.verdict === "THREAT") && (
                <div className="mt-2 flex gap-1.5 bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
                  <span className="text-red-400 text-xs">⚠</span>
                  <p className="text-xs text-red-300/80">One or more URLs structurally classified as suspicious. URLs were not visited.</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── QR Result ── */}
      {scanType === "qr" && result.decoded_content && (
        <SectionCard title="QR Code Decoded Content">
          <div className="space-y-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Decoded Content</p>
              <p className="text-sm font-mono text-slate-200 break-all">{result.decoded_content}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Content Type:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                result.content_type === "url" ? "bg-purple-900/40 text-purple-400 border border-purple-800" : "bg-cyan-900/40 text-cyan-400 border border-cyan-800"
              }`}>
                {result.content_type?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500">Underlying engine: {result.underlying_engine}</p>

            {qrEvidence?.url_features && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">URL Structural Features</p>
                <UrlFeatureSection features={qrEvidence.url_features} />
              </div>
            )}
            {qrEvidence?.threat_probability !== undefined && (
              <div className="space-y-2 mt-2">
                <FeatureBar label="Threat Probability" value={qrEvidence.threat_probability} max={100} unit="%" />
                <FeatureBar label="Safe Probability"   value={qrEvidence.safe_probability ?? 0} max={100} unit="%" />
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Transaction Result ── */}
      {scanType === "transaction" && txnFeatures && (
        <SectionCard title="Transaction Characteristics — Why was this flagged?">
          <TransactionEvidenceSection
            features={txnFeatures}
            anomalyScore={result.anomaly_score}
            contributingFactors={result.contributing_factors}
          />
        </SectionCard>
      )}

      {/* ── Analysis Evidence Table ── */}
      <SectionCard title="Analysis Evidence">
        <table className="w-full">
          <tbody>
            {scanType === "url" && urlFeatures && (
              <>
                <EvidenceRow label="URL"           value={result.url ?? ""} />
                <EvidenceRow label="url_length"    value={urlFeatures.url_length} />
                <EvidenceRow label="dot_count"     value={urlFeatures.dot_count} />
                <EvidenceRow label="hyphen_count"  value={urlFeatures.hyphen_count} />
                <EvidenceRow label="is_ip"         value={urlFeatures.is_ip === 1 ? "Yes" : "No"} />
                <EvidenceRow label="has_at_symbol" value={urlFeatures.has_at_symbol === 1 ? "Yes" : "No"} />
                <EvidenceRow label="Engine"        value={result.engine} />
              </>
            )}
            {scanType === "sms" && textEvidence && (
              <>
                <EvidenceRow label="threat_probability" value={`${textEvidence.threat_probability.toFixed(2)}%`} />
                <EvidenceRow label="safe_probability"   value={`${textEvidence.safe_probability.toFixed(2)}%`} />
                <EvidenceRow label="Engine"             value={result.engine} />
              </>
            )}
            {scanType === "email" && emailEvidence && (
              <>
                <EvidenceRow label="Sender"             value={result.sender || "(not provided)"} />
                <EvidenceRow label="Subject"            value={result.subject || "(not provided)"} />
                <EvidenceRow label="threat_probability" value={`${emailEvidence.threat_probability.toFixed(2)}%`} />
                <EvidenceRow label="safe_probability"   value={`${emailEvidence.safe_probability.toFixed(2)}%`} />
                <EvidenceRow label="Detected URLs"      value={emailEvidence.detected_urls.length} />
                <EvidenceRow label="Suspicious URLs"    value={emailEvidence.url_analyses.filter(u => u.verdict === "THREAT").length} />
                <EvidenceRow label="Engine"             value={result.engine} />
              </>
            )}
            {scanType === "file" && (
              <>
                <EvidenceRow label="Filename"        value={result.filename ?? ""} />
                <EvidenceRow label="File Size"       value={formatBytes(result.file_size ?? 0)} />
                <EvidenceRow label="SHA-256"         value={result.hash ?? ""} />
                <EvidenceRow label="Signature Match" value={result.signature_match ?? false} />
                <EvidenceRow label="Engine"          value={result.engine} />
              </>
            )}
            {scanType === "qr" && result.decoded_content && (
              <>
                <EvidenceRow label="Decoded Content" value={result.decoded_content.substring(0, 100) + (result.decoded_content.length > 100 ? "…" : "")} />
                <EvidenceRow label="Content Type"    value={result.content_type ?? ""} />
                <EvidenceRow label="Underlying Engine" value={result.underlying_engine ?? ""} />
                {qrEvidence?.threat_probability !== undefined && (
                  <EvidenceRow label="threat_probability" value={`${qrEvidence.threat_probability?.toFixed(2)}%`} />
                )}
                <EvidenceRow label="Engine"          value={result.engine} />
              </>
            )}
            {scanType === "transaction" && txnFeatures && (
              <>
                <EvidenceRow label="Amount"                   value={`₹${txnFeatures.amount.toLocaleString()}`} />
                <EvidenceRow label="Previous Amount"          value={`₹${txnFeatures.previous_amount.toLocaleString()}`} />
                <EvidenceRow label="Amount Difference"        value={`₹${txnFeatures.amount_difference.toLocaleString()}`} />
                <EvidenceRow label="Recent Transaction Count" value={txnFeatures.recent_transaction_count} />
                <EvidenceRow label="Account Age"              value={`${txnFeatures.account_age_days} days`} />
                <EvidenceRow label="Transaction Hour"         value={`${txnFeatures.transaction_hour}:00`} />
                <EvidenceRow label="International"            value={txnFeatures.international} />
                <EvidenceRow label="Channel"                  value={txnFeatures.channel} />
                <EvidenceRow label="Transaction Type"         value={txnFeatures.transaction_type} />
                <EvidenceRow label="Location"                 value={txnFeatures.location} />
                <EvidenceRow label="Anomaly Score"            value={result.anomaly_score !== undefined ? result.anomaly_score.toFixed(4) : "—"} />
                <EvidenceRow label="Engine"                   value={result.engine} />
              </>
            )}
          </tbody>
        </table>
      </SectionCard>

      {/* ── File-specific display ── */}
      {scanType === "file" && (
        <SectionCard title="File Integrity Result">
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-400">Signature Status</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                result.signature_match
                  ? "bg-red-900/40 text-red-400 border border-red-800"
                  : "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"
              }`}>
                {result.signature_match ? "MATCH FOUND" : "NO MATCH FOUND"}
              </span>
            </div>
            {!result.signature_match && (
              <div className="flex gap-1.5 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
                <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚠</span>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  No known signature was found in the configured local database. This does not guarantee that the file is malware-free.
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── What does this mean? ── */}
      {explanation && (
        <SectionCard title="What does this result mean?">
          <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
        </SectionCard>
      )}

      {/* ── Recommended Action ── */}
      <div className={`${rc.bg} border ${rc.border} rounded-2xl p-5`}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">⬡ Recommended Action</p>
        <div className="flex gap-3 items-start">
          <span className={`text-xl font-bold ${rc.text} shrink-0`}>{rc.icon}</span>
          <p className={`text-sm leading-relaxed ${rc.text}`}>{recommendation.text}</p>
        </div>
      </div>

      {/* ── Model Note ── */}
      <ModelNote scanType={scanType} />

    </div>
  );
}
