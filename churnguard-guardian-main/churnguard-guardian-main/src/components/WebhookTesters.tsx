import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Sparkles,
  Send,
  MessageCircle,
  Mail,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Status = "idle" | "loading" | "ok" | "error";
type Channel = "whatsapp" | "email" | "both";

interface TestState {
  status: Status;
  response?: unknown;
  error?: string;
  ms?: number;
}

export function WebhookTesters() {
  const [getCustomers, setGetCustomers] = useState<TestState>({ status: "idle" });
  const [analyze, setAnalyze] = useState<TestState>({ status: "idle" });
  const [sendMsg, setSendMsg] = useState<TestState>({ status: "idle" });
  const [channel, setChannel] = useState<Channel>("whatsapp");

  const run = async (
    setter: (s: TestState) => void,
    fn: () => Promise<{ data: unknown; error: { message: string } | null }>,
  ) => {
    setter({ status: "loading" });
    const t0 = performance.now();
    try {
      const { data, error } = await fn();
      const ms = Math.round(performance.now() - t0);
      if (error) {
        setter({ status: "error", error: error.message, ms });
        return null;
      }
      const errField = (data as any)?.error;
      if (errField) {
        setter({ status: "error", error: String(errField), response: data, ms });
        return null;
      }
      setter({ status: "ok", response: data, ms });
      return data;
    } catch (e: any) {
      setter({ status: "error", error: e?.message ?? String(e), ms: Math.round(performance.now() - t0) });
      return null;
    }
  };

  const testGetCustomers = () =>
    run(setGetCustomers, () => supabase.functions.invoke("list-customers", { body: {} }));

  const testAnalyze = async () => {
    // İlk olaraq real müştərini çək
    setAnalyze({ status: "loading" });
    const list: any = await supabase.functions.invoke("list-customers", { body: {} });
    const customers = list?.data?.customers ?? [];
    const c = customers[0];
    if (!c) {
      setAnalyze({ status: "error", error: "Müştəri tapılmadı (list-customers boşdur)" });
      return;
    }
    await run(setAnalyze, () =>
      supabase.functions.invoke("analyze-customer", { body: { customer_id: c.customer_id, ...c } }),
    );
  };

  const testSendMessage = async () => {
    setSendMsg({ status: "loading" });
    // 1) Real müştəri
    const list: any = await supabase.functions.invoke("list-customers", { body: {} });
    const customers = list?.data?.customers ?? [];
    const c = customers[0];
    if (!c) {
      setSendMsg({ status: "error", error: "Müştəri tapılmadı" });
      return;
    }
    // 2) Analyze et
    const analyzeRes: any = await supabase.functions.invoke("analyze-customer", {
      body: { customer_id: c.customer_id, ...c },
    });
    if (analyzeRes?.error) {
      setSendMsg({ status: "error", error: `Analyze xətası: ${analyzeRes.error.message ?? "?"}` });
      return;
    }
    // n8n cavabı array və ya {output:...} ola bilər
    let root: any = analyzeRes?.data;
    if (Array.isArray(root)) root = root[0] ?? {};
    root = root?.output ?? root?.data ?? root ?? {};
    if (Array.isArray(root)) root = root[0] ?? {};
    const strategy = root.strategy ?? root;

    // 3) Real datayla sendmessage çağır
    await run(setSendMsg, () =>
      supabase.functions.invoke("send-message", {
        body: {
          customer_id: c.customer_id,
          customer_name: c.name,
          customer_email: c.email,
          customer_phone: String(c.phone ?? ""),
          channel,
          message_az: strategy.message_az ?? "",
          strategy_summary: strategy.strategy_summary ?? "",
          offer_value: strategy.offer_value ?? "",
        },
      }),
    );
  };

  return (
    <Card className="shadow-elegant-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Webhook test paneli
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          n8n webhook-larını real müştəri datası ilə test et. Test rejimində n8n-də əvvəlcə &quot;Execute workflow&quot;.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        <TesterCard
          icon={<Database className="h-4 w-4" />}
          label="getcustomers"
          description="Müştəri datasını çək"
          state={getCustomers}
          onClick={testGetCustomers}
          renderResponse={(r) => <CustomersTable data={r} />}
        />
        <TesterCard
          icon={<Sparkles className="h-4 w-4" />}
          label="analyze"
          description="İlk real müştərini analiz et"
          state={analyze}
          onClick={testAnalyze}
          renderResponse={(r) => <AnalyzeTable data={r} />}
        />
        <TesterCard
          icon={<Send className="h-4 w-4" />}
          label="sendmessage"
          description="Müştəri çək → analyze → mesaj göndər"
          state={sendMsg}
          extraControls={
            <div className="flex flex-wrap gap-1.5">
              <ChannelPill active={channel === "whatsapp"} onClick={() => setChannel("whatsapp")} icon={<MessageCircle className="h-3 w-3" />} label="WhatsApp" />
              <ChannelPill active={channel === "email"} onClick={() => setChannel("email")} icon={<Mail className="h-3 w-3" />} label="Email" />
              <ChannelPill active={channel === "both"} onClick={() => setChannel("both")} label="Hər ikisi" />
            </div>
          }
          onClick={testSendMessage}
          renderResponse={(r) => <SendTable data={r} channel={channel} />}
        />
      </CardContent>
    </Card>
  );
}

function TesterCard({
  icon,
  label,
  description,
  state,
  onClick,
  renderResponse,
  extraControls,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  state: TestState;
  onClick: () => void;
  renderResponse?: (data: unknown) => React.ReactNode;
  extraControls?: React.ReactNode;
}) {
  const isLoading = state.status === "loading";
  const hasResponse = state.response !== undefined;
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-sm min-w-0">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <code className="px-1.5 py-0.5 rounded bg-muted text-[11px] truncate">{label}</code>
        </div>
        <StatusPill state={state} />
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      {extraControls}
      <Button onClick={onClick} disabled={isLoading} size="sm" variant="outline" className="w-full h-8">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
        {isLoading ? "Test olunur…" : "Test et"}
      </Button>
      {state.status === "error" && state.error && (
        <p className="text-xs text-risk-critical break-all line-clamp-2">{state.error}</p>
      )}
      {state.status === "ok" && (
        <p className="text-[11px] text-risk-low">
          Uğurlu cavab {state.ms !== undefined ? `· ${state.ms}ms` : ""}
        </p>
      )}
      {hasResponse && renderResponse && (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-1">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-7 justify-between text-xs px-2 hover:bg-accent"
            >
              <span>{open ? "Nəticəni gizlət" : "Nəticəni göstər"}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 max-h-72 overflow-y-auto pr-1 -mr-1">
            {renderResponse(state.response)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function ChannelPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusPill({ state }: { state: TestState }) {
  if (state.status === "ok")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-risk-low">
        <CheckCircle2 className="h-3 w-3" /> OK
      </span>
    );
  if (state.status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-risk-critical">
        <XCircle className="h-3 w-3" /> Xəta
      </span>
    );
  if (state.status === "loading")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> …
      </span>
    );
  return <span className="text-xs text-muted-foreground">hazır</span>;
}

/* ---------- Response tables ---------- */

function MiniTable({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <div className="rounded-md border overflow-hidden bg-background">
      <table className="w-full text-[11px]">
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="bg-muted/30 px-2 py-1 font-medium text-muted-foreground w-[38%] align-top whitespace-nowrap">
                {k}
              </td>
              <td className="px-2 py-1 break-words text-foreground">{v ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomersTable({ data }: { data: unknown }) {
  const d = data as any;
  const customers = Array.isArray(d?.customers) ? d.customers : Array.isArray(d) ? d : [];
  return (
    <MiniTable
      rows={[
        ["Mənbə", d?.source ?? "—"],
        ["Müştəri sayı", customers.length],
        ["Fallback", d?.fallback ? "Bəli" : "Xeyr"],
        [
          "İlk müştəri",
          customers[0]
            ? `${customers[0].name ?? customers[0].customer_name ?? "—"} (${customers[0].customer_id ?? "—"})`
            : "—",
        ],
      ]}
    />
  );
}

function AnalyzeTable({ data }: { data: unknown }) {
  let root: any = data;
  if (Array.isArray(root)) root = root[0] ?? {};
  root = root?.output ?? root?.data ?? root ?? {};
  if (Array.isArray(root)) root = root[0] ?? {};

  const ai = root.ai ?? {};
  const strategy = root.strategy ?? root;
  const customer = root.customer ?? root;

  return (
    <MiniTable
      rows={[
        ["Müştəri", customer.customer_name ?? customer.name ?? customer.customer_id ?? "—"],
        ["Risk skoru", ai.risk_score ?? root.risk_score ?? "—"],
        ["Aktuallıq", ai.urgency ?? root.urgency ?? "—"],
        ["Strategiya", strategy.strategy_summary ?? "—"],
        [
          "Təklif",
          strategy.offer_type
            ? `${strategy.offer_type} • ${strategy.offer_value ?? ""}`
            : strategy.offer_value ?? "—",
        ],
        [
          "Follow-up",
          strategy.follow_up_days != null ? `${strategy.follow_up_days} gün` : "—",
        ],
        [
          "Mesaj",
          <span className="line-clamp-3 block">{strategy.message_az ?? "—"}</span>,
        ],
      ]}
    />
  );
}

function SendTable({ data, channel }: { data: unknown; channel: Channel }) {
  let root: any = data;
  if (Array.isArray(root)) root = root[0] ?? {};
  return (
    <MiniTable
      rows={[
        ["Kanal", channel],
        ["Status", root?.status ?? root?.success ?? "OK"],
        ["Müştəri", root?.customer_name ?? root?.customer_id ?? "—"],
        ["Mesaj ID", root?.message_id ?? root?.id ?? "—"],
        ["n8n cavabı", root?.message ?? root?.result ?? "—"],
      ]}
    />
  );
}
