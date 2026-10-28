-- Projetos de homologação, um conjunto por usuário (RLS).
create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text,
  uc text,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

create index if not exists projetos_user_atualizado on public.projetos (user_id, atualizado_em desc);

alter table public.projetos enable row level security;

create policy "ver os próprios projetos" on public.projetos
  for select using (user_id = auth.uid());
create policy "criar os próprios projetos" on public.projetos
  for insert with check (user_id = auth.uid());
create policy "alterar os próprios projetos" on public.projetos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "excluir os próprios projetos" on public.projetos
  for delete using (user_id = auth.uid());
