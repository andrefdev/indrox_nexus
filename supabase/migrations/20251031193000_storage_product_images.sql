-- Storage: bucket para imágenes de productos y políticas RLS
-- Ejecutar en Supabase (SQL editor o CLI): crea bucket y permite
-- lectura pública y escritura por usuarios autenticados (dueños).

-- Crear bucket público si no existe
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Políticas: lectura pública en el bucket
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images" on storage.objects
  for select
  using (bucket_id = 'product-images');

-- Políticas: insertar solo autenticados y dueños
drop policy if exists "authenticated insert own product-images" on storage.objects;
create policy "authenticated insert own product-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and owner = auth.uid());

-- Políticas: actualizar solo autenticados y dueños
drop policy if exists "authenticated update own product-images" on storage.objects;
create policy "authenticated update own product-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and owner = auth.uid());

-- Políticas: borrar solo autenticados y dueños
drop policy if exists "authenticated delete own product-images" on storage.objects;
create policy "authenticated delete own product-images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and owner = auth.uid());