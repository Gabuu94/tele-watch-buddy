import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adjustBalance, claimFirstAdmin, getDashboard, getMyAdminStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProxyManager } from "@/components/admin/ProxyManager";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Shop admin — Luxury Socks proxy bot" },
      { name: "description", content: "Manage proxy stock, bot customers, orders and crypto top-ups in one place." },
      { property: "og:title", content: "Shop admin — Luxury Socks proxy bot" },
      { property: "og:description", content: "Manage proxy stock, bot customers, orders and crypto top-ups." },
    ],
  }),
  component: AdminPage,
});

function money(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const statusFn = useServerFn(getMyAdminStatus);
  const dashboardFn = useServerFn(getDashboard);
  const claimFn = useServerFn(claimFirstAdmin);
  const adjustFn = useServerFn(adjustBalance);

  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => statusFn({}) });
  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => dashboardFn({}),
    enabled: status.data?.isAdmin === true,
  });

  const claim = useMutation({
    mutationFn: () => claimFn({}),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const adjust = useMutation({
    mutationFn: (vars: { botUserId: string; amount: number }) => adjustFn({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
  });

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  if (status.isLoading) {
    return <main className="p-10 text-muted-foreground">Loading…</main>;
  }

  if (!status.data?.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin access needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.data?.adminCount === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  No admin has been set up yet. Claim this account as the shop owner.
                </p>
                <Button onClick={() => claim.mutate()} disabled={claim.isPending}>
                  Make me the admin
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This account is not an admin. Ask the shop owner to give you access.
              </p>
            )}
            {claim.error ? <p className="text-sm text-destructive">{String(claim.error.message)}</p> : null}
          </CardContent>
        </Card>
      </main>
    );
  }

  const data = dashboard.data;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Luxury Socks — shop admin</h1>
          <p className="text-sm text-muted-foreground">Telegram proxy shop control panel</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          Sign out
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Customers", value: data?.stats.userCount ?? 0 },
          { label: "Proxies in stock", value: data?.stats.availableCount ?? 0 },
          { label: "Total proxies", value: data?.stats.proxyCount ?? 0 },
          { label: "Recent sales", value: money(data?.stats.revenue ?? 0) },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{s.value}</CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="proxies">
        <TabsList>
          <TabsTrigger value="proxies">Proxy stock</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="topups">Top-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="proxies">
          <ProxyManager />
        </TabsContent>



        <TabsContent value="customers" className="space-y-3">
          {(data?.users ?? []).map((u: any) => (
            <Card key={u.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{u.username ? `@${u.username}` : (u.first_name ?? "Customer")}</p>
                  <p className="text-sm text-muted-foreground">ID {u.telegram_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{money(u.balance)}</Badge>
                  <Input
                    className="w-28"
                    placeholder="+/- $"
                    value={amounts[u.id] ?? ""}
                    onChange={(e) => setAmounts({ ...amounts, [u.id]: e.target.value })}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const amount = Number(amounts[u.id]);
                      if (!Number.isFinite(amount) || amount === 0) return;
                      adjust.mutate({ botUserId: u.id, amount });
                      setAmounts({ ...amounts, [u.id]: "" });
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data?.users.length ? <p className="text-sm text-muted-foreground">No customers yet.</p> : null}
        </TabsContent>

        <TabsContent value="orders" className="space-y-3">
          {(data?.orders ?? []).map((o: any) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{o.details}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.kind === "buy" ? "Purchase" : "IP reveal"} · {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge>{money(o.price)}</Badge>
              </CardContent>
            </Card>
          ))}
          {!data?.orders.length ? <p className="text-sm text-muted-foreground">No orders yet.</p> : null}
        </TabsContent>

        <TabsContent value="topups" className="space-y-3">
          {(data?.topups ?? []).map((t: any) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">
                    {money(t.amount_usd)} · {t.network}
                  </p>
                  <p className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <Badge variant={t.status === "finished" ? "default" : "secondary"}>{t.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!data?.topups.length ? <p className="text-sm text-muted-foreground">No top-ups yet.</p> : null}
        </TabsContent>
      </Tabs>
    </main>
  );
}
