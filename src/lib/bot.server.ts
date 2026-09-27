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
  "Luxury proxy": "✦ Luxury",
  "Fresh Proxy": "◈ Fresh",
  "Smart proxy": "▣ Smart",
  "OUTLET PROXY": "◇ Outlet",
  "Turbo proxy": "⚡ Turbo",
  "PREMIUM PROXY": "◆ Premium",
  "UNIVERSAL PROXY": "◎ Universal",
};

const RULES = `💎 <b>LUXURY SOCKS  /  HOUSE RULES</b>

1. Proxies are sold as-is; check the IP with the built-in checker before buying.
2. Balance top-ups are non-refundable and only usable inside this shop.
3. One IP is sold once — after purchase it is removed from stock.
4. Replacements are only given if the proxy is dead on delivery and reported within 30 minutes.
5. Any illegal use is forbidden and gets you banned without refund.

Please read before entering the shop.`;

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
  approved: boolean;
};

async function sendSuspended(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    "⛔ <b>Account suspended</b>\n\n" +
      "Your account was flagged by our automated risk system for activity that violates the Luxury Socks terms of service, and access has been suspended.\n\n" +
      "If you believe this is a mistake, contact our concierge and we'll review your case within 24 hours.",
    [[{ text: "◎ Contact support · @luxury_sock", url: "https://t.me/luxury_sock" }]],
  );
}

async function setting(key: string, fallback: number): Promise<number> {
  const { data } = await db().from("settings").select("value").eq("key", key).maybeSingle();
  const n = Number((data as any)?.value);
  return Number.isFinite(n) ? n : fallback;
}

async function stringSetting(key: string): Promise<string> {
  const { data } = await db().from("settings").select("value").eq("key", key).maybeSingle();
  return String((data as any)?.value ?? "").trim();
}

const NP_CURRENCIES: Array<[string, string]> = [
  ["usdttrc20", "USDT · TRC-20"],
  ["usdterc20", "USDT · ERC-20"],
  ["usdtbsc", "USDT · BEP-20"],
  ["ton", "TON"],
  ["btc", "Bitcoin"],
  ["eth", "Ethereum"],
  ["ltc", "Litecoin"],
  ["sol", "Solana"],
  ["trx", "Tron"],
];

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
  return `$${Number(n).toFixed(2)}`;
}

function html(value: unknown) {
  return String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mainMenuKeyboard(): Button[][] {
  return [
    [{ text: "✦ Open store", callback_data: "store" }],
    [{ text: "☏ Virtual numbers", callback_data: "num" }, { text: "⌕ Search proxies", callback_data: "search" }],
    [{ text: "◷ My numbers", callback_data: "nmy" }],
    [{ text: "◈ My account", callback_data: "me" }, { text: "↗ Add funds", callback_data: "topup" }],
    [{ text: "◷ Order history", callback_data: "hist" }, { text: "◇ Referrals", callback_data: "ref" }],
    [
      { text: "◎ IP lookup", callback_data: "checkip" },
      { text: "◉ Socks lookup", callback_data: "checksocks" },
    ],
    [{ text: "House rules", callback_data: "rules" }, { text: "Concierge · @luxury_sock", url: "https://t.me/luxury_sock" } as any],
  ];
}

async function sendMainMenu(chatId: number) {
  await sendMessage(chatId, "💎 <b>LUXURY SOCKS</b>\n<em>Private proxy collection</em>\n\nSelect where you would like to go.", mainMenuKeyboard());
}

const backRow = (data = "menu"): Button[] => [{ text: data === "menu" ? "← Main menu" : "← Categories", callback_data: data }];

export async function handleUpdate(update: any) {
  if (update.callback_query) return handleCallback(update.callback_query);
  const message = update.message ?? update.edited_message;
  if (message?.text) return handleMessage(message);
}

async function askRules(chatId: number) {
  await sendMessage(chatId, RULES, [[{ text: "I accept · Enter shop →", callback_data: "accept" }]]);
}

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text: string = message.text.trim();
  const user = await getUser(message.from);

  if (user.approved === false) return sendSuspended(chatId);

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
      "💎 <b>WELCOME TO LUXURY SOCKS</b>\n<em>Your private proxy collection.</em>\n\n" +
        `Available balance  <b>${money(user.balance)}</b>\nConcierge  @luxury_sock`,
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
    await sendMessage(chatId, `↗ <b>ADD FUNDS</b>\n\nMinimum deposit is <b>${money(min)}</b>. Please enter a higher amount.`);
      return;
    }
    await setState(user.id, { awaiting: null, amount });
    const { data: wallets } = await db().from("wallets").select("*").eq("active", true).order("network");
    const npEnabled = Boolean(await stringSetting("nowpayments_api_key"));
    if (!wallets?.length && !npEnabled) {
      await sendMessage(chatId, "⚠️ Top-ups are temporarily unavailable. Please contact @luxury_sock.", [backRow()]);
      return;
    }
    const rows: Button[][] = [];
    if (npEnabled) rows.push([{ text: "⚡ Automatic crypto payment", callback_data: "npauto" }]);
    for (const w of (wallets ?? []) as any[]) {
      rows.push([{ text: `${w.network} · ${String(w.currency).toUpperCase()} (manual review)`, callback_data: `net:${w.id}` }]);
    }
    rows.push(backRow());
    await sendMessage(chatId, `↗ <b>ADD FUNDS</b>\n\nRequested amount  <b>${money(amount)}</b>\n\nSelect a payment method.`, rows);
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
        "◷ <b>Payment submitted</b>\n\nYour transaction is awaiting review. Your balance will update after the amount received is confirmed.",
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

  if (user.approved === false) return sendSuspended(chatId);

  if (data === "accept") {
    await db().from("bot_users").update({ rules_accepted: true }).eq("id", user.id);
    await sendMessage(chatId, "✦ <b>Welcome in.</b>\nThe collection is ready for you.");
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
      `◇ <b>REFERRALS</b>\n\nEarn <b>${percent}%</b> of each invited customer's credited top-ups.\n\n` +
        `Invited  <b>${count ?? 0}</b>\nEarned  <b>${money(user.referral_earned ?? 0)}</b>\n\n` +
        `Your invitation link\n<code>https://t.me/Proxynvn_bot?start=ref${user.telegram_id}</code>`,
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
      `◈ <b>MY ACCOUNT</b>\n\nAvailable balance  <b>${money(user.balance)}</b>\nOrders placed  <b>${count ?? 0}</b>\nReferral earnings  <b>${money(user.referral_earned ?? 0)}</b>\n\nAccount ID  <code>${user.telegram_id}</code>`,
      [[{ text: "↗ Add funds", callback_data: "topup" }, { text: "◷ Order history", callback_data: "hist" }], backRow()],
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
                `${o.kind === "buy" ? "✦ Proxy" : "◎ IP reveal"} · <b>${money(o.price)}</b>\n${html(o.details)}\n<i>${new Date(o.created_at).toUTCString()}</i>`,
            )
            .join("\n\n")
        : "No orders yet. Your purchases will appear here.";
    await sendMessage(chatId, `◷ <b>ORDER HISTORY</b>\n\n${body}`, [[{ text: "✦ Explore collection", callback_data: "buy" }], backRow()]);
    return;
  }

  if (data === "topup") {
    const min = await setting("min_deposit", 50);
    await setState(user.id, { awaiting: "amount" });
    await sendMessage(chatId, `↗ <b>ADD FUNDS</b>\n\nEnter an amount in USD. Minimum deposit: <b>${money(min)}</b>.`, [backRow()]);
    return;
  }

  if (data === "search") {
    await setState(user.id, { awaiting: "search" });
    await sendMessage(chatId, "⌕ <b>SEARCH INVENTORY</b>\n\nSend a country, city, ZIP code or ISP name.", [backRow()]);
    return;
  }

  if (data === "checkip") {
    await setState(user.id, { awaiting: "checkip" });
    await sendMessage(chatId, "◎ <b>IP LOOKUP</b>\n\nSend an IP address to look up its location and network details.", [backRow()]);
    return;
  }

  if (data === "checksocks") {
    await setState(user.id, { awaiting: "checksocks" });
    await sendMessage(chatId, "◉ <b>SOCKS LOOKUP</b>\n\nSend <code>ip:port:login:pass</code>. This looks up the IP only; it does not test proxy connectivity.", [backRow()]);
    return;
  }

  if (data === "npauto") {
    const amount = Number(user.state?.amount ?? 0);
    if (!amount) {
      await sendMessage(chatId, "Please start the top-up again.", [backRow()]);
      return;
    }
    await sendMessage(
      chatId,
      `⚡ <b>AUTOMATIC PAYMENT</b>\n\nRequested amount  <b>${money(amount)}</b>\n\nSelect a coin. Your balance updates after network confirmation; partial payments are credited at the amount received.`,
      NP_CURRENCIES.map(([code, label]) => [{ text: label, callback_data: `npc:${code}` }]).concat([backRow()]),
    );
    return;
  }

  if (data.startsWith("npc:")) {
    const currency = data.slice(4);
    const amount = Number(user.state?.amount ?? 0);
    if (!amount) {
      await sendMessage(chatId, "Please start the top-up again.", [backRow()]);
      return;
    }
    await createNowpayment(user, chatId, currency, amount);
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
    await sendMessage(chatId, "◷ <b>SUBMIT PAYMENT</b>\n\nSend the transaction hash (TXID) for review.", [backRow()]);
    return;
  }

  if (data === "store") {
    await sendMessage(chatId, "✦ <b>THE STORE</b>\n\nWhat would you like today?", [
      [{ text: "◈ Proxies · private SOCKS5 / HTTP", callback_data: "buy" }],
      [{ text: "☏ Virtual numbers · SMS verification", callback_data: "num" }],
      backRow(),
    ]);
    return;
  }

  if (await handleNumbers(user, chatId, data)) return;

  if (data === "buy") {
    await sendMessage(
      chatId,
      "✦ <b>THE COLLECTION</b>\n\nSelect a proxy category.",
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
      `✦ <b>${html(category)}</b>\n\nSelect a continent.`,
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
      `🌍 <b>${html(continent)}</b>\n\nSelect a country.`,
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
      `📍 <b>${html(country)}</b>\n\nSelect a region.`,
      rows.map((v) => [{ text: v, callback_data: `reg:${v}` }]).concat([backRow("buy")]),
    );
    return;
  }

  if (data.startsWith("reg:")) {
    const region = data.slice(4);
    const state = { ...user.state, region };
    await setState(user.id, state);
    await sendMessage(chatId, "⌕ Finding available proxies…");
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
    await sendMessage(chatId, "<em>End of selection</em>", [backRow("buy")]);
    return;
  }

  if (data.startsWith("per:")) {
    const id = data.split(":")[1]!;
    await sendPeriodMenu(chatId, id);
    return;
  }

  if (data.startsWith("show:") || data.startsWith("buyp:")) {
    const kind = data.startsWith("buyp:") ? "buy" : "reveal";
    const parts = data.split(":");
    const id = parts[1];
    const periodIdx = Number(parts[2] ?? 0);
    await purchase(user, chatId, id!, kind, periodIdx);
    return;
  }
}

export const RENTAL_PERIODS = [
  { label: "1 day", days: 1, multiplier: 1 },
  { label: "3 days", days: 3, multiplier: 1.5 },
  { label: "7 days", days: 7, multiplier: 2.2 },
  { label: "14 days", days: 14, multiplier: 3.2 },
  { label: "1 month", days: 30, multiplier: 5 },
  { label: "3 months", days: 90, multiplier: 15 },
  { label: "6 months", days: 180, multiplier: 25 },
  { label: "1 year", days: 365, multiplier: 49 },
];

function periodPrice(base: number, idx: number) {
  const p = RENTAL_PERIODS[idx] ?? RENTAL_PERIODS[0]!;
  return Math.round(Number(base) * p.multiplier * 100) / 100;
}

async function sendPeriodMenu(chatId: number, proxyId: string) {
  const { data: proxy } = await db().from("proxies").select("*").eq("id", proxyId).maybeSingle();
  if (!proxy || (proxy as any).sold) {
    await sendMessage(chatId, "❌ This proxy is no longer available.", [backRow("buy")]);
    return;
  }
  const p = proxy as any;
  await sendMessage(
    chatId,
    `✦ <b>SELECT YOUR TERM</b>\n\n${html(p.city)}, ${html(p.country)} · ${html(p.isp)}\nStarting at <b>${money(p.price)}</b>\n\nChoose a rental period to purchase.`,
    RENTAL_PERIODS.map((per, i) => [
      {
        text: `${per.label}  ·  ${money(periodPrice(p.price, i))}`,
        callback_data: `buyp:${p.id}:${i}`,
      },
    ]).concat([[{ text: "← Explore collection", callback_data: "buy" }]]),
  );
}

async function sendProxyCard(chatId: number, p: any) {
  await sendMessage(
    chatId,
    `✦ <b>${html(p.category)}</b>\n<code>${html(maskIp(p.ip))}</code>\n\nLocation  <b>${html(p.city)}, ${html(p.country)}</b>\nRegion  ${html(p.region)}\nNetwork  ${html(p.isp)}\nZIP  ${html(p.zip)} · Ping  ${html(p.ping)}\n\nFrom <b>${money(p.price)}</b>`,
    [
      [{ text: `✦ View rental options · from ${money(p.price)}`, callback_data: `per:${p.id}` }],
      [{ text: `◎ Reveal IP · ${money(p.reveal_price)}`, callback_data: `show:${p.id}` }],
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
    await sendMessage(chatId, `⌕ <b>NO MATCHES</b>\n\nNo available proxies matched “${html(term)}”.`, [
      [{ text: "🔎 Search again", callback_data: "search" }],
      backRow(),
    ]);
    return;
  }
  await sendMessage(chatId, `⌕ <b>SEARCH RESULTS</b>\n\n${list.length} available ${list.length === 1 ? "proxy" : "proxies"} for “${html(term)}”.`);
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

async function purchase(
  user: BotUser,
  chatId: number,
  proxyId: string,
  kind: "buy" | "reveal",
  periodIdx = 0,
) {
  const sb = db();
  const { data: proxy } = await sb.from("proxies").select("*").eq("id", proxyId).maybeSingle();
  if (!proxy || (proxy as any).sold) {
    await sendMessage(chatId, "❌ This proxy is no longer available.", [backRow("buy")]);
    return;
  }
  const p = proxy as any;
  const period = RENTAL_PERIODS[periodIdx] ?? RENTAL_PERIODS[0]!;
  const price = Number(kind === "buy" ? periodPrice(p.price, periodIdx) : p.reveal_price);
  const balance = Number(user.balance);
  if (balance < price) {
    await sendMessage(chatId, `◈ <b>INSUFFICIENT BALANCE</b>\n\nPrice  <b>${money(price)}</b>\nAvailable  <b>${money(balance)}</b>`, [
      [{ text: "↗ Add funds", callback_data: "topup" }],
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
    details:
      kind === "buy"
        ? `${p.ip} ${p.city}, ${p.country} · ${period.label}`
        : `${p.ip} ${p.city}, ${p.country}`,
  });

  if (kind === "reveal") {
    await sendMessage(chatId, `◎ <b>IP REVEALED</b>\n\n<code>${html(p.ip)}</code>\n\nRemaining balance  <b>${money(newBalance)}</b>`, [
      [{ text: `✦ View rental options · from ${money(p.price)}`, callback_data: `per:${p.id}` }],
      backRow("buy"),
    ]);
    return;
  }

  const until = new Date(Date.now() + period.days * 86400000).toLocaleDateString();
  await sendMessage(
    chatId,
    `✦ <b>ORDER CONFIRMED</b>\n\nYour proxy credentials\n<code>${html(`${p.ip}:${p.port}:${p.login}:${p.password}`)}</code>\n\nLocation  ${html(p.city)}, ${html(p.country)}\nNetwork  ${html(p.isp)}\nTerm  <b>${period.label}</b> · until ${until}\nRemaining balance  <b>${money(newBalance)}</b>`,
    [backRow()],
  );
}

async function createNowpayment(user: BotUser, chatId: number, currency: string, amount: number) {
  const sb = db();
  const apiKey = await stringSetting("nowpayments_api_key");
  if (!apiKey) {
    await sendMessage(chatId, "⚠️ Automatic payments are not configured yet. Please pick another method.", [backRow()]);
    return;
  }

  const { data: row, error } = await sb
    .from("topups")
    .insert({
      bot_user_id: user.id,
      network: "NOWPayments",
      pay_currency: currency,
      amount_usd: amount,
      provider: "nowpayments",
      status: "waiting",
    })
    .select("id")
    .single();
  if (error) throw error;
  const topupId = (row as any).id as string;

  const callbackBase = (process.env["PUBLIC_APP_URL"] ?? "").replace(/\/$/, "");
  const res = await fetch("https://api.nowpayments.io/v1/payment", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: "usd",
      pay_currency: currency,
      order_id: topupId,
      order_description: "Luxury Socks balance top-up",
      ...(callbackBase ? { ipn_callback_url: `${callbackBase}/api/public/nowpayments/ipn` } : {}),
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body.payment_id) {
    await sb.from("topups").update({ status: "failed", admin_note: JSON.stringify(body).slice(0, 500) }).eq("id", topupId);
    await sendMessage(
      chatId,
      `Payment could not be started right now. Please try another coin or payment method.`,
      [backRow()],
    );
    return;
  }

  await sb
    .from("topups")
    .update({ provider_id: String(body.payment_id), pay_address: body.pay_address ?? null })
    .eq("id", topupId);
  await setState(user.id, { ...user.state, topupId });

  const label = NP_CURRENCIES.find(([c]) => c === currency)?.[1] ?? currency.toUpperCase();
  if (body.pay_address) await sendPhoto(chatId, qrUrl(String(body.pay_address)));
  await sendMessage(
    chatId,
    `⚡ <b>YOUR PAYMENT DETAILS</b>\n\nMethod  ${html(label)}\nRequested  <b>${money(amount)}</b>\nSend  <code>${html(body.pay_amount)} ${html(String(body.pay_currency).toUpperCase())}</code>\n\nAddress\n<code>${html(body.pay_address)}</code>` +
      (body.payin_extra_id ? `\nMemo / tag  <code>${html(body.payin_extra_id)}</code>` : "") +
      `\n\nYour balance updates automatically after confirmation. If you send less, only the value received will be credited.`,
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
    `◈ <b>MANUAL PAYMENT DETAILS</b>\n\nRequested  <b>${money(amount)}</b>\nNetwork  ${html(w.network)}\nCoin  ${html(String(w.currency).toUpperCase())}\n\nAddress\n<code>${html(w.address)}</code>` +
      (w.memo ? `\nMemo / tag  <code>${html(w.memo)}</code>` : "") +
      `\n\nAfter sending, submit your transaction hash below. Your balance updates after the received amount is verified.`,
    [[{ text: "✓ Submit transaction hash", callback_data: "paid" }], backRow()],
  );
}

export async function creditTopupById(topupId: string, creditedUsd?: number) {
  const sb = db();
  const { data: topup } = await sb.from("topups").select("*").eq("id", topupId).maybeSingle();
  if (!topup) return;
  const t = topup as any;
  if (t.credited_at) return;

  const { data: botUser } = await sb.from("bot_users").select("*").eq("id", t.bot_user_id).maybeSingle();
  if (!botUser) return;
  const u = botUser as any;

  const requested = Number(t.amount_usd);
  const received =
    Number.isFinite(Number(creditedUsd)) && Number(creditedUsd) > 0
      ? Math.round(Number(creditedUsd) * 100) / 100
      : requested;
  const short = received + 0.01 < requested;

  const newBalance = Number(u.balance) + received;
  await sb.from("bot_users").update({ balance: newBalance }).eq("id", u.id);
  await sb
    .from("topups")
    .update({
      credited_at: new Date().toISOString(),
      status: "finished",
      amount_usd: received,
      admin_note: short ? `Partial payment: requested ${money(requested)}, received ${money(received)}` : t.admin_note,
    })
    .eq("id", t.id);

  if (u.referred_by) {
    const percent = await setting("referral_percent", 5);
    const bonus = (received * percent) / 100;
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
    short
      ? `⚠️ Partial payment received.\nExpected: <b>${money(requested)}</b>\nReceived: <b>${money(received)}</b>\n💰 New balance: <b>${money(newBalance)}</b>\n\nTop up again to cover the difference.`
      : `✅ Payment received: <b>${money(received)}</b>\n💰 New balance: <b>${money(newBalance)}</b>`,
    [[{ text: "Main menu", callback_data: "menu" }]],
  );
}

export async function creditTopup(providerId: string, status: string, payload?: any) {
  const sb = db();
  const { data: topup } = await sb
    .from("topups")
    .select("id, credited_at, amount_usd, pay_amount")
    .eq("provider_id", providerId)
    .maybeSingle();
  if (!topup) return;
  const t = topup as any;
  await sb.from("topups").update({ status }).eq("id", t.id);
  if (status !== "finished" && status !== "confirmed" && status !== "partially_paid") return;
  if (t.credited_at) return;

  // Work out how much actually landed, in USD.
  let creditedUsd: number | undefined;
  const outcome = Number(payload?.outcome_amount);
  const actuallyPaid = Number(payload?.actually_paid);
  const payAmount = Number(payload?.pay_amount ?? t.pay_amount);
  const priceAmount = Number(payload?.price_amount ?? t.amount_usd);
  if (Number.isFinite(actuallyPaid) && actuallyPaid > 0 && Number.isFinite(payAmount) && payAmount > 0) {
    creditedUsd = (actuallyPaid / payAmount) * priceAmount;
  } else if (Number.isFinite(outcome) && outcome > 0 && String(payload?.outcome_currency ?? "").startsWith("usd")) {
    creditedUsd = outcome;
  }

  await creditTopupById(t.id, creditedUsd);
}

// ================= Virtual numbers =================
import { NUMBER_COUNTRIES, NUMBER_SERVICES, NUMBER_TIERS, generatePhone, numberPrice } from "./numbers";

const PAGE = 14;

function pager(prefix: string, page: number, total: number): Button[] {
  const row: Button[] = [];
  if (page > 0) row.push({ text: "← Prev", callback_data: `${prefix}${page - 1}` });
  if ((page + 1) * PAGE < total) row.push({ text: "Next →", callback_data: `${prefix}${page + 1}` });
  return row;
}

function pairs(buttons: Button[]): Button[][] {
  const out: Button[][] = [];
  for (let i = 0; i < buttons.length; i += 2) out.push(buttons.slice(i, i + 2));
  return out;
}

async function handleNumbers(user: BotUser, chatId: number, data: string): Promise<boolean> {
  if (data === "num" || data.startsWith("nsp:")) {
    const page = data === "num" ? 0 : Number(data.slice(4)) || 0;
    const slice = NUMBER_SERVICES.slice(page * PAGE, (page + 1) * PAGE);
    const rows = pairs(slice.map((s) => ({ text: s.name, callback_data: `ns:${s.id}` })));
    const nav = pager("nsp:", page, NUMBER_SERVICES.length);
    if (nav.length) rows.push(nav);
    rows.push(backRow());
    await sendMessage(
      chatId,
      `☏ <b>VIRTUAL NUMBERS</b>\n<em>One-time SMS verification</em>\n\nChoose the service you need a code for.\nPage ${page + 1} of ${Math.ceil(NUMBER_SERVICES.length / PAGE)}`,
      rows,
    );
    return true;
  }

  if (data.startsWith("ns:") || data.startsWith("ncp:")) {
    const [svcId, pageStr] = data.startsWith("ns:") ? [data.slice(3), "0"] : data.slice(4).split("|");
    const svc = NUMBER_SERVICES.find((s) => s.id === svcId);
    if (!svc) return false;
    const page = Number(pageStr) || 0;
    const slice = NUMBER_COUNTRIES.slice(page * PAGE, (page + 1) * PAGE);
    const rows = pairs(
      slice.map((c) => ({ text: `${c.flag} ${c.name} · ${money(numberPrice(svc.id, c.id, "eco"))}`, callback_data: `nc:${svc.id}:${c.id}` })),
    );
    const nav = pager(`ncp:${svc.id}|`, page, NUMBER_COUNTRIES.length);
    if (nav.length) rows.push(nav);
    rows.push([{ text: "← Services", callback_data: "num" }]);
    await sendMessage(chatId, `☏ <b>${html(svc.name.toUpperCase())}</b>\n\nChoose a country. Prices shown are from.`, rows);
    return true;
  }

  if (data.startsWith("nc:")) {
    const [, svcId, cId] = data.split(":");
    const svc = NUMBER_SERVICES.find((s) => s.id === svcId);
    const c = NUMBER_COUNTRIES.find((x) => x.id === cId);
    if (!svc || !c) return false;
    const stock = 180 + ((svc.base * 1000 + c.dial.length * 97) % 900);
    await sendMessage(
      chatId,
      `☏ <b>${html(svc.name)}</b>  ·  ${c.flag} ${html(c.name)} (+${c.dial})\n\nIn stock  <b>${Math.round(stock)}</b> numbers\n\n` +
        NUMBER_TIERS.map((t) => `<b>${t.label}</b> — ${money(numberPrice(svc.id, c.id, t.id))}\n<em>${t.note}</em>`).join("\n\n") +
        `\n\nNo code received in time? Your balance is refunded.`,
      [
        ...NUMBER_TIERS.map((t) => [{ text: `${t.label} · ${money(numberPrice(svc.id, c.id, t.id))}`, callback_data: `nb:${svc.id}:${c.id}:${t.id}` }]),
        [{ text: "← Countries", callback_data: `ns:${svc.id}` }],
      ],
    );
    return true;
  }

  if (data.startsWith("nb:")) {
    const [, svcId, cId, tierId] = data.split(":");
    const svc = NUMBER_SERVICES.find((s) => s.id === svcId);
    const c = NUMBER_COUNTRIES.find((x) => x.id === cId);
    const tier = NUMBER_TIERS.find((t) => t.id === tierId);
    if (!svc || !c || !tier) return false;
    const price = numberPrice(svc.id, c.id, tier.id);
    const balance = Number(user.balance);
    if (balance < price) {
      await sendMessage(chatId, `◈ <b>INSUFFICIENT BALANCE</b>\n\nPrice  <b>${money(price)}</b>\nAvailable  <b>${money(balance)}</b>`, [
        [{ text: "↗ Add funds", callback_data: "topup" }],
        backRow(),
      ]);
      return true;
    }
    const sb = db();
    const minutes = tier.id === "pro" ? 30 : tier.id === "std" ? 20 : 15;
    const phone = generatePhone(c.id);
    await sb.from("bot_users").update({ balance: balance - price }).eq("id", user.id);
    const { data: order } = await sb
      .from("number_orders")
      .insert({
        bot_user_id: user.id,
        service: svc.name,
        country: c.name,
        tier: tier.label,
        price,
        phone,
        expires_at: new Date(Date.now() + minutes * 60000).toISOString(),
      })
      .select("id")
      .single();
    await sb.from("orders").insert({ bot_user_id: user.id, kind: "number", price, details: `${svc.name} · ${c.name} · ${phone}` });
    await sendMessage(
      chatId,
      `✦ <b>NUMBER ACTIVATED</b>\n\n<code>${phone}</code>\n\nService  ${html(svc.name)}\nCountry  ${c.flag} ${html(c.name)}\nPlan  ${tier.label}\nValid for  <b>${minutes} min</b>\n\nEnter this number in ${html(svc.name)} and request the code. It will appear here automatically.\n\nRemaining balance  <b>${money(balance - price)}</b>`,
      [
        [{ text: "↻ Check for SMS", callback_data: `nrf:${(order as any)?.id}` }],
        [{ text: "✕ Cancel & refund", callback_data: `ncx:${(order as any)?.id}` }],
        backRow(),
      ],
    );
    return true;
  }

  if (data.startsWith("nrf:") || data.startsWith("ncx:")) {
    const id = data.slice(4);
    const sb = db();
    const { data: o } = await sb.from("number_orders").select("*").eq("id", id).eq("bot_user_id", user.id).maybeSingle();
    if (!o) return true;
    const order = o as any;
    if (data.startsWith("ncx:")) {
      if (order.status !== "waiting" || order.code) {
        await sendMessage(chatId, "This number can no longer be cancelled.", [backRow()]);
        return true;
      }
      const { data: done } = await sb.from("number_orders").update({ status: "refunded" }).eq("id", id).eq("status", "waiting").select("id");
      if (done?.length) {
        const { data: fresh } = await sb.from("bot_users").select("balance").eq("id", user.id).single();
        const nb = Number((fresh as any).balance) + Number(order.price);
        await sb.from("bot_users").update({ balance: nb }).eq("id", user.id);
        await sendMessage(chatId, `✕ <b>CANCELLED</b>\n\n${money(order.price)} returned to your balance.\nBalance  <b>${money(nb)}</b>`, [
          [{ text: "☏ Get another number", callback_data: "num" }],
          backRow(),
        ]);
      }
      return true;
    }
    if (order.code) {
      await sendMessage(chatId, `✦ <b>SMS RECEIVED</b>\n\n<code>${html(order.phone)}</code>\nCode  <b><code>${html(order.code)}</code></b>`, [backRow()]);
    } else if (order.status !== "waiting") {
      await sendMessage(chatId, `This number is ${html(order.status)}.`, [backRow()]);
    } else {
      const left = Math.max(0, Math.round((new Date(order.expires_at).getTime() - Date.now()) / 60000));
      await sendMessage(chatId, `◷ <b>WAITING FOR SMS</b>\n\n<code>${html(order.phone)}</code>\nTime left  <b>${left} min</b>`, [
        [{ text: "↻ Check again", callback_data: `nrf:${id}` }],
        [{ text: "✕ Cancel & refund", callback_data: `ncx:${id}` }],
        backRow(),
      ]);
    }
    return true;
  }

  if (data === "nmy") {
    const { data: rows } = await db()
      .from("number_orders")
      .select("*")
      .eq("bot_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const list = (rows ?? []) as any[];
    const body = list.length
      ? list.map((o) => `${html(o.service)} · ${html(o.country)}\n<code>${html(o.phone)}</code> · ${o.code ? `code <b>${html(o.code)}</b>` : html(o.status)}`).join("\n\n")
      : "No numbers yet.";
    await sendMessage(chatId, `◷ <b>MY NUMBERS</b>\n\n${body}`, [
      ...list.filter((o) => o.status === "waiting").slice(0, 3).map((o) => [{ text: `↻ ${o.phone}`, callback_data: `nrf:${o.id}` }]),
      [{ text: "☏ Get a number", callback_data: "num" }],
      backRow(),
    ]);
    return true;
  }

  return false;
}
