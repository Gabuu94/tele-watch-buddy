import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { bulkAddProxies } from "@/lib/admin.functions";
import { CATEGORY_NAMES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BulkUpload() {
  const queryClient = useQueryClient();
  const bulkFn = useServerFn(bulkAddProxies);
  const [category, setCategory] = useState(CATEGORY_NAMES[0]!);
  const [text, setText] = useState("");
  const [price, setPrice] = useState("0.65");
  const [revealPrice, setRevealPrice] = useState("0.11");

  const upload = useMutation({
    mutationFn: () =>
      bulkFn({ data: { category, text, price: Number(price), revealPrice: Number(revealPrice) } }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bulk add proxies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          One per line:{" "}
          <code>ip:port:login:pass:continent:country:region:city:isp:zip:ping</code> (ping optional)
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_NAMES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sale price ($)</Label>
            <Input className="w-28" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reveal price ($)</Label>
            <Input className="w-28" value={revealPrice} onChange={(e) => setRevealPrice(e.target.value)} />
          </div>
        </div>
        <Textarea
          rows={8}
          value={text}
          placeholder="45.12.44.9:8080:user:pass:Europe:Germany:Berlin:Berlin:Deutsche Telekom:10115:32"
          onChange={(e) => setText(e.target.value)}
        />
        <Button disabled={!text.trim() || upload.isPending} onClick={() => upload.mutate()}>
          Upload
        </Button>
        {upload.data ? (
          <p className="text-sm text-muted-foreground">
            Added {upload.data.added}, skipped {upload.data.skipped} bad lines.
          </p>
        ) : null}
        {upload.error ? <p className="text-sm text-destructive">{String(upload.error.message)}</p> : null}
      </CardContent>
    </Card>
  );
}
