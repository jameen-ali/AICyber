import type { Verdict } from "./types";

export function getRiskBand(score: number): "LOW" | "MODERATE" | "HIGH" {
  if (score < 30) return "LOW";
  if (score < 70) return "MODERATE";
  return "HIGH";
}

export function getRiskColor(score: number): string {
  if (score < 30) return "#10b981";
  if (score < 70) return "#f59e0b";
  return "#ef4444";
}

export function getVerdictColor(verdict: Verdict): string {
  if (verdict === "THREAT" || verdict === "HIGH RISK") return "#ef4444";
  if (verdict === "SUSPICIOUS") return "#f59e0b";
  return "#10b981";
}

export function getRiskBandColor(band: "LOW" | "MODERATE" | "HIGH"): string {
  switch (band) {
    case "LOW":      return "#10b981";
    case "MODERATE": return "#f59e0b";
    case "HIGH":     return "#ef4444";
  }
}

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const SCAN_TYPE_LABELS: Record<string, string> = {
  text:        "Text",
  sms:         "SMS",
  url:         "URL",
  file:        "File",
  email:       "Email",
  qr:          "QR",
  transaction: "Transaction",
};

export const SCAN_TYPE_COLORS: Record<string, string> = {
  url:         "#8b5cf6",
  sms:         "#06b6d4",
  email:       "#3b82f6",
  transaction: "#f59e0b",
  file:        "#f97316",
  qr:          "#10b981",
  text:        "#06b6d4",
};
