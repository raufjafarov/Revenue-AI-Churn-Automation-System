import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Send, Mail, MessageCircle, AlertTriangle, Clock, Gift, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listCustomers, analyzeCustomer, sendMessage } from "@/lib/api";
import type { Customer, AnalyzeResponse, Channel } from "@/types/churn";
import { RiskBadge } from "@/components/RiskBadge";
import { getRiskLevel } from "@/types/churn";

const STAGES = [
  "Müştəri datası yüklənir…",
  "AI risk analizi aparılır…",
  "Retention strategiyası hazırlanır…",
  "Mesaj generasiya olunur…",
];

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = `Müştəri • ${id} • ChurnGuard`;
    listCustomers()
      .then((r) => {
        const c = r.customers.find((x) => String(x.customer_id) === String(id));
        setCustomer(c ?? null);
      })
      .finally(() => setLoadingCustomer(false));
  }, [id]);

  // Animated progress while analyzing
  useEffect(() => {
    if (!analyzing) return;
    setStage(0);
    setProgress(5);
    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 6000);
    const progressTimer = setInterval(() => {
      setProgress((p) => (p < 92 ? p + Math.random() * 4 : p));
    }, 600);
    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  }, [analyzing]);

  const handleAnalyze = async () => {
    if (!customer) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await analyzeCustomer(customer.customer_id, customer);
      setResult(res);
      setMessage(res.strategy.message_az || "");
      setProgress(100);
      toast.success("Analiz tamamlandı");
    } catch (e: any) {
      toast.error("Analiz xətası", { description: e.message ?? String(e) });
    } finally {
      setTimeout(() => setAnalyzing(false), 400);
    }
  };

  const handleSend = async () => {
    if (!customer || !result) return;
    setSending(true);
    try {
      await sendMessage({
        customer_id: customer.customer_id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        channel,
        message_az: message,
        strategy_summary: result.strategy.strategy_summary,
        offer_value: result.strategy.offer_value,
      });
      toast.success("Mesaj göndərildi ✓", {
        description: `${customer.name} • ${channel.toUpperCase()}`,
      });
    } catch (e: any) {
      toast.error("Göndərmə xətası", { description: e.message ?? String(e) });
    } finally {
      setSending(false);
    }
  };

  const risk = useMemo(() => getRiskLevel(result?.ai.risk_score), [result]);

  if (loadingCustomer) {
    return <div className="text-muted-foreground">Yüklənir…</div>;
  }
  if (!customer) {
    return (
      <div className="space-y-3">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard-a qayıt
        </Link>
        <p>Müştəri tapılmadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: profile */}
        <Card className="shadow-elegant-sm h-fit">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                {customer.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl truncate">{customer.name}</CardTitle>
                <p className="text-sm text-muted-foreground truncate">{customer.company}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Email" value={customer.email} />
            <Row label="Telefon" value={customer.phone} />
            <Row label="Seqment" value={customer.segment} />
            <Row label="Aylıq gəlir" value={`$${Number(customer.monthly_revenue || 0).toLocaleString()}`} />
            <Row label="Cəmi xərclənib" value={`$${Number(customer.total_spent || 0).toLocaleString()}`} />
            <Row label="Son alış" value={customer.last_purchase_date} />
            <Row label="Şikayət sayı" value={String(customer.complaints ?? 0)} />
            {customer.complaint_texts && (
              <div>
                <div className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Şikayətlər</div>
                <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {customer.complaint_texts}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: analysis */}
        <div className="space-y-6">
          <Card className="shadow-elegant-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">AI Risk Analizi</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  n8n agent vasitəsilə risk skoru və retention strategiyası
                </p>
              </div>
              <Button onClick={handleAnalyze} disabled={analyzing} className="bg-gradient-primary shadow-elegant-md">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analyzing ? "Analiz olunur…" : result ? "Yenidən analiz et" : "AI Analiz et"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {analyzing && (
                <div className="space-y-3 rounded-lg border bg-accent/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {STAGES[stage]}
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Bu adətən 10–30 saniyə çəkir. AI agent OpenAI ilə müştəri profilini emal edir.
                  </p>
                </div>
              )}

              {!analyzing && !result && (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Hələ analiz aparılmayıb. "AI Analiz et" düyməsinə basın.
                </div>
              )}

              {result && (
                <>
                  <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                    <RiskGauge score={result.ai.risk_score} />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <RiskBadge score={result.ai.risk_score} />
                        <Badge variant="outline" className="capitalize">
                          <AlertTriangle className="h-3 w-3" />
                          Aktuallıq: {result.ai.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{result.ai.analysis}</p>
                      {result.ai.reasons?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {result.ai.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center text-xs rounded-full bg-secondary px-2.5 py-1"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {result && (
            <Card className="shadow-elegant-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  Retention strategiyası
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoTile label="Təklif növü" value={result.strategy.offer_type || "—"} />
                  <InfoTile label="Təklif dəyəri" value={result.strategy.offer_value || "—"} highlight />
                  <InfoTile
                    label="Follow-up"
                    value={result.strategy.follow_up_days ? `${result.strategy.follow_up_days} gün` : "—"}
                    icon={<Clock className="h-3.5 w-3.5" />}
                  />
                </div>
                <div className="rounded-md bg-muted/40 border p-3 text-sm">
                  {result.strategy.strategy_summary}
                </div>
                {result.strategy.escalation_needed && (
                  <div className="rounded-md border border-risk-critical/30 bg-risk-critical/5 text-risk-critical p-3 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Eskalasiya tələb olunur — manager-ə ötür
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mesaj (redaktə oluna bilər)</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between border-t pt-4">
                  <div className="flex gap-2">
                    <ChannelChip active={channel === "whatsapp"} onClick={() => setChannel("whatsapp")} icon={<MessageCircle className="h-3.5 w-3.5" />} label="WhatsApp" />
                    <ChannelChip active={channel === "email"} onClick={() => setChannel("email")} icon={<Mail className="h-3.5 w-3.5" />} label="Email" />
                    <ChannelChip active={channel === "both"} onClick={() => setChannel("both")} label="Hər ikisi" />
                  </div>
                  <Button onClick={handleSend} disabled={sending || !message.trim()} className="bg-gradient-primary">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Göndərilir…" : "Mesajı göndər"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

function InfoTile({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "bg-primary/5 border-primary/30" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-semibold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function ChannelChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function RiskGauge({ score }: { score: number }) {
  const r = getRiskLevel(score);
  const pct = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (pct / 100) * circumference;
  const colorVar =
    score >= 80 ? "var(--risk-critical)" : score >= 60 ? "var(--risk-high)" : score >= 40 ? "var(--risk-medium)" : "var(--risk-low)";
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
          <circle
            cx="60"
            cy="60"
            r="52"
            stroke={`hsl(${colorVar})`}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{Math.round(score)}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className={`mt-1 text-sm font-semibold capitalize ${r.color}`}>{r.level} risk</div>
    </div>
  );
}
