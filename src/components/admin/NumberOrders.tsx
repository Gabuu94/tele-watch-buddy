import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listNumberOrders, resolveNumberOrder } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function Row({ o }: { o: any }) {
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolveNumberOrder);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const m = useMutation({
    mutationFn: (v: { action: "code" | "refund" }) => resolveFn({ data: { id: o.id, action: v.action, code, phone } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["number-orders"] }),
  });
  return (
    <Card>
      <CardContent className="space-y-2 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{o.service}</span>
          <span className="text-muted-foreground">· {o.country} · {o.tier}</span>
          <Badge variant={o.status === "waiting" ? "default" : "secondary"}>{o.status}</Badge>
          <span className="ml-auto">${Number(o.price).toFixed(2)}</span>
        </div>
        <div className="font-mono">{o.phone}{o.code ? ` → ${o.code}` : ""}</div>
        <div className="text-xs text-muted-foreground">
          @{o.bot_users?.username ?? o.bot_users?.telegram_id} · {new Date(o.created_at).toLocaleString()}
        </div>
        {o.status === "waiting" ? (
          <div className="flex flex-wrap gap-2">
            <Input className="w-40" placeholder="SMS code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input className="w-48" placeholder="Replace number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button size="sm" disabled={m.isPending} onClick={() => m.mutate({ action: "code" })}>Send code</Button>
            <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate({ action: "refund" })}>Refund</Button>
          </div>
        ) : null}
        {m.error ? <p className="text-xs text-destructive">{(m.error as Error).message}</p> : null}
      </CardContent>
    </Card>
  );
}

export function NumberOrders() {
  const listFn = useServerFn(listNumberOrders);
  const q = useQuery({ queryKey: ["number-orders"], queryFn: () => listFn({}), refetchInterval: 15000 });
  return (
    <div className="space-y-3">
      {(q.data ?? []).map((o) => <Row key={o.id} o={o} />)}
      {!q.data?.length ? <p className="text-sm text-muted-foreground">No number orders yet.</p> : null}
    </div>
  );
}
