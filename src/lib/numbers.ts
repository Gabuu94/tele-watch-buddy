// Virtual number catalog: services, countries and the three price tiers.
// Base prices reflect typical 2026 activation market rates (USD, USA baseline).

export const NUMBER_SERVICES: Array<{ id: string; name: string; base: number }> = [
  { id: "tg", name: "Telegram", base: 0.95 },
  { id: "wa", name: "WhatsApp", base: 0.85 },
  { id: "go", name: "Google / Gmail / YouTube", base: 0.3 },
  { id: "fb", name: "Facebook", base: 0.22 },
  { id: "ig", name: "Instagram", base: 0.2 },
  { id: "tw", name: "X (Twitter)", base: 0.18 },
  { id: "tt", name: "TikTok", base: 0.2 },
  { id: "sc", name: "Snapchat", base: 0.16 },
  { id: "dc", name: "Discord", base: 0.18 },
  { id: "ms", name: "Microsoft / Outlook", base: 0.14 },
  { id: "ap", name: "Apple ID", base: 0.25 },
  { id: "am", name: "Amazon", base: 0.22 },
  { id: "oa", name: "OpenAI / ChatGPT", base: 0.3 },
  { id: "cl", name: "Claude / Anthropic", base: 0.3 },
  { id: "pp", name: "PayPal", base: 0.45 },
  { id: "cb", name: "Coinbase", base: 0.55 },
  { id: "bn", name: "Binance", base: 0.5 },
  { id: "bb", name: "Bybit", base: 0.4 },
  { id: "kr", name: "Kraken", base: 0.4 },
  { id: "rv", name: "Revolut", base: 0.5 },
  { id: "wi", name: "Wise", base: 0.45 },
  { id: "ca", name: "Cash App", base: 0.6 },
  { id: "ve", name: "Venmo", base: 0.55 },
  { id: "ub", name: "Uber", base: 0.15 },
  { id: "ly", name: "Lyft", base: 0.18 },
  { id: "dd", name: "DoorDash", base: 0.2 },
  { id: "ab", name: "Airbnb", base: 0.2 },
  { id: "tn", name: "Tinder", base: 0.35 },
  { id: "bu", name: "Bumble", base: 0.3 },
  { id: "hi", name: "Hinge", base: 0.3 },
  { id: "li", name: "LinkedIn", base: 0.2 },
  { id: "vi", name: "Viber", base: 0.2 },
  { id: "we", name: "WeChat", base: 0.9 },
  { id: "ln", name: "LINE", base: 0.25 },
  { id: "sg", name: "Signal", base: 0.25 },
  { id: "yh", name: "Yahoo", base: 0.12 },
  { id: "nf", name: "Netflix", base: 0.12 },
  { id: "sp", name: "Spotify", base: 0.1 },
  { id: "st", name: "Steam", base: 0.15 },
  { id: "eb", name: "eBay", base: 0.18 },
  { id: "et", name: "Etsy", base: 0.18 },
  { id: "sh", name: "Shopify", base: 0.16 },
  { id: "al", name: "AliExpress / Alibaba", base: 0.12 },
  { id: "tm", name: "Temu", base: 0.12 },
  { id: "ot", name: "OfferUp", base: 0.25 },
  { id: "cr", name: "Craigslist", base: 0.25 },
  { id: "gv", name: "Google Voice", base: 0.7 },
  { id: "tx", name: "Textnow", base: 0.2 },
  { id: "tc", name: "Twitch", base: 0.12 },
  { id: "rd", name: "Reddit", base: 0.1 },
  { id: "pi", name: "Pinterest", base: 0.1 },
  { id: "qu", name: "Quora", base: 0.08 },
  { id: "ya", name: "Yandex", base: 0.12 },
  { id: "vk", name: "VK", base: 0.15 },
  { id: "ok", name: "OK.ru", base: 0.1 },
  { id: "mm", name: "Mamba", base: 0.1 },
  { id: "bo", name: "Booking.com", base: 0.15 },
  { id: "gr", name: "Grab", base: 0.2 },
  { id: "bt", name: "Bolt", base: 0.15 },
  { id: "ne", name: "Nike", base: 0.15 },
  { id: "ad", name: "Adidas", base: 0.12 },
  { id: "zo", name: "Zoom", base: 0.1 },
  { id: "sl", name: "Skype", base: 0.1 },
  { id: "ot2", name: "Any other service", base: 0.2 },
];

export const NUMBER_COUNTRIES: Array<{ id: string; name: string; flag: string; dial: string; len: number; mult: number }> = [
  { id: "us", name: "United States", flag: "🇺🇸", dial: "1", len: 10, mult: 1 },
  { id: "ca", name: "Canada", flag: "🇨🇦", dial: "1", len: 10, mult: 0.9 },
  { id: "gb", name: "United Kingdom", flag: "🇬🇧", dial: "44", len: 10, mult: 0.95 },
  { id: "de", name: "Germany", flag: "🇩🇪", dial: "49", len: 11, mult: 1.1 },
  { id: "fr", name: "France", flag: "🇫🇷", dial: "33", len: 9, mult: 0.95 },
  { id: "nl", name: "Netherlands", flag: "🇳🇱", dial: "31", len: 9, mult: 1 },
  { id: "es", name: "Spain", flag: "🇪🇸", dial: "34", len: 9, mult: 0.85 },
  { id: "it", name: "Italy", flag: "🇮🇹", dial: "39", len: 10, mult: 0.85 },
  { id: "pl", name: "Poland", flag: "🇵🇱", dial: "48", len: 9, mult: 0.6 },
  { id: "se", name: "Sweden", flag: "🇸🇪", dial: "46", len: 9, mult: 1 },
  { id: "au", name: "Australia", flag: "🇦🇺", dial: "61", len: 9, mult: 1.1 },
  { id: "br", name: "Brazil", flag: "🇧🇷", dial: "55", len: 11, mult: 0.45 },
  { id: "mx", name: "Mexico", flag: "🇲🇽", dial: "52", len: 10, mult: 0.45 },
  { id: "co", name: "Colombia", flag: "🇨🇴", dial: "57", len: 10, mult: 0.4 },
  { id: "in", name: "India", flag: "🇮🇳", dial: "91", len: 10, mult: 0.35 },
  { id: "id", name: "Indonesia", flag: "🇮🇩", dial: "62", len: 11, mult: 0.3 },
  { id: "ph", name: "Philippines", flag: "🇵🇭", dial: "63", len: 10, mult: 0.35 },
  { id: "vn", name: "Vietnam", flag: "🇻🇳", dial: "84", len: 9, mult: 0.35 },
  { id: "th", name: "Thailand", flag: "🇹🇭", dial: "66", len: 9, mult: 0.4 },
  { id: "my", name: "Malaysia", flag: "🇲🇾", dial: "60", len: 9, mult: 0.45 },
  { id: "ng", name: "Nigeria", flag: "🇳🇬", dial: "234", len: 10, mult: 0.35 },
  { id: "ke", name: "Kenya", flag: "🇰🇪", dial: "254", len: 9, mult: 0.35 },
  { id: "za", name: "South Africa", flag: "🇿🇦", dial: "27", len: 9, mult: 0.45 },
  { id: "eg", name: "Egypt", flag: "🇪🇬", dial: "20", len: 10, mult: 0.35 },
  { id: "tr", name: "Turkey", flag: "🇹🇷", dial: "90", len: 10, mult: 0.45 },
  { id: "ua", name: "Ukraine", flag: "🇺🇦", dial: "380", len: 9, mult: 0.4 },
  { id: "kz", name: "Kazakhstan", flag: "🇰🇿", dial: "7", len: 10, mult: 0.35 },
  { id: "il", name: "Israel", flag: "🇮🇱", dial: "972", len: 9, mult: 0.9 },
];

export const NUMBER_TIERS = [
  { id: "eco", label: "Economy", note: "Shared pool · 1 SMS · 15 min", mult: 1 },
  { id: "std", label: "Standard", note: "Fresh number · 1 SMS · 20 min", mult: 1.7 },
  { id: "pro", label: "Premium", note: "Private, never used · multi-SMS · 30 min", mult: 2.8 },
] as const;

export function numberPrice(serviceId: string, countryId: string, tierId: string) {
  const s = NUMBER_SERVICES.find((x) => x.id === serviceId);
  const c = NUMBER_COUNTRIES.find((x) => x.id === countryId);
  const t = NUMBER_TIERS.find((x) => x.id === tierId);
  if (!s || !c || !t) return 0;
  return Math.max(0.1, Math.round(s.base * c.mult * t.mult * 100) / 100);
}

const US_AREA = ["212", "305", "310", "312", "347", "404", "415", "469", "512", "602", "646", "702", "713", "718", "786", "818", "917", "929"];

export function generatePhone(countryId: string) {
  const c = NUMBER_COUNTRIES.find((x) => x.id === countryId) ?? NUMBER_COUNTRIES[0]!;
  const digit = () => Math.floor(Math.random() * 10);
  let local = "";
  if (c.dial === "1") {
    local = US_AREA[Math.floor(Math.random() * US_AREA.length)]! + String(2 + Math.floor(Math.random() * 8));
    while (local.length < 10) local += digit();
  } else {
    local = c.id === "gb" ? "7" : String(1 + Math.floor(Math.random() * 9));
    while (local.length < c.len) local += digit();
  }
  return `+${c.dial}${local}`;
}
