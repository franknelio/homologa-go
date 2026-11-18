-- Biblioteca de equipamentos (módulos e inversores já usados), uma por usuário
create table if not exists public.equipamentos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('m','i')),
  chave text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, tipo, chave)
);
alter table public.equipamentos enable row level security;
create policy "equipamentos ver os proprios" on public.equipamentos for select to authenticated using (user_id = (select auth.uid()));
create policy "equipamentos criar os proprios" on public.equipamentos for insert to authenticated with check (user_id = (select auth.uid()));
create policy "equipamentos alterar os proprios" on public.equipamentos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "equipamentos excluir os proprios" on public.equipamentos for delete to authenticated using (user_id = (select auth.uid()));
