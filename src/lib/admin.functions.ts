import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    return { isAdmin: Boolean(data), adminCount: count ?? 0 };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [users, proxies, available, orders, topups] = await Promise.all([
      supabaseAdmin.from("bot_users").select("*").order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("proxies").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("proxies").select("id", { count: "exact", head: true }).eq("sold", false),
      supabaseAdmin
        .from("orders")
        .select("id, kind, price, details, created_at, bot_users(telegram_id, username)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("topups")
        .select("id, network, amount_usd, status, created_at, bot_users(telegram_id, username)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const revenue = (orders.data ?? []).reduce((sum: number, o: any) => sum + Number(o.price), 0);

    return {
      users: (users.data ?? []) as any[],
      orders: (orders.data ?? []) as any[],
      topups: (topups.data ?? []) as any[],
      stats: {
        userCount: (users.data ?? []).length,
        proxyCount: proxies.count ?? 0,
        availableCount: available.count ?? 0,
        revenue,
      },
    };
  });

export const adjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { botUserId: string; amount: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user, error } = await supabaseAdmin
      .from("bot_users")
      .select("balance")
      .eq("id", data.botUserId)
      .single();
    if (error) throw new Error(error.message);
    const next = Number((user as any).balance) + Number(data.amount);
    const { error: updateError } = await supabaseAdmin
      .from("bot_users")
      .update({ balance: next })
      .eq("id", data.botUserId);
    if (updateError) throw new Error(updateError.message);
    return { balance: next };
  });
