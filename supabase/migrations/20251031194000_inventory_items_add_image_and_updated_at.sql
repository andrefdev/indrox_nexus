-- Inventario: columnas faltantes para imagen y timestamp de actualización
-- Soluciona errores 500 cuando API selecciona/inserta image_url y updated_at

alter table if exists nc_inventory_items
  add column if not exists image_url text;

alter table if exists nc_inventory_items
  add column if not exists updated_at timestamptz default now();