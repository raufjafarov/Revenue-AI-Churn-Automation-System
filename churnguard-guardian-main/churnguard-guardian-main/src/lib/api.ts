import { supabase } from "@/integrations/supabase/client";
import type { Customer, AnalyzeResponse, Channel } from "@/types/churn";

export async function listCustomers(): Promise<{
  customers: Customer[];
  source: string;
  error?: string;
  detail?: string;
  fallback?: boolean;
}> {
  const { data, error } = await supabase.functions.invoke("list-customers", { body: {} });
  if (error) throw error;
  return data as {
    customers: Customer[];
    source: string;
    error?: string;
    detail?: string;
    fallback?: boolean;
  };
}

export async function analyzeCustomer(customer_id: string, customer?: Partial<Customer>): Promise<AnalyzeResponse> {
  const { data, error } = await supabase.functions.invoke("analyze-customer", {
    body: { customer_id, ...customer },
  });
  if (error) throw error;
  return normalizeAnalyze(data);
}

export async function sendMessage(payload: {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  channel: Channel;
  message_az: string;
  strategy_summary?: string;
  offer_value?: string;
}) {
  const { data, error } = await supabase.functions.invoke("send-message", { body: payload });
  if (error) throw error;
  return data;
}

function normalizeAnalyze(raw: any): AnalyzeResponse {
  // n8n bəzən array, bəzən {output: ...} qaytarır
  let root: any = raw;
  if (Array.isArray(root)) root = root[0] ?? {};
  root = root?.output ?? root?.data ?? root ?? {};
  if (Array.isArray(root)) root = root[0] ?? {};

  const ai = root.ai ?? root.analysis_obj ?? {
    risk_score: root.risk_score,
    analysis: root.analysis,
    reasons: root.reasons,
    urgency: root.urgency,
  };
  const strategy = root.strategy ?? {
    strategy_summary: root.strategy_summary,
    message_az: root.message_az ?? root.message,
    offer_type: root.offer_type,
    offer_value: root.offer_value,
    follow_up_days: root.follow_up_days,
    escalation_needed: root.escalation_needed,
  };
  const customer = root.customer ?? {
    customer_id: root.customer_id,
    name: root.customer_name ?? root.name,
    company: root.customer_company ?? root.company,
    email: root.customer_email ?? root.email,
    phone: root.customer_phone != null ? String(root.customer_phone) : root.phone,
    segment: root.segment,
    monthly_revenue: root.monthly_revenue,
    last_purchase_date: root.last_purchase_date,
    complaints: root.complaints,
    complaint_texts: root.complaint_texts,
    total_spent: root.total_spent,
  };

  // Risk score yoxdursa şikayətlərdən təxmini hesabla
  let riskScore = Number(ai.risk_score ?? 0);
  if (!riskScore) {
    const c = Number(customer.complaints ?? 0);
    const escalation = strategy.escalation_needed ? 20 : 0;
    riskScore = Math.min(100, c * 15 + escalation + (c > 0 ? 25 : 0));
  }

  // Reasons yoxdursa şikayət mətnindən çıxar
  let reasons: string[] = Array.isArray(ai.reasons)
    ? ai.reasons
    : ai.reasons
    ? [String(ai.reasons)]
    : [];
  if (reasons.length === 0 && customer.complaint_texts) {
    reasons = String(customer.complaint_texts)
      .split(/\d+\)\s*|\.\s+/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  // Analysis yoxdursa strategy_summary-dən
  const analysis = String(ai.analysis ?? strategy.strategy_summary ?? "");

  // Urgency-ni risk score-dan təxmin et
  let urgency = ai.urgency;
  if (!urgency) {
    if (riskScore >= 80) urgency = "kritik";
    else if (riskScore >= 60) urgency = "yüksək";
    else if (riskScore >= 40) urgency = "orta";
    else urgency = "aşağı";
  }

  return {
    customer,
    ai: {
      risk_score: riskScore,
      analysis,
      reasons,
      urgency,
    },
    strategy: {
      strategy_summary: String(strategy.strategy_summary ?? ""),
      message_az: String(strategy.message_az ?? ""),
      offer_type: String(strategy.offer_type ?? ""),
      offer_value: String(strategy.offer_value ?? ""),
      follow_up_days: Number(strategy.follow_up_days ?? 0),
      escalation_needed: Boolean(strategy.escalation_needed),
    },
  };
}
