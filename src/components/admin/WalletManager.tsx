import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { deleteWallet, getSettings, listWallets, saveSetting, saveWallet } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type WalletDraft = { id?: string; network: string; currency: string; address: string; memo?: string; active: boolean };

const blank: WalletDraft = { network: "TRC-20", currency: "usdt", address: "", memo: "", active: true };

export function WalletManager() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listWallets);
  const saveFn = useServerFn(saveWallet);
  const deleteFn = useServerFn(deleteWallet);
  const settingsFn = useServerFn(getSettings);
  const saveSettingFn = useServerFn(saveSetting);

  const wallets = useQuery({ queryKey: ["admin-wallets"], queryFn: () => listFn({}) });
  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => settingsFn({}) });

  const [draft, setDraft] = useState<WalletDraft>({ ...blank });
  const [minDeposit, setMinDeposit] = useState("50");
  const [referral, setReferral] = useState("5");

  useEffect(() => {
    if (settings.data) {
      setMinDeposit(settings.data["min_deposit"] ?? "50");
      setReferral(settings.data["referral_percent"] ?? "5");
    }
  }, [settings.data]);

  const invalidate = () => queryClient.invalidateQueries();
  const save = useMutation({
    mutationFn: (w: WalletDraft) => saveFn({ data: w }),
    onSuccess: () => {
      setDraft({ ...blank });
      invalidate();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteFn({ data: { id } }), onSuccess: invalidate });
  const setSetting = useMutation({
    mutationFn: (v: { key: string; value: string }) => saveSettingFn({ data: v }),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{draft.id ? "Edit wallet" : "Add a payout wallet"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Network (shown to buyers)</Label>
              <Input value={draft.network} onChange={(e) => setDraft({ ...draft, network: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Coin</Label>
              <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Wallet address</Label>
            <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Memo / tag (optional)</Label>
            <Input value={draft.memo ?? ""} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            <Label htmlFor="active" className="text-sm">
              Show this network in the bot
            </Label>
          </div>
          <div className="flex gap-2">
            <Button disabled={!draft.address || save.isPending} onClick={() => save.mutate(draft)}>
              Save wallet
            </Button>
            {draft.id ? (
              <Button variant="outline" onClick={() => setDraft({ ...blank })}>
                Cancel
              </Button>
            ) : null}
          </div>
          {save.error ? <p className="text-sm text-destructive">{String(save.error.message)}</p> : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shop settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Minimum deposit ($)</Label>
              <Input className="w-32" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Referral bonus (%)</Label>
              <Input className="w-32" value={referral} onChange={(e) => setReferral(e.target.value)} />
            </div>
            <Button
              onClick={() => {
                setSetting.mutate({ key: "min_deposit", value: minDeposit });
                setSetting.mutate({ key: "referral_percent", value: referral });
              }}
            >
              Save
            </Button>
          </CardContent>
        </Card>

        {(wallets.data ?? []).map((w: any) => (
          <Card key={w.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {w.network} · {String(w.currency).toUpperCase()}
                </p>
                <p className="truncate text-sm text-muted-foreground">{w.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={w.active ? "default" : "outline"}>{w.active ? "live" : "hidden"}</Badge>
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...w })}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove.mutate(w.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!wallets.isLoading && !(wallets.data ?? []).length ? (
          <p className="text-sm text-muted-foreground">No wallets yet — buyers can't top up until you add one.</p>
        ) : null}
      </div>
    </div>
  );
}
