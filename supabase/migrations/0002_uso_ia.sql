-- Limite diário de leituras por IA, por usuário (usado por api/_uso.js)
create table if not exists public.uso_ia (
  uid uuid not null references auth.users(id) on delete cascade,
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  n int not null default 0,
  primary key (uid, dia)
);
alter table public.uso_ia enable row level security;
drop policy if exists "uso_ia le o proprio" on public.uso_ia;
create policy "uso_ia le o proprio" on public.uso_ia for select to authenticated using (uid = (select auth.uid()));

-- soma 1 e devolve o total do dia; devolve -1 quando o limite já foi atingido
create or replace function public.conta_uso_ia(limite int)
returns int language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); d date := (now() at time zone 'America/Sao_Paulo')::date; v int;
begin
  if u is null then raise exception 'sem login'; end if;
  insert into public.uso_ia(uid, dia, n) values (u, d, 1)
    on conflict (uid, dia) do update set n = public.uso_ia.n + 1
    where public.uso_ia.n < limite
  returning n into v;
  return coalesce(v, -1);
end $$;
revoke all on function public.conta_uso_ia(int) from public, anon;
grant execute on function public.conta_uso_ia(int) to authenticated;
