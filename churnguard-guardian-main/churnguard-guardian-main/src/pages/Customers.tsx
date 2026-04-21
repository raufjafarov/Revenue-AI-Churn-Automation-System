import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listCustomers } from "@/lib/api";
import type { Customer } from "@/types/churn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { Search, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type SortKey = "monthly_revenue" | "complaints" | "name";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("monthly_revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    document.title = "Müştərilər • ChurnGuard";
    listCustomers()
      .then((r) => setCustomers(r.customers ?? []))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  const segments = useMemo(
    () => Array.from(new Set(customers.map((c) => c.segment).filter(Boolean))),
    [customers],
  );

  const filtered = useMemo(() => {
    let list = customers.filter((c) => {
      const matchSearch =
        !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase());
      const matchSeg = segment === "all" || c.segment === segment;
      return matchSearch && matchSeg;
    });
    list = [...list].sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0;
      const bv = (b as any)[sortKey] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [customers, search, segment, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Müştərilər</h1>
        <p className="text-muted-foreground mt-1">Müştəri portfeli, axtarış və risk göstəriciləri</p>
      </header>

      <Card className="shadow-elegant-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">
            Cəmi: <span className="text-muted-foreground font-normal">{customers.length}</span>
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ad və ya şirkət axtar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 sm:w-64"
              />
            </div>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Seqment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün seqmentlər</SelectItem>
                {segments.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-3 text-sm mb-3">
              {error}
            </div>
          )}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>
                    <SortBtn label="Müştəri" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                  </TableHead>
                  <TableHead>Şirkət</TableHead>
                  <TableHead>Seqment</TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Aylıq gəlir" active={sortKey === "monthly_revenue"} dir={sortDir} onClick={() => toggleSort("monthly_revenue")} />
                  </TableHead>
                  <TableHead className="text-center">
                    <SortBtn label="Şikayət" active={sortKey === "complaints"} dir={sortDir} onClick={() => toggleSort("complaints")} />
                  </TableHead>
                  <TableHead>Son alış</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Müştəri tapılmadı
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((c) => (
                    <TableRow key={c.customer_id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link to={`/customer/${c.customer_id}`} className="hover:text-primary">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.company}</TableCell>
                      <TableCell>
                        <span className="text-xs rounded-md bg-secondary px-2 py-0.5">{c.segment}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${Number(c.monthly_revenue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            (Number(c.complaints) || 0) >= 3
                              ? "text-risk-critical font-semibold"
                              : (Number(c.complaints) || 0) >= 1
                                ? "text-risk-medium"
                                : "text-muted-foreground"
                          }
                        >
                          {c.complaints ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.last_purchase_date}</TableCell>
                      <TableCell>
                        <RiskBadge />
                      </TableCell>
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

function SortBtn({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="-ml-2 h-7 px-2 text-xs font-medium">
      {label}
      <ArrowUpDown className={`ml-1 h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
      {active && <span className="sr-only">{dir}</span>}
    </Button>
  );
}
