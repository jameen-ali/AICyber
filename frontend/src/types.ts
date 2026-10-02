export type ScanType = "url" | "sms" | "email" | "transaction" | "file" | "qr";
export type Verdict = "SAFE" | "THREAT" | "SUSPICIOUS" | "HIGH RISK";

export interface TextEvidence {
  safe_probability: number;
  threat_probability: number;
}

export interface UrlFeatures {
  url_length: number;
  dot_count: number;
  hyphen_count: number;
  is_ip: 0 | 1;
  has_at_symbol: 0 | 1;
}

export interface UrlAnalysisDetail {
  url: string;
  risk_score: number;
  verdict: Verdict;
  features?: UrlFeatures;
}

export interface EmailEvidence {
  safe_probability: number;
  threat_probability: number;
  detected_urls: string[];
  url_analyses: UrlAnalysisDetail[];
}

export interface QrEvidence {
  safe_probability?: number;
  threat_probability?: number;
  url_features?: UrlFeatures;
}

export interface TransactionFeatures {
  amount: number;
  previous_amount: number;
  amount_difference: number;
  amount_ratio?: number;
  transaction_hour: number;
  account_age_days: number;
  recent_transaction_count: number;
  international: boolean;
  channel: string;
  transaction_type: string;
  location: string;
}

export interface TransactionEvidence {
  amount: number;
  previous_amount: number;
  amount_difference: number;
  amount_ratio: number;
  transaction_hour: number;
  account_age_days: number;
  recent_transaction_count: number;
  international: boolean;
  channel: string;
  transaction_type: string;
  location: string;
  anomaly_score: number;
  contributing_factors?: string[];
}

export interface TransactionFormData {
  amount: string;
  transaction_type: string;
  location: string;
  transaction_time: string;
  account_age_days: string;
  previous_amount: string;
  recent_transaction_count: string;
  channel: string;
  international: boolean;
}

export interface AnalysisResult {
  // Common
  verdict: Verdict;
  risk_score: number;
  engine: string;
  anomaly_score?: number;
  contributing_factors?: string[];
  // Evidence
  evidence?: TextEvidence | EmailEvidence | QrEvidence | TransactionEvidence | Record<string, unknown>;
  // URL or Transaction features
  url?: string;
  features?: UrlFeatures | TransactionFeatures;
  // File-specific
  filename?: string;
  file_size?: number;
  hash?: string;
  signature_match?: boolean;
  // Email-specific
  sender?: string;
  subject?: string;
  // QR-specific
  decoded_content?: string;
  content_type?: "url" | "text";
  underlying_engine?: string;
}

export interface ScanRecord {
  id: string;
  timestamp: string;
  analysis_type: string;
  verdict: Verdict;
  risk_score: number;
  engine: string;
  input_reference: string;
  evidence: Record<string, unknown>;
}

export interface AnalyticsData {
  total_scans: number;
  safe: number;
  threat: number;
  average_risk: number | null;
  analysis_types: {
    text: number;
    sms: number;
    url: number;
    file: number;
    email: number;
    qr: number;
    transaction: number;
  };
  risk_distribution: { low: number; moderate: number; high: number };
  risk_trend: Array<{
    timestamp: string;
    risk_score: number;
    analysis_type: string;
    verdict: string;
  }>;
  url_analytics: {
    total: number;
    threats: number;
    safe: number;
    average_risk: number;
    avg_url_length: number;
    avg_dot_count: number;
    avg_hyphen_count: number;
    ip_based_count: number;
    at_symbol_count: number;
  } | null;
  text_analytics: {
    total: number;
    threats: number;
    safe: number;
    average_risk: number;
  } | null;
  file_analytics: {
    total: number;
    threats: number;
    safe: number;
    signature_matches: number;
  } | null;
  email_analytics: {
    total: number;
    threats: number;
    safe: number;
    average_risk: number;
  } | null;
  qr_analytics: {
    total: number;
    threats: number;
    safe: number;
    average_risk: number;
    url_type: number;
    text_type: number;
  } | null;
  transaction_analytics: {
    total: number;
    threats: number;
    suspicious: number;
    safe: number;
    average_risk: number;
    avg_amount: number;
    avg_recent_count: number;
    international_count: number;
    risk_distribution: { low: number; moderate: number; high: number };
    by_type: Array<{ type: string; count: number; avg_risk: number }>;
  } | null;
}

export interface HistoryData {
  records: ScanRecord[];
}
