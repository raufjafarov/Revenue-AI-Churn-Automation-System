import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Campaign } from "@/types/churn";
import { Send, Mail, MessageCircle, CheckCircle2, XCircle } from "lucide-react";

export default function Campaigns() {
  const [items] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState("all");

  useEffect(() => {
    document.title = "Kampaniyalar • ChurnGuard";
  }, []);

  const filtered = useMemo(
    () => (channel === "all" ? items : items.filter((i) => i.channel === channel)),
    [items, channel],
  );

  const total = items.length;
  const wa = items.filter((i) => i.channel === "whatsapp").length;
  const em = items.filter((i) => i.channel === "email").length;
  const ok = items.filter((i) => /sent|ok|success/i.test(i.status || "")).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Kampaniyalar</h1>
        <p className="text-muted-foreground mt-1">Göndərilmiş retention mesajları və status</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Send className="h-4 w-4" />} label="Cəmi" value={String(total)} />
        <StatCard icon={<MessageCircle className="h-4 w-4 text-risk-low" />} label="WhatsApp" value={String(wa)} />
        <StatCard icon={<Mail className="h-4 w-4 text-primary" />} label="Email" value={String(em)} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-risk-low" />} label="Uğurla göndərilib" value={String(ok)} />
      </section>

      <Card className="shadow-elegant-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Göndərmə tarixçəsi</CardTitle>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Kanal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün kanallar</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="both">Hər ikisi</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Müştəri</TableHead>
                  <TableHead>Kanal</TableHead>
                  <TableHead>Təklif</TableHead>
                  <TableHead>Strategiya</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tarix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Yüklənir…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Kampaniya endpoint-i hələ qoşulmayıb.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell className="capitalize">{c.channel}</TableCell>
                      <TableCell>{c.offer_value}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-md truncate">{c.strategy_summary}</TableCell>
                      <TableCell>
                        {/sent|ok|success/i.test(c.status || "") ? (
                          <span className="inline-flex items-center gap-1 text-risk-low text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {c.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-risk-critical text-sm">
                            <XCircle className="h-3.5 w-3.5" /> {c.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.sent_at}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="shadow-elegant-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm">{label}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
