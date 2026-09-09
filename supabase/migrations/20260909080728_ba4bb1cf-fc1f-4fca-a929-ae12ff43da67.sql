
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.bot_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL UNIQUE,
  username text,
  first_name text,
  balance numeric(12,4) NOT NULL DEFAULT 0,
  approved boolean NOT NULL DEFAULT true,
  rules_accepted boolean NOT NULL DEFAULT false,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_users TO authenticated;
GRANT ALL ON public.bot_users TO service_role;
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot users" ON public.bot_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.proxies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  continent text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  city text NOT NULL,
  isp text NOT NULL,
  ip text NOT NULL,
  port integer NOT NULL DEFAULT 8080,
  login text NOT NULL DEFAULT 'user',
  password text NOT NULL DEFAULT 'pass',
  ping integer NOT NULL DEFAULT 50,
  zip text NOT NULL,
  reveal_price numeric(10,4) NOT NULL DEFAULT 0.11,
  price numeric(10,4) NOT NULL DEFAULT 0.65,
  sold boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proxies_lookup ON public.proxies (category, continent, country, region, sold);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proxies TO authenticated;
GRANT ALL ON public.proxies TO service_role;
ALTER TABLE public.proxies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage proxies" ON public.proxies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id uuid NOT NULL REFERENCES public.bot_users(id) ON DELETE CASCADE,
  proxy_id uuid REFERENCES public.proxies(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'buy',
  price numeric(10,4) NOT NULL DEFAULT 0,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON public.orders (bot_user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id uuid NOT NULL REFERENCES public.bot_users(id) ON DELETE CASCADE,
  network text NOT NULL,
  pay_currency text NOT NULL,
  amount_usd numeric(12,4) NOT NULL,
  pay_amount numeric(24,8),
  pay_address text,
  status text NOT NULL DEFAULT 'waiting',
  provider text NOT NULL DEFAULT 'nowpayments',
  provider_id text UNIQUE,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_topups_user ON public.topups (bot_user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topups TO authenticated;
GRANT ALL ON public.topups TO service_role;
ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage topups" ON public.topups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Demo stock
INSERT INTO public.proxies (category, continent, country, region, city, isp, ip, port, login, password, ping, zip, reveal_price, price)
SELECT
  c.category,
  l.continent, l.country, l.region, l.city, l.isp,
  (10 + floor(random()*230))::int || '.' || floor(random()*255)::int || '.' || floor(random()*255)::int || '.' || floor(random()*255)::int,
  (8000 + floor(random()*2000))::int,
  'lux' || substr(md5(random()::text), 1, 6),
  substr(md5(random()::text), 1, 10),
  (15 + floor(random()*110))::int,
  l.zip,
  0.11,
  round((0.45 + random()*0.9)::numeric, 2)
FROM (VALUES
  ('North America','United States','California','Fresno','Rocks Computer Services. LLC','93702'),
  ('North America','United States','Kentucky','Louisville','T-mobile Usa, Inc.','40202'),
  ('North America','United States','Georgia','Atlanta','Starlink','30334'),
  ('North America','United States','Ohio','Cleveland','T-mobile Usa, Inc.','44113'),
  ('North America','United States','New Jersey','Mount Holly','Comcast Ip Services, L.L.C.','08060'),
  ('North America','United States','Alaska','Anchorage','General Communication, Inc.','99501'),
  ('North America','United States','Alaska','Fairbanks','General Communication, Inc.','99701'),
  ('North America','United States','Texas','Houston','AT&T Internet Services','77002'),
  ('North America','Canada','Ontario','Toronto','Bell Canada','M5H'),
  ('North America','Mexico','Jalisco','Guadalajara','Uninet S.A. de C.V.','44100'),
  ('Europe','Germany','Bavaria','Munich','Deutsche Telekom AG','80331'),
  ('Europe','United Kingdom','England','London','British Telecommunications','EC1A'),
  ('Europe','France','Ile-de-France','Paris','Orange S.A.','75001'),
  ('Europe','Netherlands','North Holland','Amsterdam','KPN B.V.','1011'),
  ('Europe','Spain','Madrid','Madrid','Telefonica de Espana','28001'),
  ('Europe','Poland','Masovia','Warsaw','Orange Polska','00-001'),
  ('Asia','Japan','Tokyo','Tokyo','NTT Communications','100-0001'),
  ('Asia','Singapore','Central','Singapore','Singtel Fibre','018956'),
  ('Asia','India','Maharashtra','Mumbai','Reliance Jio','400001'),
  ('Asia','Indonesia','Jakarta','Jakarta','PT Telkom Indonesia','10110'),
  ('Africa','Kenya','Nairobi','Nairobi','Safaricom Limited','00100'),
  ('Africa','South Africa','Gauteng','Johannesburg','Vodacom','2000'),
  ('Africa','Nigeria','Lagos','Lagos','MTN Nigeria','100001'),
  ('Africa','Egypt','Cairo','Cairo','TE Data','11511'),
  ('South America','Brazil','Sao Paulo','Sao Paulo','Claro NXT','01000'),
  ('South America','Argentina','Buenos Aires','Buenos Aires','Telecom Argentina','1001'),
  ('South America','Colombia','Bogota','Bogota','ETB','110111'),
  ('Oceania','Australia','New South Wales','Sydney','Telstra Limited','2000'),
  ('Oceania','Australia','Victoria','Melbourne','Optus','3000'),
  ('Oceania','New Zealand','Auckland','Auckland','Spark NZ','1010')
) AS l(continent, country, region, city, isp, zip)
CROSS JOIN (VALUES
  ('Luxury proxy'), ('Fresh Proxy'), ('Smart proxy'), ('OUTLET PROXY'), ('Turbo proxy'), ('PREMIUM PROXY'), ('UNIVERSAL PROXY')
) AS c(category)
CROSS JOIN generate_series(1, 4);
