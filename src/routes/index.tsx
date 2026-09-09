import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luxury Socks — Telegram proxy rental shop" },
      {
        name: "description",
        content:
          "High-quality proxy rental run entirely inside Telegram: crypto balance top-ups, country-by-country stock and instant delivery.",
      },
      { property: "og:title", content: "Luxury Socks — Telegram proxy rental shop" },
      {
        property: "og:description",
        content: "Crypto balance top-ups, country-by-country proxy stock and instant delivery inside Telegram.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features = [
  { title: "Crypto balance", body: "Top up in TON, TRC-20, ERC-20, POLYGON or BEP-20. Balance credits itself once the network confirms." },
  { title: "Pick by location", body: "Category, continent, country and region — every listing shows ISP, city, ping and ZIP." },
  { title: "Instant delivery", body: "Reveal an IP for a few cents or buy it outright and get the login line right away." },
  { title: "Shop admin", body: "Stock, customers, orders and top-ups on one page, with manual balance adjustments." },
];

function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Telegram bot</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight">💎 Luxury Socks 💎</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          A complete proxy rental shop that lives inside Telegram — balance top-ups in crypto, browsable stock by
          country and instant delivery.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/admin">Open shop admin</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <CardTitle className="text-base">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
