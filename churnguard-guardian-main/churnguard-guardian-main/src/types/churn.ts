export type Customer = {
  customer_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  segment: string;
  monthly_revenue: number;
  last_purchase_date: string;
  complaints: number;
  complaint_texts: string;
  total_spent: number;
};

export type Urgency = "kritik" | "yüksək" | "orta" | "aşağı";

export type AIAnalysis = {
  risk_score: number;
  analysis: string;
  reasons: string[];
  urgency: Urgency | string;
};

export type Strategy = {
  strategy_summary: string;
  message_az: string;
  offer_type: string;
  offer_value: string;
  follow_up_days: number;
  escalation_needed: boolean;
};

export type AnalyzeResponse = {
  customer: Customer;
  ai: AIAnalysis;
  strategy: Strategy;
};

export type Campaign = {
  customer_id: string;
  customer_name: string;
  channel: string;
  offer_value: string;
  strategy_summary: string;
  status: string;
  sent_at: string;
};

export type Channel = "whatsapp" | "email" | "both";

export function getRiskLevel(score?: number): {
  level: "kritik" | "yüksək" | "orta" | "aşağı" | "naməlum";
  color: string;
  bg: string;
} {
  if (score === undefined || score === null) {
    return { level: "naməlum", color: "text-risk-unknown", bg: "bg-risk-unknown/10 text-risk-unknown border-risk-unknown/20" };
  }
  if (score >= 80) return { level: "kritik", color: "text-risk-critical", bg: "bg-risk-critical/10 text-risk-critical border-risk-critical/30" };
  if (score >= 60) return { level: "yüksək", color: "text-risk-high", bg: "bg-risk-high/10 text-risk-high border-risk-high/30" };
  if (score >= 40) return { level: "orta", color: "text-risk-medium", bg: "bg-risk-medium/10 text-risk-medium border-risk-medium/30" };
  return { level: "aşağı", color: "text-risk-low", bg: "bg-risk-low/10 text-risk-low border-risk-low/30" };
}
