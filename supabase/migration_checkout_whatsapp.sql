-- CHECKOUT SIMPLE POR WHATSAPP
-- Ejecutá este archivo UNA VEZ si ya habías ejecutado schema.sql antes.
-- Supabase > SQL Editor > New query > pegar este archivo completo > Run.

alter table public.orders alter column customer_name drop not null;
alter table public.orders alter column whatsapp drop not null;
alter table public.orders alter column email drop not null;

drop function if exists public.create_customer_order(text, text, text, text, uuid[]);
drop function if exists public.create_customer_order(uuid[]);

create function public.create_customer_order(p_photo_ids uuid[])
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
  from public.photos p
  join public.events e on e.id = p.event_id
  join public.clubs c on c.id = e.club_id
  where p.id = any(p_photo_ids) and p.published = true and e.published = true and c.published = true;

  if v_found <> v_requested then
    raise exception 'Una o más fotos ya no están disponibles. Actualizá el carrito.';
  end if;

  insert into public.orders (total_ars) values (v_total)
  returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, photo_id, photo_code, price_ars)
  select v_order_id, id, photo_code, price_ars from public.photos where id = any(p_photo_ids);

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;

revoke all on function public.create_customer_order(uuid[]) from public;
grant execute on function public.create_customer_order(uuid[]) to anon, authenticated;

-- Hace que la API de Supabase detecte la función nueva inmediatamente.
notify pgrst, 'reload schema';
