import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listWallets, saveWalletAddresses } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { network: "TRC-20", currency: "usdt", label: "USDT · TRC-20 (Tron)", memoLabel: null },
  { network: "ERC-20", currency: "usdt", label: "USDT · ERC-20 (Ethereum)", memoLabel: null },
  { network: "BEP-20", currency: "usdt", label: "USDT · BEP-20 (BNB Chain)", memoLabel: null },
  { network: "Polygon", currency: "usdt", label: "USDT · Polygon", memoLabel: null },
  { network: "TON", currency: "ton", label: "TON", memoLabel: "Memo / comment" },
  { network: "Bitcoin", currency: "btc", label: "Bitcoin (BTC)", memoLabel: null },
  { network: "Ethereum", currency: "eth", label: "Ethereum (ETH)", memoLabel: null },
  { network: "Litecoin", currency: "ltc", label: "Litecoin (LTC)", memoLabel: null },
  { network: "Solana", currency: "sol", label: "Solana (SOL)", memoLabel: null },
  { network: "Tron", currency: "trx", label: "Tron (TRX)", memoLabel: null },
];

export function AddressBook() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listWallets);
  const saveFn = useServerFn(saveWalletAddresses);

  const wallets = useQuery({ queryKey: ["admin-wallets"], queryFn: () => listFn({}) });
  const [values, setValues] = useState<Record<string, { address: string; memo: string }>>({});

  useEffect(() => {
    if (!wallets.data) return;
    const next: Record<string, { address: string; memo: string }> = {};
    for (const p of PRESETS) {
      const match = (wallets.data as any[]).find((w) => w.network === p.network && w.currency === p.currency);
      next[`${p.network}|${p.currency}`] = { address: match?.address ?? "", memo: match?.memo ?? "" };
    }
    setValues(next);
  }, [wallets.data]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          entries: PRESETS.map((p) => ({
            network: p.network,
            currency: p.currency,
            address: values[`${p.network}|${p.currency}`]?.address ?? "",
            memo: values[`${p.network}|${p.currency}`]?.memo ?? "",
          })),
        },
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paste your crypto addresses</CardTitle>
        <p className="text-sm text-muted-foreground">
          Fill only the coins you want to accept. Empty boxes are hidden from buyers.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {PRESETS.map((p) => {
            const key = `${p.network}|${p.currency}`;
            const v = values[key] ?? { address: "", memo: "" };
            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{p.label}</Label>
                <Input
                  placeholder={`Paste your ${p.label} address`}
                  value={v.address}
                  onChange={(e) => setValues({ ...values, [key]: { ...v, address: e.target.value } })}
                />
                {p.memoLabel ? (
                  <Input
                    placeholder={`${p.memoLabel} (optional)`}
                    value={v.memo}
                    onChange={(e) => setValues({ ...values, [key]: { ...v, memo: e.target.value } })}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save addresses
          </Button>
          {save.isSuccess ? <span className="text-sm text-muted-foreground">Saved.</span> : null}
          {save.error ? <span className="text-sm text-destructive">{String(save.error.message)}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
