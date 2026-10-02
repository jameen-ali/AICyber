import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import type { AnalyticsData, HistoryData, ScanRecord } from "./types";
import { formatTimestamp, formatTime, getRiskColor, SCAN_TYPE_LABELS, SCAN_TYPE_COLORS } from "./utils";

const API = "http://127.0.0.1:8000";

/* ─── Stat Card ──────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">{label}</p>
      <p className="text-2xl font-extrabold" style={{ color: color ?? "#e2e8f0" }}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Section Header ──────────────────────────────────────────────────────────── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">⬡ {children}</p>;
}

/* ─── Empty State ─────────────────────────────────────────────────────────────── */
function EmptyState({ message = "No data available." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <span className="text-3xl text-slate-700">◌</span>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}

/* ─── Verdict Donut ──────────────────────────────────────────────────────────── */
const VERDICT_COLORS: Record<string, string> = { SAFE: "#10b981", THREAT: "#ef4444" };

function VerdictDonut({ safe, threat, onSelect }: { safe: number; threat: number; onSelect: (v: string | null) => void }) {
  const data = [{ name: "SAFE", value: safe }, { name: "THREAT", value: threat }].filter((d) => d.value > 0);
  if (data.length === 0) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value"
             onClick={(d) => onSelect((d as any)?.name ?? null)} style={{ cursor: "pointer" }}>
          {data.map((e) => <Cell key={e.name} fill={VERDICT_COLORS[e.name] ?? "#64748b"} />)}
        </Pie>
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                 formatter={(v: any) => [`${v} scans`, ""]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─── Activity Type Bar Chart ─────────────────────────────────────────────────── */
function TypeBar({ types }: { types: AnalyticsData["analysis_types"] }) {
  const data = Object.entries(types)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: SCAN_TYPE_LABELS[k] ?? k, value: v, fill: SCAN_TYPE_COLORS[k] ?? "#64748b" }));
  if (data.length === 0) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ left: 0, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                 formatter={(v: any) => [`${v} scans`, "Count"]} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Risk Distribution Bar ───────────────────────────────────────────────────── */
function RiskDistBar({ low, moderate, high }: { low: number; moderate: number; high: number }) {
  const total = low + moderate + high;
  if (total === 0) return <EmptyState message="Not enough historical scans for a meaningful distribution." />;
  const data = [
    { name: "LOW (0–29)",      value: low,      fill: "#10b981" },
    { name: "MODERATE (30–69)", value: moderate, fill: "#f59e0b" },
    { name: "HIGH (70–100)",   value: high,     fill: "#ef4444" },
  ];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={115} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                 formatter={(v: any) => [`${v} scans`, "Count"]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Average Risk by Type Bar ────────────────────────────────────────────────── */
function AvgRiskByType({ analytics }: { analytics: AnalyticsData }) {
  const entries: { name: string; value: number; fill: string }[] = [];
  if (analytics.text_analytics)  entries.push({ name: "Text/SMS",   value: analytics.text_analytics.average_risk,  fill: SCAN_TYPE_COLORS.text });
  if (analytics.url_analytics)   entries.push({ name: "URL",        value: analytics.url_analytics.average_risk,   fill: SCAN_TYPE_COLORS.url });
  if (analytics.file_analytics && analytics.analysis_types.file > 0) {
    const fileRecords = analytics.risk_trend.filter(r => r.analysis_type === "file");
    const avgFile = fileRecords.length > 0 ? fileRecords.reduce((s, r) => s + r.risk_score, 0) / fileRecords.length : 0;
    entries.push({ name: "File", value: Math.round(avgFile * 10) / 10, fill: SCAN_TYPE_COLORS.file });
  }
  if (analytics.email_analytics)       entries.push({ name: "Email",       value: analytics.email_analytics.average_risk,       fill: SCAN_TYPE_COLORS.email });
  if (analytics.qr_analytics)          entries.push({ name: "QR",          value: analytics.qr_analytics.average_risk,          fill: SCAN_TYPE_COLORS.qr });
  if (analytics.transaction_analytics) entries.push({ name: "Transaction", value: analytics.transaction_analytics.average_risk, fill: SCAN_TYPE_COLORS.transaction });
  if (entries.length === 0) return <EmptyState message="No per-type risk data yet." />;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={entries} margin={{ left: 0, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                 formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Avg Risk"]} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {entries.map((d) => <Cell key={d.name} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Risk Trend ──────────────────────────────────────────────────────────────── */
type TrendWindow = "7d" | "30d" | "all";

function RiskTrend({ trend }: { trend: AnalyticsData["risk_trend"] }) {
  const [window, setWindow] = useState<TrendWindow>("all");
  const filtered = trend.filter((r) => {
    if (window === "all") return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (window === "7d" ? 7 : 30));
    return new Date(r.timestamp) >= cutoff;
  });
  if (filtered.length === 0) {
    return <EmptyState message={trend.length === 0 ? "Risk trend will appear as more scans are performed." : "No scans in this time range."} />;
  }
  const chartData = filtered.map((r) => ({
    time:    formatTime(r.timestamp),
    score:   r.risk_score,
    type:    SCAN_TYPE_LABELS[r.analysis_type] ?? r.analysis_type,
    verdict: r.verdict,
  }));
  return (
    <div>
      <div className="flex gap-2 mb-3 justify-end">
        {(["7d", "30d", "all"] as TrendWindow[]).map((w) => (
          <button key={w} onClick={() => setWindow(w)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${window === w ? "bg-cyan-900/40 text-cyan-400 border-cyan-800" : "text-slate-500 border-slate-800 hover:border-slate-700"}`}>
            {w === "all" ? "All Time" : w === "7d" ? "7 Days" : "30 Days"}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ right: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                   formatter={(v: any, _: any, props: any) => [
                     `${Number(v).toFixed(1)}% — ${props?.payload?.type ?? ""} — ${props?.payload?.verdict ?? ""}`, "Risk Score"
                   ]} />
          <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props as { cx: number; cy: number; payload: { score: number } };
                  return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={getRiskColor(payload.score)} stroke="#0f172a" strokeWidth={2} />;
                }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── History Table ───────────────────────────────────────────────────────────── */
function HistoryTable({ records }: { records: ScanRecord[] }) {
  if (records.length === 0) return <EmptyState message="No analysis history yet. Run your first analysis to populate CyberShield analytics." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            {["Time", "Type", "Risk", "Verdict", "Engine"].map((h) => (
              <th key={h} className="py-2 pr-3 text-left text-slate-500 font-semibold uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
              <td className="py-2 pr-3 text-slate-400 font-mono whitespace-nowrap">{formatTimestamp(r.timestamp)}</td>
              <td className="py-2 pr-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: `${SCAN_TYPE_COLORS[r.analysis_type] ?? "#64748b"}15`, color: SCAN_TYPE_COLORS[r.analysis_type] ?? "#64748b" }}>
                  {SCAN_TYPE_LABELS[r.analysis_type] ?? r.analysis_type}
                </span>
              </td>
              <td className="py-2 pr-3 font-mono font-bold" style={{ color: getRiskColor(r.risk_score) }}>
                {r.risk_score.toFixed(1)}%
              </td>
              <td className="py-2 pr-3">
                <span className={`font-bold ${r.verdict === "THREAT" ? "text-red-400" : "text-emerald-400"}`}>{r.verdict}</span>
              </td>
              <td className="py-2 text-slate-500 truncate max-w-[180px]">{r.engine}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── URL Analytics Detail ────────────────────────────────────────────────────── */
function UrlAnalyticsDetail({ ua }: { ua: NonNullable<AnalyticsData["url_analytics"]> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatCard label="Total URL Scans"  value={ua.total} />
      <StatCard label="Threats"          value={ua.threats}  color="#ef4444" />
      <StatCard label="Safe URLs"        value={ua.safe}     color="#10b981" />
      <StatCard label="Avg Risk Score"   value={`${ua.average_risk.toFixed(1)}%`} color="#f59e0b" />
      <StatCard label="Avg URL Length"   value={ua.avg_url_length.toFixed(0)} sub="characters" />
      <StatCard label="Avg Dot Count"    value={ua.avg_dot_count.toFixed(1)} />
      <StatCard label="Avg Hyphen Count" value={ua.avg_hyphen_count.toFixed(1)} />
      <StatCard label="IP-based URLs"    value={ua.ip_based_count}  color={ua.ip_based_count > 0 ? "#ef4444" : undefined} />
      <StatCard label="@ Symbol URLs"    value={ua.at_symbol_count} color={ua.at_symbol_count > 0 ? "#ef4444" : undefined} />
    </div>
  );
}

/* ─── Main Analytics Section ──────────────────────────────────────────────────── */
export function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [history, setHistory]     = useState<ScanRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [apiError, setApiError]   = useState(false);
  const [verdictFilter, setVerdictFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setApiError(false);
    try {
      const [aRes, hRes] = await Promise.all([
        fetch(`${API}/api/analytics`),
        fetch(`${API}/api/history?limit=20`),
      ]);
      if (aRes.ok) setAnalytics(await aRes.json());
      else setApiError(true);
      if (hRes.ok) {
        const hData: HistoryData = await hRes.json();
        setHistory(hData.records);
      }
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading analytics...</span>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-8 text-center space-y-3">
        <span className="text-3xl">⚠</span>
        <p className="text-red-400 font-semibold">Cannot connect to CyberShield backend.</p>
        <p className="text-sm text-red-300/60">Ensure the FastAPI server is running on port 8000, then refresh.</p>
        <button onClick={fetchData} className="text-xs text-cyan-400 hover:underline">Retry</button>
      </div>
    );
  }

  if (!analytics || analytics.total_scans === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
        <span className="text-4xl">◌</span>
        <p className="text-slate-400 font-semibold">No analysis history available yet.</p>
        <p className="text-sm text-slate-600">Run your first analysis to populate CyberShield analytics.</p>
      </div>
    );
  }

  const filteredHistory = verdictFilter ? history.filter((r) => r.verdict === verdictFilter) : history;

  return (
    <div className="space-y-6">

      {/* ── Overview ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <SectionHeader>Analysis Overview</SectionHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Analyses"   value={analytics.total_scans} />
          <StatCard label="Safe Results"     value={analytics.safe}   color="#10b981" />
          <StatCard label="Threats Detected" value={analytics.threat} color="#ef4444" />
          <StatCard label="Average Risk"
                    value={analytics.average_risk != null ? `${analytics.average_risk.toFixed(1)}%` : "—"}
                    sub="of all scans" />
          <StatCard label="High-Risk Results"
                    value={analytics.risk_distribution.high}
                    color={analytics.risk_distribution.high > 0 ? "#ef4444" : undefined}
                    sub="score ≥ 70" />
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Verdict Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <SectionHeader>Verdict Distribution</SectionHeader>
          <VerdictDonut safe={analytics.safe} threat={analytics.threat} onSelect={setVerdictFilter} />
          <div className="flex justify-center gap-4 mt-2">
            {[{ label: "SAFE", color: "#10b981" }, { label: "THREAT", color: "#ef4444" }].map(({ label, color }) => (
              <button key={label} onClick={() => setVerdictFilter(verdictFilter === label ? null : label)}
                className={`flex items-center gap-1.5 text-xs transition-opacity ${verdictFilter && verdictFilter !== label ? "opacity-40" : ""}`}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-500 font-mono">({label === "SAFE" ? analytics.safe : analytics.threat})</span>
              </button>
            ))}
          </div>
          {verdictFilter && (
            <p className="text-xs text-cyan-400 text-center mt-2 cursor-pointer hover:underline" onClick={() => setVerdictFilter(null)}>
              Showing {verdictFilter} — click to clear filter
            </p>
          )}
        </div>

        {/* Activity by Type */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <SectionHeader>Analysis Activity by Type</SectionHeader>
          <TypeBar types={analytics.analysis_types} />
        </div>
      </div>

      {/* ── Risk Distribution ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <SectionHeader>Risk Score Distribution</SectionHeader>
        <p className="text-xs text-slate-600 mb-3">Application risk bands: LOW (0–29) · MODERATE (30–69) · HIGH (70–100). Calculated from actual scan history.</p>
        <RiskDistBar low={analytics.risk_distribution.low} moderate={analytics.risk_distribution.moderate} high={analytics.risk_distribution.high} />
      </div>

      {/* ── Avg Risk by Type ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <SectionHeader>Average Risk by Analysis Type</SectionHeader>
        <p className="text-xs text-slate-600 mb-3">Only types with actual scan history are displayed.</p>
        <AvgRiskByType analytics={analytics} />
      </div>

      {/* ── Risk Trend ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <SectionHeader>Risk Trend</SectionHeader>
        <RiskTrend trend={analytics.risk_trend} />
      </div>

      {/* ── Per-type Detail ── */}
      {analytics.url_analytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <SectionHeader>URL Threat Analytics</SectionHeader>
          <UrlAnalyticsDetail ua={analytics.url_analytics} />
        </div>
      )}

      {analytics.text_analytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <SectionHeader>Text / SMS Analytics</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Text/SMS Analyses" value={analytics.text_analytics.total} />
            <StatCard label="Threats"            value={analytics.text_analytics.threats} color="#ef4444" />
            <StatCard label="Safe"               value={analytics.text_analytics.safe}    color="#10b981" />
            <StatCard label="Avg Risk"           value={`${analytics.text_analytics.average_risk.toFixed(1)}%`} color="#f59e0b" />
          </div>
        </div>
      )}

      {analytics.email_analytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <SectionHeader>Email Analytics</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Email Analyses" value={analytics.email_analytics.total} />
            <StatCard label="Threats"        value={analytics.email_analytics.threats} color="#ef4444" />
            <StatCard label="Safe"           value={analytics.email_analytics.safe}    color="#10b981" />
            <StatCard label="Avg Risk"       value={`${analytics.email_analytics.average_risk.toFixed(1)}%`} color="#f59e0b" />
          </div>
        </div>
      )}

      {analytics.qr_analytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <SectionHeader>QR Code Analytics</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="QR Scans"       value={analytics.qr_analytics.total} />
            <StatCard label="Threats"        value={analytics.qr_analytics.threats}    color="#ef4444" />
            <StatCard label="Safe"           value={analytics.qr_analytics.safe}       color="#10b981" />
            <StatCard label="Avg Risk"       value={`${analytics.qr_analytics.average_risk.toFixed(1)}%`} color="#f59e0b" />
            <StatCard label="URL-type QRs"   value={analytics.qr_analytics.url_type}  color="#8b5cf6" />
            <StatCard label="Text-type QRs"  value={analytics.qr_analytics.text_type} color="#06b6d4" />
          </div>
        </div>
      )}

      {analytics.file_analytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <SectionHeader>File Integrity Analytics</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Files Checked"       value={analytics.file_analytics.total} />
            <StatCard label="Threat Matches"      value={analytics.file_analytics.threats} color="#ef4444" />
            <StatCard label="No Signature Found"  value={analytics.file_analytics.safe}    color="#10b981" />
            <StatCard label="Signature Matches"   value={analytics.file_analytics.signature_matches} sub="Known malware signatures" color="#ef4444" />
          </div>
          <div className="mt-4 bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-300/80 leading-relaxed">
              <strong>SHA-256 Note:</strong> "No Signature Found" means no matching hash was found in the local database. It does NOT mean the file is proven safe.
            </p>
          </div>
        </div>
      )}

      {/* ── Transaction Analytics ── */}
      {analytics.transaction_analytics && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <SectionHeader>Transaction Anomaly Analytics</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Analyses"         value={analytics.transaction_analytics.total} />
            <StatCard label="Suspicious"             value={analytics.transaction_analytics.suspicious} color="#f59e0b" sub="Score 30–69" />
            <StatCard label="Safe Transactions"      value={analytics.transaction_analytics.safe}       color="#10b981" sub="Score 0–29" />
            <StatCard label="High-Risk Transactions" value={analytics.transaction_analytics.threats}    color="#ef4444" sub="Score 70–100" />
            <StatCard label="Average Risk"           value={`${analytics.transaction_analytics.average_risk.toFixed(1)}%`} color="#f59e0b" />
            <StatCard label="Avg Amount"             value={`₹${analytics.transaction_analytics.avg_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <StatCard label="Avg Velocity"           value={`${analytics.transaction_analytics.avg_recent_count.toFixed(1)} txns`} sub="recent period" />
            <StatCard label="Cross-Border"           value={analytics.transaction_analytics.international_count} color="#8b5cf6" sub="International" />
          </div>

          {/* Charts Row for Transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Risk Distribution for Transactions */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Transaction Risk Distribution</p>
              <RiskDistBar
                low={analytics.transaction_analytics.risk_distribution.low}
                moderate={analytics.transaction_analytics.risk_distribution.moderate}
                high={analytics.transaction_analytics.risk_distribution.high}
              />
            </div>

            {/* Average Risk by Transaction Type */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Average Risk by Transaction Type</p>
              {analytics.transaction_analytics.by_type.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={analytics.transaction_analytics.by_type.map(b => ({
                    name: b.type.replace(/_/g, ' '),
                    value: b.avg_risk,
                    count: b.count,
                    fill: b.avg_risk >= 70 ? "#ef4444" : b.avg_risk >= 30 ? "#f59e0b" : "#10b981"
                  }))} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                             formatter={(v: any) => [`${v}%`, "Avg Risk"]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {analytics.transaction_analytics.by_type.map((d, i) => (
                        <Cell key={i} fill={d.avg_risk >= 70 ? "#ef4444" : d.avg_risk >= 30 ? "#f59e0b" : "#10b981"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No transaction types analyzed yet." />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent History ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader>Recent Analysis Activity</SectionHeader>
          {verdictFilter && (
            <span className="text-xs text-cyan-400">
              Filtered: {verdictFilter}
              <button onClick={() => setVerdictFilter(null)} className="ml-2 text-slate-500 hover:text-slate-300">✕</button>
            </span>
          )}
        </div>
        <HistoryTable records={filteredHistory} />
      </div>

    </div>
  );
}

export type { AnalyticsData };
