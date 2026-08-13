-- ENFOQUE DE JUEGO — esquema, permisos y almacenamiento.
-- Ejecutá el archivo completo una sola vez en Supabase > SQL Editor > Run.
-- Nunca pegues una service_role key en el frontend.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('customer', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  logo_path text,
  cover_path text,
  description text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  opponent text,
  event_date date not null,
  event_time time,
  venue text,
  description text,
  cover_path text,
  default_price_ars integer not null default 5000 check (default_price_ars >= 0),
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  file_name text not null,
  photo_code text not null unique,
  price_ars integer not null check (price_ars >= 0),
  preview_path text not null,
  original_path text not null,
  mime_type text,
  original_extension text,
  alt_text text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text,
  whatsapp text,
  email text,
  notes text,
  total_ars integer not null check (total_ars >= 0),
  status text not null default 'new' check (status in ('new', 'contacted', 'paid', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  photo_id uuid references public.photos(id) on delete set null,
  photo_code text,
  price_ars integer not null check (price_ars >= 0),
  created_at timestamptz not null default now(),
  unique(order_id, photo_id)
);

-- Permite pedidos rápidos por WhatsApp sin pedir datos que ya aparecen en el chat.
-- También actualiza instalaciones que ejecutaron una versión anterior del esquema.
alter table public.orders alter column customer_name drop not null;
alter table public.orders alter column whatsapp drop not null;
alter table public.orders alter column email drop not null;

create index if not exists events_public_date_idx on public.events (published, event_date desc);
create index if not exists events_club_idx on public.events (club_id, event_date desc);
create index if not exists photos_event_public_idx on public.photos (event_id, published, created_at);
create index if not exists order_items_order_idx on public.order_items (order_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists clubs_updated_at on public.clubs;
create trigger clubs_updated_at before update on public.clubs for each row execute procedure public.set_updated_at();
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events for each row execute procedure public.set_updated_at();
drop trigger if exists photos_updated_at on public.photos;
create trigger photos_updated_at before update on public.photos for each row execute procedure public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

-- Se crea automáticamente un perfil cuando agregás usuarios desde Authentication.
create or replace function public.handle_new_user()
returns trigger security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Esta función mira el rol sin exponer la tabla profiles a visitantes.
create or replace function public.is_admin()
returns boolean stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists clubs_public_read on public.clubs;
create policy clubs_public_read on public.clubs for select to anon, authenticated using (published or public.is_admin());
drop policy if exists clubs_admin_write on public.clubs;
create policy clubs_admin_write on public.clubs for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events for select to anon, authenticated using ((published and exists (select 1 from public.clubs c where c.id = club_id and c.published)) or public.is_admin());
drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists photos_public_read on public.photos;
create policy photos_public_read on public.photos for select to anon, authenticated using ((published and exists (select 1 from public.events e join public.clubs c on c.id = e.club_id where e.id = event_id and e.published and c.published)) or public.is_admin());
drop policy if exists photos_admin_write on public.photos;
create policy photos_admin_write on public.photos for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders for select to authenticated using (public.is_admin());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items for select to authenticated using (public.is_admin());

-- El checkout usa esta única puerta de entrada: valida que las fotos sean
-- públicas y calcula el total en la base, nunca con valores del navegador.
drop function if exists public.create_customer_order(text, text, text, text, uuid[]);
create or replace function public.create_customer_order(p_photo_ids uuid[])
returns jsonb
security definer set search_path = public
language plpgsql as $$
declare
  v_order_id uuid;
  v_order_number bigint;
  v_total integer;
  v_found integer;
  v_requested integer;
begin
  if p_photo_ids is null or cardinality(p_photo_ids) = 0 then
    raise exception 'Seleccioná al menos una fotografía.';
  end if;
  select cardinality(array(select distinct unnest(p_photo_ids))) into v_requested;
  select count(*), coalesce(sum(p.price_ars), 0)::integer into v_found, v_total
  from public.photos p join public.events e on e.id = p.event_id join public.clubs c on c.id = e.club_id
  where p.id = any(p_photo_ids) and p.published = true and e.published = true and c.published = true;
  if v_found <> v_requested then
    raise exception 'Una o más fotos ya no están disponibles. Actualizá el carrito.';
  end if;
  insert into public.orders (total_ars)
  values (v_total)
  returning id, order_number into v_order_id, v_order_number;
  insert into public.order_items (order_id, photo_id, photo_code, price_ars)
  select v_order_id, id, photo_code, price_ars from public.photos where id = any(p_photo_ids);
  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;
revoke all on function public.create_customer_order(uuid[]) from public;
grant execute on function public.create_customer_order(uuid[]) to anon, authenticated;
notify pgrst, 'reload schema';

-- previews es público únicamente porque contiene imágenes reducidas y con marca.
-- originals es privado: ni siquiera una URL adivinada permite descargarlo.
insert into storage.buckets (id, name, public) values ('previews', 'previews', true)
on conflict (id) do update set public = excluded.public;
insert into storage.buckets (id, name, public) values ('originals', 'originals', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists previews_public_read on storage.objects;
create policy previews_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'previews');
drop policy if exists previews_admin_manage on storage.objects;
create policy previews_admin_manage on storage.objects for all to authenticated using (bucket_id = 'previews' and public.is_admin()) with check (bucket_id = 'previews' and public.is_admin());
drop policy if exists originals_admin_manage on storage.objects;
create policy originals_admin_manage on storage.objects for all to authenticated using (bucket_id = 'originals' and public.is_admin()) with check (bucket_id = 'originals' and public.is_admin());

-- DESPUÉS de crear el usuario administrador en Authentication > Users, ejecutá:
-- update public.profiles set role = 'admin' where email = 'tu-email@ejemplo.com';
