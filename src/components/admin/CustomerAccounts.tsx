import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getCustomerAccount, searchCustomers } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const money = (n: number) => `$${Number(n ?? 0).toFixed(2)}`;

export function CustomerAccounts() {
  const searchFn = useServerFn(searchCustomers);
  const accountFn = useServerFn(getCustomerAccount);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customer-search", search],
    queryFn: () => searchFn({ data: { search } }),
  });

  const account = useQuery({
    queryKey: ["customer-account", selected],
    queryFn: () => accountFn({ data: { botUserId: selected! } }),
    enabled: Boolean(selected),
  });

  const a = account.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        <Input
          placeholder="Search by name, @username or Telegram ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="space-y-2">
          {(customers.data ?? []).map((c: any) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition ${selected === c.id ? "border-primary" : ""}`}
              onClick={() => setSelected(c.id)}
            >
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {c.username ? `@${c.username}` : (c.first_name ?? "Customer")}
                  </p>
                  <p className="text-xs text-muted-foreground">ID {c.telegram_id}</p>
                </div>
                <Badge variant="secondary">{money(c.balance)}</Badge>
              </CardContent>
            </Card>
          ))}
          {!customers.isLoading && !(customers.data ?? []).length ? (
            <p className="text-sm text-muted-foreground">No customers match that search.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {!selected ? (
          <p className="text-sm text-muted-foreground">Pick a customer on the left to open their account.</p>
        ) : null}

        {a?.user ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Balance", value: money(a.user.balance) },
                { label: "Referral earnings", value: money(a.user.referral_earned) },
                { label: "People invited", value: String(a.referrals.length) },
              ].map((s) => (
                <Card key={s.label}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">{s.value}</CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Purchase history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.orders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.kind === "buy" ? "Purchase" : "IP reveal"} · {new Date(o.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge>{money(o.price)}</Badge>
                  </div>
                ))}
                {!a.orders.length ? <p className="text-sm text-muted-foreground">No purchases yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top-ups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.topups.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {money(t.amount_usd)} · {t.network}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                        {t.tx_hash ? ` · TX ${t.tx_hash}` : ""}
                      </p>
                    </div>
                    <Badge variant={t.status === "finished" ? "default" : "secondary"}>{t.status}</Badge>
                  </div>
                ))}
                {!a.topups.length ? <p className="text-sm text-muted-foreground">No top-ups yet.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Referrals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.referrals.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                    <p className="text-sm">{r.username ? `@${r.username}` : `ID ${r.telegram_id}`}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                {!a.referrals.length ? (
                  <p className="text-sm text-muted-foreground">This customer hasn't invited anyone yet.</p>
                ) : null}
              </CardContent>
            </Card>

            <Button variant="outline" onClick={() => account.refetch()}>
              Refresh
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
