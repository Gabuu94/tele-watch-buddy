CREATE TABLE public.number_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id uuid NOT NULL REFERENCES public.bot_users(id) ON DELETE CASCADE,
  service text NOT NULL,
  country text NOT NULL,
  tier text NOT NULL DEFAULT 'standard',
  price numeric NOT NULL DEFAULT 0,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  code text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.number_orders TO authenticated;
GRANT ALL ON public.number_orders TO service_role;
ALTER TABLE public.number_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage number orders" ON public.number_orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));