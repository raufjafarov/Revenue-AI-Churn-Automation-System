import { useEffect, useState } from "react";
import { listCustomers } from "@/lib/api";
import type { Customer } from "@/types/churn";
import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, Activity, TrendingUp } from "lucide-react";
import { WebhookTesters } from "@/components/WebhookTesters";

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    document.title = "Dashboard • ChurnGuard";
    listCustomers()
      .then((r) => {
        setCustomers(r.customers ?? []);
        setSource(r.source ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = customers.reduce((s, c) => s + (Number(c.monthly_revenue) || 0), 0);
  const highRisk = customers.filter((c) => (Number(c.complaints) || 0) >= 3).length;
  const avgComplaints = customers.length
    ? (customers.reduce((s, c) => s + (Number(c.complaints) || 0), 0) / customers.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Müştəri portfelinin risk mənzərəsi və metrikalar
          {source === "mock" && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
              demo data
            </span>
          )}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Ümumi müştəri" value={loading ? "—" : String(customers.length)} />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-risk-critical" />}
          label="Yüksək riskli"
          value={loading ? "—" : String(highRisk)}
          hint="≥3 şikayət"
        />
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="Orta şikayət"
          value={loading ? "—" : avgComplaints}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-risk-low" />}
          label="Aylıq gəlir (cəmi)"
          value={loading ? "—" : `$${totalRevenue.toLocaleString()}`}
        />
      </section>

      <WebhookTesters />
    </div>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="shadow-elegant-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm">{label}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
