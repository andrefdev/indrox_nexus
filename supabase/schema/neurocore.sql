-- NeuroCore Schema (Inventario, Ventas, Clientes)
-- Ejecutar en Supabase: SQL Editor o CLI de migraciones.

-- Roles de usuario (Admin Cliente / Usuario Cliente)
create table if not exists nc_user_roles (
  user_id uuid primary key,
  role text not null check (role in ('Admin Cliente','Usuario Cliente')),
  created_at timestamp with time zone default now()
);

-- Estado de sincronización por módulo
create table if not exists nc_sync_status (
  module_code text primary key,
  last_sync_at timestamp with time zone not null default now()
);

-- Inventario
create table if not exists nc_inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  name text not null,
  category text not null,
  warehouse text not null,
  status text not null,
  stock integer not null default 0,
  min_stock_threshold integer not null default 0,
  rotation_rate numeric,
  image_url text,
  updated_at timestamp with time zone default now()
);
create index if not exists idx_nc_inventory_category on nc_inventory_items(category);
create index if not exists idx_nc_inventory_warehouse on nc_inventory_items(warehouse);
create index if not exists idx_nc_inventory_status on nc_inventory_items(status);

-- Alertas de inventario (quiebre)
create table if not exists nc_inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  threshold integer not null,
  channel text not null check (channel in ('portal','email')),
  active boolean not null default true,
  created_at timestamp with time zone default now(),
  foreign key (created_by) references auth.users(id) on delete cascade
);

-- Ventas (órdenes simplificadas)
create table if not exists nc_sales_orders (
  id uuid primary key default gen_random_uuid(),
  date timestamp with time zone not null,
  channel text not null,
  product_id text not null,
  qty integer not null default 1,
  total_amount numeric not null,
  currency text not null,
  customer_id text,
  created_at timestamp with time zone default now()
);
create index if not exists idx_nc_sales_date on nc_sales_orders(date);
create index if not exists idx_nc_sales_channel on nc_sales_orders(channel);

-- Clientes y métricas agregadas
create table if not exists nc_customers (
  id text primary key,
  name text not null,
  email text,
  phone text,
  segment text not null check (segment in ('nuevo','activo','inactivo')),
  last_purchase_at timestamp with time zone,
  ltv numeric,
  churn_rate numeric,
  purchase_frequency numeric,
  updated_at timestamp with time zone default now()
);
create index if not exists idx_nc_customers_segment on nc_customers(segment);

-- Auditoría de exportaciones
create table if not exists nc_exports_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module_code text not null,
  format text not null,
  filters jsonb,
  record_count integer not null,
  created_at timestamp with time zone default now(),
  foreign key (user_id) references auth.users(id) on delete cascade
);
create index if not exists idx_nc_exports_user on nc_exports_audit(user_id);

-- Notificaciones (portal/email)
create table if not exists nc_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  module_code text not null,
  level text not null check (level in ('info','warning','error')),
  message text not null,
  created_at timestamp with time zone default now(),
  read_at timestamp with time zone,
  foreign key (user_id) references auth.users(id) on delete set null
);

-- RLS y políticas (ejemplo mínimo)
alter table nc_user_roles enable row level security;
drop policy if exists "roles by self" on nc_user_roles;
create policy "roles by self" on nc_user_roles
  for select
  using (auth.uid() = user_id);

alter table nc_exports_audit enable row level security;
drop policy if exists "exports by self" on nc_exports_audit;
create policy "exports by self" on nc_exports_audit
  for select
  using (auth.uid() = user_id);
drop policy if exists "insert exports" on nc_exports_audit;
create policy "insert exports" on nc_exports_audit
  for insert
  with check (auth.uid() = user_id);

-- Ajustar políticas adicionales según necesidades de seguridad.

-- Servicios contratados por cliente
create table if not exists nc_customer_services (
  user_id uuid not null,
  service_code text not null check (service_code in ('buildpro','neurocore')),
  active boolean not null default true,
  created_at timestamp with time zone default now(),
  primary key (user_id, service_code)
);
create index if not exists idx_nc_customer_services_user on nc_customer_services(user_id);

alter table nc_customer_services enable row level security;
drop policy if exists "read own active services" on nc_customer_services;
create policy "read own active services" on nc_customer_services
  for select
  to authenticated
  using (auth.uid() = user_id and active = true);