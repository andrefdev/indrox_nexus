-- NeuroCore – Inventario con paquetes/combos
-- Migración inicial para soporte de PRODUCTO_SIMPLE, PAQUETE_FIJO y COMBO_MIXTO

-- Tipo enumerado para item_type
do $$
begin
  if not exists (select 1 from pg_type where typname = 'nc_item_type_enum') then
    create type nc_item_type_enum as enum ('PRODUCTO_SIMPLE','PAQUETE_FIJO','COMBO_MIXTO');
  end if;
end
$$;

-- Alterar inventario base para soportar: item_type y unit_price
alter table if exists nc_inventory_items
  add column if not exists item_type nc_item_type_enum not null default 'PRODUCTO_SIMPLE';

alter table if exists nc_inventory_items
  add column if not exists unit_price numeric;

-- Feature flags / entitlements para combos
create table if not exists nc_feature_flags (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  feature_code text not null check (feature_code in ('NC_INVENTORY_COMBOS')),
  enabled boolean not null default false,
  created_at timestamptz default now(),
  unique (client_id, feature_code)
);

-- Paquetes fijos (mismo producto, cantidad fija, precio fijo)
create table if not exists nc_package_definitions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  base_item_id uuid not null references nc_inventory_items(id) on delete restrict,
  quantity_included integer not null check (quantity_included > 0),
  package_price numeric not null check (package_price >= 0),
  consume_stock boolean not null default true,
  currency text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_nc_package_client on nc_package_definitions(client_id);
create index if not exists idx_nc_package_base_item on nc_package_definitions(base_item_id);

-- Combos mixtos (cabecera)
create table if not exists nc_combo_headers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  combo_name text not null,
  combo_price numeric not null check (combo_price >= 0),
  currency text not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_nc_combo_client on nc_combo_headers(client_id);
create index if not exists idx_nc_combo_active on nc_combo_headers(is_active);

-- Combos mixtos (componentes)
create table if not exists nc_combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references nc_combo_headers(id) on delete cascade,
  component_item_id uuid not null references nc_inventory_items(id) on delete restrict,
  component_qty integer not null check (component_qty > 0),
  consume_stock boolean not null default true
);
create index if not exists idx_nc_combo_items_combo on nc_combo_items(combo_id);
create index if not exists idx_nc_combo_items_component on nc_combo_items(component_item_id);

-- Movimientos de inventario (incluye explosión de combos)
create table if not exists nc_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('ventas','ajuste','combo')),
  item_id uuid not null references nc_inventory_items(id) on delete restrict,
  qty integer not null,
  exploded_from_item_id uuid references nc_combo_headers(id) on delete set null,
  components_consumed jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_nc_mov_client on nc_inventory_movements(client_id);
create index if not exists idx_nc_mov_source on nc_inventory_movements(source);
create index if not exists idx_nc_mov_item on nc_inventory_movements(item_id);

-- RLS (mínimo) para lectura propia por cliente
alter table nc_feature_flags enable row level security;
drop policy if exists "read own features" on nc_feature_flags;
create policy "read own features" on nc_feature_flags
  for select to authenticated
  using (auth.uid() = client_id);
drop policy if exists "insert own features" on nc_feature_flags;
create policy "insert own features" on nc_feature_flags
  for insert to authenticated
  with check (auth.uid() = client_id);

alter table nc_package_definitions enable row level security;
drop policy if exists "read own packages" on nc_package_definitions;
create policy "read own packages" on nc_package_definitions
  for select to authenticated
  using (auth.uid() = client_id);
drop policy if exists "insert own packages" on nc_package_definitions;
create policy "insert own packages" on nc_package_definitions
  for insert to authenticated
  with check (auth.uid() = client_id);

alter table nc_combo_headers enable row level security;
drop policy if exists "read own combos" on nc_combo_headers;
create policy "read own combos" on nc_combo_headers
  for select to authenticated
  using (auth.uid() = client_id);
drop policy if exists "insert own combos" on nc_combo_headers;
create policy "insert own combos" on nc_combo_headers
  for insert to authenticated
  with check (auth.uid() = client_id);

alter table nc_combo_items enable row level security;
drop policy if exists "read combo items via combo ownership" on nc_combo_items;
create policy "read combo items via combo ownership" on nc_combo_items
  for select to authenticated
  using (exists (
    select 1 from nc_combo_headers ch
    where ch.id = combo_id and ch.client_id = auth.uid()
  ));

alter table nc_inventory_movements enable row level security;
drop policy if exists "read own movements" on nc_inventory_movements;
create policy "read own movements" on nc_inventory_movements
  for select to authenticated
  using (auth.uid() = client_id);