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

const RULES = `📜 <b>Shop rules</b>

1. Proxies are sold as-is; check the IP with the built-in checker before buying.
2. Balance top-ups are non-refundable and only usable inside this shop.
3. One IP is sold once — after purchase it is removed from stock.
4. Replacements are only given if the proxy is dead on delivery and reported within 30 minutes.
5. Any illegal use is forbidden and gets you banned without refund.

Tap <b>I accept</b> to continue.`;

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
  referred_by: string | null;
  referral_earned: number;
  state: any;
};

async function setting(key: string, fallback: number): Promise<number> {
  const { data } = await db().from("settings").select("value").eq("key", key).maybeSingle();
  const n = Number((data as any)?.value);
  return Number.isFinite(n) ? n : fallback;
}

async function getUser(from: any): Promise<BotUser> {
  const sb = db();
  const { data: existing } = await sb.from("bot_users").select("*").eq("telegram_id", from.id).maybeSingle();
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
    [{ text: "🔎 Search by country / ZIP / ISP", callback_data: "search" }],
    [{ text: "💵 Top up balance 💵", callback_data: "topup" }],
    [
      { text: "👁 Check IP 👁", callback_data: "checkip" },
      { text: "🧦 Check Socks", callback_data: "checksocks" },
    ],
    [{ text: "🤝 Referral program", callback_data: "ref" }],
    [{ text: "📜 Rules", callback_data: "rules" }],
    [{ text: "🆘 Support", url: "https://t.me/luxsocks_supp" } as any],
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

async function askRules(chatId: number) {
  await sendMessage(chatId, RULES, [[{ text: "✅ I accept", callback_data: "accept" }]]);
}

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text: string = message.text.trim();
  const user = await getUser(message.from);

  if (text.startsWith("/start")) {
    const payload = text.split(" ")[1];
    if (payload?.startsWith("ref") && !user.referred_by) {
      const refId = Number(payload.replace(/[^0-9]/g, ""));
      if (refId && refId !== user.telegram_id) {
        const { data: referrer } = await db().from("bot_users").select("id").eq("telegram_id", refId).maybeSingle();
        if (referrer) await db().from("bot_users").update({ referred_by: (referrer as any).id }).eq("id", user.id);
      }
    }
    await setState(user.id, {});
    await sendMessage(
      chatId,
      "💎 <b>Luxury Socks</b> 💎 — premium residential & mobile proxies, instant delivery.\n\n" +
        "📮 Support: @luxsocks_supp\n" +
        `💰 Your balance: <b>${money(user.balance)}</b>`,
    );
    if (!user.rules_accepted) return askRules(chatId);
    await sendMainMenu(chatId);
    return;
  }

  if (!user.rules_accepted) return askRules(chatId);

  const awaiting = user.state?.awaiting;

  if (awaiting === "amount") {
    const min = await setting("min_deposit", 50);
    const amount = Number(text.replace(",", "."));
    if (!Number.isFinite(amount) || amount < min) {
      await sendMessage(chatId, `❌ Minimum deposit is <b>${money(min)}</b>. Please enter a bigger amount.`);
      return;
    }
    await setState(user.id, { awaiting: null, amount });
    const { data: wallets } = await db().from("wallets").select("*").eq("active", true).order("network");
    if (!wallets?.length) {
      await sendMessage(chatId, "⚠️ Top-ups are temporarily unavailable. Please contact @luxsocks_supp.", [backRow()]);
      return;
    }
    await sendMessage(
      chatId,
      `Select a network for <b>${money(amount)}</b>`,
      (wallets as any[])
        .map((w) => [{ text: `${w.network} (${String(w.currency).toUpperCase()})`, callback_data: `net:${w.id}` }])
        .concat([backRow()]),
    );
    return;
  }

  if (awaiting === "search") {
    await setState(user.id, { awaiting: null });
    await runSearch(chatId, text);
    return;
  }

  if (awaiting === "checkip") {
    await setState(user.id, { awaiting: null });
    await checkIp(chatId, text);
    return;
  }

  if (awaiting === "checksocks") {
    await setState(user.id, { awaiting: null });
    const ip = text.split(":")[0]!.trim();
    await checkIp(chatId, ip, true);
    return;
  }

  if (awaiting === "txhash") {
    const topupId = user.state?.topupId;
    await setState(user.id, { awaiting: null });
    if (topupId) {
      await db().from("topups").update({ tx_hash: text, status: "pending_review" }).eq("id", topupId);
      await sendMessage(
        chatId,
        "🔎 Thanks! Your payment is being verified. Your balance is credited as soon as it is confirmed.",
        [backRow()],
      );
    }
    return;
  }

  await sendMainMenu(chatId);
}

async function handleCallback(cq: any) {
  const chatId = cq.message.chat.id;
  const data: string = cq.data ?? "";
  const user = await getUser(cq.from);
  await answerCallback(cq.id);

  if (data === "accept") {
    await db().from("bot_users").update({ rules_accepted: true }).eq("id", user.id);
    await sendMessage(chatId, "✅ Rules accepted. Welcome to Luxury Socks!");
    return sendMainMenu(chatId);
  }

  if (!user.rules_accepted) return askRules(chatId);

  if (data === "menu") return sendMainMenu(chatId);
  if (data === "rules") {
    await sendMessage(chatId, RULES, [backRow()]);
    return;
  }

  if (data === "soon") {
    await sendMessage(chatId, "🛠 This section is coming soon.", [backRow()]);
    return;
  }

  if (data === "ref") {
    const { count } = await db()
      .from("bot_users")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id);
    const percent = await setting("referral_percent", 5);
    await sendMessage(
      chatId,
      `🤝 <b>Referral program</b>\n\nEarn <b>${percent}%</b> of every top-up made by people you invite.\n\n` +
        `👥 Invited: <b>${count ?? 0}</b>\n💵 Earned: <b>${money(user.referral_earned ?? 0)}</b>\n\n` +
        `Your link:\nhttps://t.me/Proxynvn_bot?start=ref${user.telegram_id}`,
      [backRow()],
    );
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
      `👤 <b>Personal Area</b>\n\n🆔 ID: <code>${user.telegram_id}</code>\n💰 Balance: <b>${money(user.balance)}</b>\n🛒 Purchases: <b>${count ?? 0}</b>\n🤝 Referral earnings: <b>${money(user.referral_earned ?? 0)}</b>`,
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
    const min = await setting("min_deposit", 50);
    await setState(user.id, { awaiting: "amount" });
    await sendMessage(chatId, `Enter amount in $ (minimum <b>${money(min)}</b>)`);
    return;
  }

  if (data === "search") {
    await setState(user.id, { awaiting: "search" });
    await sendMessage(chatId, "🔎 Send a country, city, ZIP code or ISP name.");
    return;
  }

  if (data === "checkip") {
    await setState(user.id, { awaiting: "checkip" });
    await sendMessage(chatId, "👁 Send an IP address to check.");
    return;
  }

  if (data === "checksocks") {
    await setState(user.id, { awaiting: "checksocks" });
    await sendMessage(chatId, "🧦 Send the proxy as <code>ip:port:login:pass</code>.");
    return;
  }

  if (data.startsWith("net:")) {
    const walletId = data.slice(4);
    const amount = Number(user.state?.amount ?? 0);
    if (!amount) {
      await sendMessage(chatId, "Please start the top-up again.", [backRow()]);
      return;
    }
    await createTopup(user, chatId, walletId, amount);
    return;
  }

  if (data === "paid") {
    const topupId = user.state?.topupId;
    if (!topupId) {
      await sendMessage(chatId, "Please start the top-up again.", [backRow()]);
      return;
    }
    await setState(user.id, { ...user.state, awaiting: "txhash" });
    await sendMessage(chatId, "Send the transaction hash (TXID) of your payment.");
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
    const category = CATEGORIES[Number(data.slice(4))] ?? CATEGORIES[0]!;
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
    for (const p of list as any[]) await sendProxyCard(chatId, p);
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

async function sendProxyCard(chatId: number, p: any) {
  await sendMessage(
    chatId,
    `💎 IP <b>${maskIp(p.ip)}</b>\n🛰 ISP ${p.isp}\n🏙 CITY ${p.city}\n🏢 REGION ${p.region}\n📶 PING ${p.ping}\n🏤 ZIP ${p.zip}\n📍 COUNTRY ${p.country}`,
    [
      [{ text: `Show ip ${money(p.reveal_price)}`, callback_data: `show:${p.id}` }],
      [{ text: `Buy ${money(p.price)}`, callback_data: `buyp:${p.id}` }],
    ],
  );
}

async function runSearch(chatId: number, term: string) {
  const s = `%${term}%`;
  const { data: list } = await db()
    .from("proxies")
    .select("*")
    .eq("sold", false)
    .or(`country.ilike.${s},city.ilike.${s},zip.ilike.${s},isp.ilike.${s},region.ilike.${s}`)
    .limit(10);
  if (!list?.length) {
    await sendMessage(chatId, `Nothing found for “${term}”.`, [
      [{ text: "🔎 Search again", callback_data: "search" }],
      backRow(),
    ]);
    return;
  }
  await sendMessage(chatId, `🔎 <b>${list.length}</b> results for “${term}”`);
  for (const p of list as any[]) await sendProxyCard(chatId, p);
  await sendMessage(chatId, "⬅️ Back to menu", [backRow()]);
}

async function checkIp(chatId: number, ip: string, socks = false) {
  const clean = ip.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) {
    await sendMessage(chatId, "❌ That does not look like a valid IPv4 address.", [backRow()]);
    return;
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${clean}?fields=status,country,regionName,city,zip,isp,org,proxy,hosting,mobile`,
    );
    const info: any = await res.json();
    if (info.status !== "success") throw new Error("lookup failed");
    await sendMessage(
      chatId,
      `${socks ? "🧦 <b>Socks check</b>" : "👁 <b>IP check</b>"}\n\n` +
        `IP: <code>${clean}</code>\n📍 ${info.city ?? "-"}, ${info.regionName ?? "-"}, ${info.country ?? "-"}\n` +
        `🏤 ZIP ${info.zip ?? "-"}\n🛰 ISP ${info.isp ?? "-"}\n🏢 ORG ${info.org ?? "-"}\n` +
        `🚩 Proxy/VPN flag: ${info.proxy ? "yes ⚠️" : "no ✅"}\n🖥 Hosting: ${info.hosting ? "yes ⚠️" : "no ✅"}\n📱 Mobile: ${info.mobile ? "yes" : "no"}`,
      [backRow()],
    );
  } catch {
    await sendMessage(chatId, "⚠️ Could not check that IP right now, try again shortly.", [backRow()]);
  }
}

function maskIp(ip: string) {
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.******`;
}

async function distinct(column: "continent" | "country" | "region", filters: Record<string, string>) {
  let query: any = db().from("proxies").select(column).eq("sold", false);
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
    await sendMessage(chatId, `❌ Not enough balance. Needed ${money(price)}, you have ${money(balance)}.`, [
      [{ text: "💵 Top up balance 💵", callback_data: "topup" }],
      backRow(),
    ]);
    return;
  }

  if (kind === "buy") {
    const { data: claimed } = await sb
      .from("proxies")
      .update({ sold: true })
      .eq("id", p.id)
      .eq("sold", false)
      .select("id");
    if (!claimed?.length) {
      await sendMessage(chatId, "❌ Someone just bought this proxy.", [backRow("buy")]);
      return;
    }
  }

  const newBalance = balance - price;
  await sb.from("bot_users").update({ balance: newBalance }).eq("id", user.id);
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

async function createTopup(user: BotUser, chatId: number, walletId: string, amount: number) {
  const sb = db();
  const { data: wallet } = await sb.from("wallets").select("*").eq("id", walletId).maybeSingle();
  if (!wallet) {
    await sendMessage(chatId, "⚠️ That network is unavailable. Please pick another one.", [backRow()]);
    return;
  }
  const w = wallet as any;

  const { data: row, error } = await sb
    .from("topups")
    .insert({
      bot_user_id: user.id,
      network: w.network,
      pay_currency: w.currency,
      amount_usd: amount,
      pay_address: w.address,
      wallet_id: w.id,
      provider: "manual",
      status: "waiting",
    })
    .select("id")
    .single();
  if (error) throw error;

  await setState(user.id, { ...user.state, topupId: (row as any).id });
  await sendPhoto(chatId, qrUrl(w.address));
  await sendMessage(
    chatId,
    `💵 <b>Top up ${money(amount)}</b>\n\nNETWORK ${w.network}\nCOIN ${String(w.currency).toUpperCase()}\nADDRESS\n<code>${w.address}</code>` +
      (w.memo ? `\nMEMO/TAG <code>${w.memo}</code>` : "") +
      `\n\nSend the exact USD value in ${String(w.currency).toUpperCase()}, then tap <b>I have paid</b> and send your transaction hash. Balance is credited after confirmation.`,
    [[{ text: "✅ I have paid", callback_data: "paid" }], backRow()],
  );
}

export async function creditTopupById(topupId: string) {
  const sb = db();
  const { data: topup } = await sb.from("topups").select("*").eq("id", topupId).maybeSingle();
  if (!topup) return;
  const t = topup as any;
  if (t.credited_at) return;

  const { data: botUser } = await sb.from("bot_users").select("*").eq("id", t.bot_user_id).maybeSingle();
  if (!botUser) return;
  const u = botUser as any;
  const newBalance = Number(u.balance) + Number(t.amount_usd);
  await sb.from("bot_users").update({ balance: newBalance }).eq("id", u.id);
  await sb.from("topups").update({ credited_at: new Date().toISOString(), status: "finished" }).eq("id", t.id);

  if (u.referred_by) {
    const percent = await setting("referral_percent", 5);
    const bonus = (Number(t.amount_usd) * percent) / 100;
    const { data: ref } = await sb.from("bot_users").select("*").eq("id", u.referred_by).maybeSingle();
    if (ref) {
      const r = ref as any;
      await sb
        .from("bot_users")
        .update({ balance: Number(r.balance) + bonus, referral_earned: Number(r.referral_earned ?? 0) + bonus })
        .eq("id", r.id);
      await sendMessage(r.telegram_id, `🤝 Referral bonus: <b>${money(bonus)}</b> added to your balance.`).catch(
        () => undefined,
      );
    }
  }

  await sendMessage(
    u.telegram_id,
    `✅ Payment received: <b>${money(t.amount_usd)}</b>\n💰 New balance: <b>${money(newBalance)}</b>`,
    [[{ text: "Main menu", callback_data: "menu" }]],
  );
}

export async function creditTopup(providerId: string, status: string) {
  const sb = db();
  const { data: topup } = await sb.from("topups").select("id, credited_at").eq("provider_id", providerId).maybeSingle();
  if (!topup) return;
  const t = topup as any;
  await sb.from("topups").update({ status }).eq("id", t.id);
  if (status !== "finished" && status !== "confirmed") return;
  if (t.credited_at) return;
  await creditTopupById(t.id);
}
