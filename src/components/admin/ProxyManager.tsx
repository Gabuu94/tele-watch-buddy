import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { deleteProxy, listProxies, saveProxy, type ProxyInput } from "@/lib/admin.functions";
import { CATEGORY_NAMES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const empty: ProxyInput = {
  category: CATEGORY_NAMES[0]!,
  continent: "Europe",
  country: "Germany",
  region: "Berlin",
  city: "Berlin",
  isp: "Deutsche Telekom",
  ip: "",
  port: 8080,
  login: "user",
  password: "pass",
  ping: 50,
  zip: "10115",
  reveal_price: 0.11,
  price: 0.65,
  sold: false,
};

export function ProxyManager() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listProxies);
  const saveFn = useServerFn(saveProxy);
  const deleteFn = useServerFn(deleteProxy);

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ProxyInput | null>(null);

  const proxies = useQuery({
    queryKey: ["admin-proxies", search],
    queryFn: () => listFn({ data: { search } }),
  });

  const invalidate = () => queryClient.invalidateQueries();

  const save = useMutation({
    mutationFn: (input: ProxyInput) => saveFn({ data: input }),
    onSuccess: () => {
      setDraft(null);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const field = (key: keyof ProxyInput, label: string, type: "text" | "number" = "text") => (
    <div className="space-y-1" key={key}>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={String(draft?.[key] ?? "")}
        onChange={(e) =>
          setDraft({
            ...(draft as ProxyInput),
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search IP, city, country, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => setDraft({ ...empty })}>Add proxy</Button>
      </div>

      {proxies.isLoading ? <p className="text-sm text-muted-foreground">Loading stock…</p> : null}

      <div className="space-y-2">
        {(proxies.data ?? []).map((p: any) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {p.ip}:{p.port} · {p.city}, {p.country}
                </p>
                <p className="text-sm text-muted-foreground">
                  {p.category} · {p.isp} · ping {p.ping}ms · ZIP {p.zip}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">reveal ${Number(p.reveal_price).toFixed(2)}</Badge>
                <Badge>${Number(p.price).toFixed(2)}</Badge>
                {p.sold ? <Badge variant="outline">sold</Badge> : null}
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...(p as ProxyInput) })}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove.mutate(p.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!proxies.isLoading && !(proxies.data ?? []).length ? (
          <p className="text-sm text-muted-foreground">No proxies match that search.</p>
        ) : null}
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit proxy" : "Add proxy"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Category</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {CATEGORY_NAMES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {field("ip", "IP address")}
              {field("port", "Port", "number")}
              {field("login", "Login")}
              {field("password", "Password")}
              {field("continent", "Continent")}
              {field("country", "Country")}
              {field("region", "Region")}
              {field("city", "City")}
              {field("isp", "ISP")}
              {field("zip", "ZIP")}
              {field("ping", "Ping (ms)", "number")}
              {field("reveal_price", "Reveal price ($)", "number")}
              {field("price", "Sale price ($)", "number")}
              <div className="col-span-2 flex items-center gap-2">
                <input
                  id="sold"
                  type="checkbox"
                  checked={draft.sold}
                  onChange={(e) => setDraft({ ...draft, sold: e.target.checked })}
                />
                <Label htmlFor="sold" className="text-sm">
                  Mark as sold (hidden from the bot)
                </Label>
              </div>
            </div>
          ) : null}
          {save.error ? <p className="text-sm text-destructive">{String(save.error.message)}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button disabled={save.isPending || !draft?.ip} onClick={() => draft && save.mutate(draft)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
