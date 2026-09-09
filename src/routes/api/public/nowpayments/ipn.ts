import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { creditTopup } from "@/lib/bot.server";

function sortedStringify(value: any): string {
  if (Array.isArray(value)) return `[${value.map(sortedStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${sortedStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

export const Route = createFileRoute("/api/public/nowpayments/ipn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ipnSecret = process.env["NOWPAYMENTS_IPN_SECRET"];
        if (!ipnSecret) return new Response("Not configured", { status: 500 });

        const raw = await request.text();
        const signature = request.headers.get("x-nowpayments-sig") ?? "";
        const expected = createHmac("sha512", ipnSecret).update(sortedStringify(JSON.parse(raw))).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(raw);
        try {
          await creditTopup(String(payload.payment_id), String(payload.payment_status), payload);
        } catch (err) {
          console.error("Top-up crediting failed", err);
          return new Response("error", { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
