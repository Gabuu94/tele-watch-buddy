import { createClient } from "@supabase/supabase-js";
import { answerCallback, qrUrl, sendMessage, sendPhoto, type Button } from "./telegram.server";

export const CATEGORIES = [
  "Luxury proxy",
  "Fresh Proxy",
  "Smart proxy",
  "OUTLET PROXY",
  "Turbo proxy",
  "PREMIUM PROXY",
  "UNIVERSAL PROXY",
];

const CATEGORY_LABELS: Record<string, string> = {
  "Luxury proxy": "⭐ Luxury proxy ⭐",
  "Fresh Proxy": "✅ Fresh Proxy",
  "Smart proxy": "📱 Smart proxy",
  "OUTLET PROXY": "🌶 OUTLET PROXY",
  "Turbo proxy": "🛶 Turbo proxy",
  "PREMIUM PROXY": "✨ PREMIUM PROXY ✨",
  "UNIVERSAL PROXY": "🌐 UNIVERSAL PROXY 🔄",
};

export const NETWORKS: { label: string; currency: string }[] = [
  { label: "TON", currency: "ton" },
  { label: "TRC-20", currency: "usdttrc20" },
  { label: "ETH ERC-20", currency: "usdterc20" },
  { label: "POLYGON ERC-20", currency: "usdtmatic" },
  { label: "BEP-20", currency: "usdtbsc" },
];

function db() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type BotUser = {
  id: string;
  telegram_id: number;
  balance: number;
  rules_accepted: boolean;
  state: Record<string, any>;
};

async function getUser(from: any): Promise<BotUser> {
  const sb = db();
  const { data: existing } = await sb
    .from("bot_users")
    .select("*")
    .eq("telegram_id", from.id)
    .maybeSingle();
  if (existing) return existing as unknown as BotUser;
  const { data, error } = await sb
    .from("bot_users")
    .insert({
      telegram_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as BotUser;
}

async function setState(userId: string, state: Record<string, any>) {
  await db().from("bot_users").update({ state }).eq("id", userId);
}

function money(n: number) {
  return `${Number(n).toFixed(2)}$`;
}

function mainMenuKeyboard(): Button[][] {
  return [
    [
      { text: "👤 Personal Area 👤", callback_data: "me" },
      { text: "🎁 Purchase history", callback_data: "hist" },
    ],
    [{ text: "🔍 Buy proxy 🔍", callback_data: "buy" }],
    [{ text: "💵 Top up balance 💵", callback_data: "topup" }],
    [{ text: "👁 check ip 👁", callback_data: "soon" }],
    [{ text: "RENT USA NUMBER 🇺🇸", callback_data: "soon" }],
    [{ text: "📵 data-only eSIM", callback_data: "soon" }],
    [
      { text: "Gmail", callback_data: "soon" },
      { text: "Check Socks", callback_data: "soon" },
    ],
  ];
}

async function sendMainMenu(chatId: number) {
  await sendMessage(chatId, "<b>Main menu</b>\nChoose an option below 👇", mainMenuKeyboard());
}

const backRow = (data = "menu"): Button[] => [{ text: "⬅️ Back", callback_data: data }];

export async function handleUpdate(update: any) {
  if (update.callback_query) return handleCallback(update.callback_query);
  const message = update.message ?? update.edited_message;
  if (message?.text) return handleMessage(message);
}

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text: string = message.text.trim();
  const user = await getUser(message.from);

  if (text.startsWith("/start")) {
    await setState(user.id, {});
    await sendMessage(
      chatId,
      "💎 <b>Luxury Socks</b> 💎 — high-quality proxy rental!\n\n" +
        "📮 Help: @luxsocks_supp\n" +
        "🐦 News: coming soon\n\n" +
        `💰 Your balance: <b>${money(user.balance)}</b>`,
    );
    await sendMainMenu(chatId);
    return;
  }

  if (user.state?.awaiting === "amount") {
    const amount = Number(text.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 1) {
      await sendMessage(chatId, "❌ Please enter a number in $ (minimum 1).");
      return;
    }
    await setState(user.id, { awaiting: null, amount });
    await sendMessage(
      chatId,
      `Select a network for <b>${money(amount)}</b>`,
      NETWORKS.map((n) => [{ text: n.label, callback_data: `net:${n.currency}` }]).concat([backRow()]),
    );
    return;
  }

  await sendMainMenu(chatId);
}

async function handleCallback(cq: any) {
  const chatId = cq.message.chat.id;
  const data: string = cq.data ?? "";
  const user = await getUser(cq.from);
  await answerCallback(cq.id);

  if (data === "menu") return sendMainMenu(chatId);

  if (data === "soon") {
    await sendMessage(chatId, "🛠 This section is coming soon.", [backRow()]);
    return;
  }

  if (data === "me") {
    const sb = db();
    const { count } = await sb
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("bot_user_id", user.id)
      .eq("kind", "buy");
    await sendMessage(
      chatId,
      `👤 <b>Personal Area</b>\n\n🆔 ID: <code>${user.telegram_id}</code>\n💰 Balance: <b>${money(user.balance)}</b>\n🛒 Purchases: <b>${count ?? 0}</b>`,
      [[{ text: "💵 Top up balance 💵", callback_data: "topup" }], backRow()],
    );
    return;
  }

  if (data === "hist") {
    const { data: orders } = await db()
      .from("orders")
      .select("kind, price, details, created_at")
      .eq("bot_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const body =
      orders && orders.length
        ? orders
            .map(
              (o: any) =>
                `${o.kind === "buy" ? "🛒" : "👁"} ${money(o.price)} — ${o.details ?? ""}\n<i>${new Date(o.created_at).toUTCString()}</i>`,
            )
            .join("\n\n")
        : "No purchases yet.";
    await sendMessage(chatId, `🎁 <b>Purchase history</b>\n\n${body}`, [backRow()]);
    return;
  }

  if (data === "topup") {
    await setState(user.id, { awaiting: "amount" });
    await sendMessage(chatId, "Enter amount in $");
    return;
  }

  if (data.startsWith("net:")) {
    const currency = data.slice(4);
    const amount = Number(user.state?.amount ?? 0);
    if (!amount) {
      await sendMessage(chatId, "Please start the top-up again.", [backRow()]);
      return;
    }
    await createTopup(user, chatId, currency, amount);
    return;
  }

  if (data === "buy") {
    await sendMessage(
      chatId,
      "Select proxy category",
      CATEGORIES.map((c) => [{ text: CATEGORY_LABELS[c] ?? c, callback_data: `cat:${CATEGORIES.indexOf(c)}` }]).concat([
        backRow(),
      ]),
    );
    return;
  }

  if (data.startsWith("cat:")) {
    const category = CATEGORIES[Number(data.slice(4))];
    await setState(user.id, { ...user.state, category });
    const rows = await distinct("continent", { category });
    await sendMessage(
      chatId,
      "🌍 Select a continent",
      rows.map((v) => [{ text: v, callback_data: `con:${v}` }]).concat([backRow("buy")]),
    );
    return;
  }

  if (data.startsWith("con:")) {
    const continent = data.slice(4);
    const state = { ...user.state, continent };
    await setState(user.id, state);
    const rows = await distinct("country", { category: state.category, continent });
    await sendMessage(
      chatId,
      "🏳️ Select a country",
      rows.map((v) => [{ text: v, callback_data: `cou:${v}` }]).concat([backRow("buy")]),
    );
    return;
  }

  if (data.startsWith("cou:")) {
    const country = data.slice(4);
    const state = { ...user.state, country };
    await setState(user.id, state);
    const rows = await distinct("region", { category: state.category, continent: state.continent, country });
    await sendMessage(
      chatId,
      "📍 Select a region",
      rows.map((v) => [{ text: v, callback_data: `reg:${v}` }]).concat([backRow("buy")]),
    );
    return;
  }

  if (data.startsWith("reg:")) {
    const region = data.slice(4);
    const state = { ...user.state, region };
    await setState(user.id, state);
    await sendMessage(chatId, "Request processing 🔄");
    const { data: list } = await db()
      .from("proxies")
      .select("*")
      .eq("category", state.category)
      .eq("continent", state.continent)
      .eq("country", state.country)
      .eq("region", region)
      .eq("sold", false)
      .limit(10);
    if (!list?.length) {
      await sendMessage(chatId, "No proxies available here right now.", [backRow("buy")]);
      return;
    }
    for (const p of list as any[]) {
      await sendMessage(
        chatId,
        `💎 IP <b>${maskIp(p.ip)}</b>\n🛰 ISP ${p.isp}\n🏙 CITY ${p.city}\n🏢 REGION ${p.region}\n📶 PING ${p.ping}\n🏤 ZIP ${p.zip}\n📍 COUNTRY ${p.country}`,
        [
          [{ text: `Show ip ${money(p.reveal_price)}`, callback_data: `show:${p.id}` }],
          [{ text: `Buy ${money(p.price)}`, callback_data: `buyp:${p.id}` }],
        ],
      );
    }
    await sendMessage(chatId, "⬅️ Back to categories", [backRow("buy")]);
    return;
  }

  if (data.startsWith("show:") || data.startsWith("buyp:")) {
    const kind = data.startsWith("buyp:") ? "buy" : "reveal";
    const id = data.split(":")[1];
    await purchase(user, chatId, id!, kind);
    return;
  }
}

function maskIp(ip: string) {
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.******`;
}

async function distinct(column: "continent" | "country" | "region", filters: Record<string, string>) {
  let query = db().from("proxies").select(column).eq("sold", false);
  for (const [k, v] of Object.entries(filters)) query = query.eq(k, v);
  const { data } = await query.limit(2000);
  return Array.from(new Set(((data ?? []) as any[]).map((r) => r[column]))).sort();
}

async function purchase(user: BotUser, chatId: number, proxyId: string, kind: "buy" | "reveal") {
  const sb = db();
  const { data: proxy } = await sb.from("proxies").select("*").eq("id", proxyId).maybeSingle();
  if (!proxy || (proxy as any).sold) {
    await sendMessage(chatId, "❌ This proxy is no longer available.", [backRow("buy")]);
    return;
  }
  const p = proxy as any;
  const price = Number(kind === "buy" ? p.price : p.reveal_price);
  const balance = Number(user.balance);
  if (balance < price) {
    await sendMessage(
      chatId,
      `❌ Not enough balance. Needed ${money(price)}, you have ${money(balance)}.`,
      [[{ text: "💵 Top up balance 💵", callback_data: "topup" }], backRow()],
    );
    return;
  }

  const newBalance = balance - price;
  await sb.from("bot_users").update({ balance: newBalance }).eq("id", user.id);
  if (kind === "buy") await sb.from("proxies").update({ sold: true }).eq("id", p.id);
  await sb.from("orders").insert({
    bot_user_id: user.id,
    proxy_id: p.id,
    kind,
    price,
    details: `${p.ip} ${p.city}, ${p.country}`,
  });

  if (kind === "reveal") {
    await sendMessage(chatId, `👁 Full IP: <code>${p.ip}</code>\n💰 Balance: <b>${money(newBalance)}</b>`, [
      [{ text: `Buy ${money(p.price)}`, callback_data: `buyp:${p.id}` }],
      backRow("buy"),
    ]);
    return;
  }

  await sendMessage(
    chatId,
    `✅ <b>Purchase complete</b>\n\n<code>${p.ip}:${p.port}:${p.login}:${p.password}</code>\n\n🏙 ${p.city}, ${p.country}\n🛰 ${p.isp}\n💰 Balance: <b>${money(newBalance)}</b>`,
    [backRow()],
  );
}

async function createTopup(user: BotUser, chatId: number, currency: string, amount: number) {
  const apiKey = process.env["NOWPAYMENTS_API_KEY"];
  const network = NETWORKS.find((n) => n.currency === currency)?.label ?? currency;
  const sb = db();

  if (!apiKey) {
    await sendMessage(
      chatId,
      "⚠️ Crypto top-ups are not activated yet. Please contact support.",
      [backRow()],
    );
    return;
  }

  const { data: row, error } = await sb
    .from("topups")
    .insert({
      bot_user_id: user.id,
      network,
      pay_currency: currency,
      amount_usd: amount,
      status: "creating",
    })
    .select("id")
    .single();
  if (error) throw error;

  const res = await fetch("https://api.nowpayments.io/v1/payment", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: "usd",
      pay_currency: currency,
      order_id: row.id,
      order_description: `Balance top-up for ${user.telegram_id}`,
      ipn_callback_url: `${process.env["PUBLIC_APP_URL"] ?? ""}/api/public/nowpayments/ipn`,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`NOWPayments create failed [${res.status}]: ${body}`);
    await sb.from("topups").update({ status: "failed" }).eq("id", row.id);
    await sendMessage(chatId, `❌ Could not create the payment. ${body}`, [backRow()]);
    return;
  }
  const payment = JSON.parse(body);
  await sb
    .from("topups")
    .update({
      status: "waiting",
      provider_id: String(payment.payment_id),
      pay_address: payment.pay_address,
      pay_amount: payment.pay_amount,
    })
    .eq("id", row.id);

  await sendPhoto(chatId, qrUrl(payment.pay_address));
  await sendMessage(
    chatId,
    `ADDRESS\n<code>${payment.pay_address}</code>\nAMOUNT ${payment.pay_amount}\nCOIN ${String(payment.pay_currency).toUpperCase()}\nNETWORK ${network}\n\nYour balance is credited automatically after the network confirms the payment.`,
    [backRow()],
  );
}

export async function creditTopup(providerId: string, status: string) {
  const sb = db();
  const { data: topup } = await sb
    .from("topups")
    .select("*")
    .eq("provider_id", providerId)
    .maybeSingle();
  if (!topup) return;
  const t = topup as any;
  if (t.credited_at) return;

  await sb.from("topups").update({ status }).eq("id", t.id);
  if (status !== "finished" && status !== "confirmed") return;

  const { data: botUser } = await sb.from("bot_users").select("*").eq("id", t.bot_user_id).maybeSingle();
  if (!botUser) return;
  const u = botUser as any;
  const newBalance = Number(u.balance) + Number(t.amount_usd);
  await sb.from("bot_users").update({ balance: newBalance }).eq("id", u.id);
  await sb.from("topups").update({ credited_at: new Date().toISOString(), status: "finished" }).eq("id", t.id);
  await sendMessage(
    u.telegram_id,
    `✅ Payment received: <b>${money(t.amount_usd)}</b>\n💰 New balance: <b>${money(newBalance)}</b>`,
    [[{ text: "Main menu", callback_data: "menu" }]],
  );
}
