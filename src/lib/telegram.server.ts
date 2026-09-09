const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!telegramKey) throw new Error("TELEGRAM_API_KEY is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": telegramKey,
    "Content-Type": "application/json",
  };
}

export async function tg<T = any>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Telegram ${method} failed [${res.status}]: ${text}`);
    throw new Error(`Telegram ${method} failed [${res.status}]: ${text}`);
  }
  const json = JSON.parse(text);
  if (json?.ok === false) {
    console.error(`Telegram ${method} error: ${text}`);
  }
  return json as T;
}

export type Button = { text: string; callback_data: string };

export function sendMessage(chatId: number, text: string, keyboard?: Button[][]) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export function sendPhoto(chatId: number, photoUrl: string, caption?: string, keyboard?: Button[][]) {
  return tg("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    ...(caption ? { caption, parse_mode: "HTML" } : {}),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export function answerCallback(id: string, text?: string, alert = false) {
  return tg("answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text, show_alert: alert } : {}),
  });
}

export function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(data)}`;
}
