create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text not null unique default upper(substr(md5(random()::text), 1, 6)),
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.grupo_membros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  user_id uuid not null,
  email text,
  primary key (grupo_id, user_id)
);
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  tipo text not null check (tipo in ('credito','debito','aplicacao','resgate')),
  descricao text not null,
  valor numeric(12,2) not null,
  data date not null default current_date,
  pago boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.feira_itens (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  nome text not null,
  qtd numeric(10,2) not null default 1,
  preco numeric(12,2) not null default 0,
  pego boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.grupos, public.grupo_membros, public.lancamentos, public.feira_itens to authenticated;
grant all on public.grupos, public.grupo_membros, public.lancamentos, public.feira_itens to service_role;

alter table public.grupos enable row level security;
alter table public.grupo_membros enable row level security;
alter table public.lancamentos enable row level security;
alter table public.feira_itens enable row level security;

create or replace function public.e_membro(_grupo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.grupo_membros where grupo_id = _grupo and user_id = auth.uid())
$$;

create policy "membros veem grupo" on public.grupos for select to authenticated using (public.e_membro(id));
create policy "membros veem membros" on public.grupo_membros for select to authenticated using (public.e_membro(grupo_id));
create policy "membro sai" on public.grupo_membros for delete to authenticated using (user_id = auth.uid());
create policy "membros lancamentos" on public.lancamentos for all to authenticated using (public.e_membro(grupo_id)) with check (public.e_membro(grupo_id));
create policy "membros feira" on public.feira_itens for all to authenticated using (public.e_membro(grupo_id)) with check (public.e_membro(grupo_id));

create or replace function public.criar_grupo(_nome text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  insert into public.grupos (nome, criado_por) values (_nome, auth.uid()) returning id into g;
  insert into public.grupo_membros (grupo_id, user_id, email) values (g, auth.uid(), auth.jwt()->>'email');
  return g;
end $$;

create or replace function public.entrar_grupo(_codigo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  select id into g from public.grupos where codigo = upper(trim(_codigo));
  if g is null then raise exception 'Código inválido'; end if;
  insert into public.grupo_membros (grupo_id, user_id, email) values (g, auth.uid(), auth.jwt()->>'email') on conflict do nothing;
  return g;
end $$;

revoke execute on function public.criar_grupo(text), public.entrar_grupo(text), public.e_membro(uuid) from anon, public;
grant execute on function public.criar_grupo(text), public.entrar_grupo(text), public.e_membro(uuid) to authenticated;

alter publication supabase_realtime add table public.lancamentos, public.feira_itens;