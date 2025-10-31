-- Seguridad NeuroCore: habilitar RLS y políticas consistentes
-- Idempotente para entorno de desarrollo

-- Añadir client_id donde aplica
alter table if exists nc_inventory_items
  add column if not exists client_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_nc_inventory_client on nc_inventory_items(client_id);

alter table if exists nc_sales_orders
  add column if not exists client_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_nc_sales_client on nc_sales_orders(client_id);

alter table if exists nc_customers
  add column if not exists client_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_nc_customers_client on nc_customers(client_id);

-- nc_sync_status: RLS básico (alcance global por servicio); mantener esquema actual
alter table if exists nc_sync_status enable row level security;
drop policy if exists "read sync status" on nc_sync_status;
create policy "read sync status" on nc_sync_status
  for select to authenticated
  using (true);

-- Inventario items
alter table if exists nc_inventory_items enable row level security;
drop policy if exists "read own items" on nc_inventory_items;
create policy "read own items" on nc_inventory_items
  for select to authenticated
  using (client_id is null or client_id = auth.uid());
drop policy if exists "insert own items" on nc_inventory_items;
create policy "insert own items" on nc_inventory_items
  for insert to authenticated
  with check (client_id = auth.uid());
drop policy if exists "update own items" on nc_inventory_items;
create policy "update own items" on nc_inventory_items
  for update to authenticated
  using (client_id = auth.uid());
drop policy if exists "delete own items" on nc_inventory_items;
create policy "delete own items" on nc_inventory_items
  for delete to authenticated
  using (client_id = auth.uid());

-- Ventas
alter table if exists nc_sales_orders enable row level security;
drop policy if exists "read own sales" on nc_sales_orders;
create policy "read own sales" on nc_sales_orders
  for select to authenticated
  using (client_id = auth.uid());
drop policy if exists "insert own sales" on nc_sales_orders;
create policy "insert own sales" on nc_sales_orders
  for insert to authenticated
  with check (client_id = auth.uid());

-- Clientes
alter table if exists nc_customers enable row level security;
drop policy if exists "read own customers" on nc_customers;
create policy "read own customers" on nc_customers
  for select to authenticated
  using (client_id = auth.uid());
drop policy if exists "upsert own customers" on nc_customers;
create policy "upsert own customers" on nc_customers
  for insert to authenticated
  with check (client_id = auth.uid());
create policy "update own customers" on nc_customers
  for update to authenticated
  using (client_id = auth.uid());

-- Alertas inventario
alter table if exists nc_inventory_alerts enable row level security;
drop policy if exists "read own alerts" on nc_inventory_alerts;
create policy "read own alerts" on nc_inventory_alerts
  for select to authenticated
  using (created_by = auth.uid());
drop policy if exists "insert own alerts" on nc_inventory_alerts;
create policy "insert own alerts" on nc_inventory_alerts
  for insert to authenticated
  with check (created_by = auth.uid());

-- Notificaciones
alter table if exists nc_notifications enable row level security;
drop policy if exists "read own notifications" on nc_notifications;
create policy "read own notifications" on nc_notifications
  for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "insert own notifications" on nc_notifications;
create policy "insert own notifications" on nc_notifications
  for insert to authenticated
  with check (user_id = auth.uid());

-- Paquetes/Combos: completar políticas de actualización/eliminación
alter table if exists nc_package_definitions enable row level security;
drop policy if exists "update own packages" on nc_package_definitions;
create policy "update own packages" on nc_package_definitions
  for update to authenticated
  using (client_id = auth.uid());
drop policy if exists "delete own packages" on nc_package_definitions;
create policy "delete own packages" on nc_package_definitions
  for delete to authenticated
  using (client_id = auth.uid());

alter table if exists nc_combo_headers enable row level security;
drop policy if exists "update own combos" on nc_combo_headers;
create policy "update own combos" on nc_combo_headers
  for update to authenticated
  using (client_id = auth.uid());
drop policy if exists "delete own combos" on nc_combo_headers;
create policy "delete own combos" on nc_combo_headers
  for delete to authenticated
  using (client_id = auth.uid());

alter table if exists nc_combo_items enable row level security;
drop policy if exists "insert combo items via combo ownership" on nc_combo_items;
create policy "insert combo items via combo ownership" on nc_combo_items
  for insert to authenticated
  with check (exists (
    select 1 from nc_combo_headers ch
    where ch.id = combo_id and ch.client_id = auth.uid()
  ));
drop policy if exists "update combo items via combo ownership" on nc_combo_items;
create policy "update combo items via combo ownership" on nc_combo_items
  for update to authenticated
  using (exists (
    select 1 from nc_combo_headers ch
    where ch.id = combo_id and ch.client_id = auth.uid()
  ));
drop policy if exists "delete combo items via combo ownership" on nc_combo_items;
create policy "delete combo items via combo ownership" on nc_combo_items
  for delete to authenticated
  using (exists (
    select 1 from nc_combo_headers ch
    where ch.id = combo_id and ch.client_id = auth.uid()
  ));

-- Exports audit ya protegido en schema base
-- Customer services ya protegido en schema base

-- Fin