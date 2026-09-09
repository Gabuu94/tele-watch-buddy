import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { handleUpdate } from "@/lib/bot.server";

function deriveSecret(telegramApiKey: string): string {
  return createHash("sha256").update(`telegram-webhook:${telegramApiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const telegramKey = process.env["TELEGRAM_API_KEY"];
        if (!telegramKey) return new Response("Not configured", { status: 500 });

        const expected = deriveSecret(telegramKey);
        const actual = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

        const update = await request.json();
        try {
          await handleUpdate(update);
        } catch (err) {
          console.error("Bot update failed", err);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
