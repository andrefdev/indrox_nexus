-- Add image_url field to combo headers and package definitions

-- Agregar columna image_url a paquetes fijos
alter table if exists nc_package_definitions
  add column if not exists image_url text;

-- Agregar columna image_url a combos mixtos (cabecera)
alter table if exists nc_combo_headers
  add column if not exists image_url text;

-- Nota: RLS existente permite lectura/edición con base en client_id; no se requieren cambios de políticas.
-- This field stores a public URL to the image. Upload handling is done at app level.

begin;

alter table public.nc_combo_headers
  add column if not exists image_url text;

alter table public.nc_package_definitions
  add column if not exists image_url text;

comment on column public.nc_combo_headers.image_url is 'Public image URL (PNG/JPEG/WebP). Optional.';
comment on column public.nc_package_definitions.image_url is 'Public image URL (PNG/JPEG/WebP). Optional.';

commit;