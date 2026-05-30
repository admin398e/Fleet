-- 0003_storage_buckets.sql — private photo storage + object RLS
-- Bucket is PRIVATE (location-tagged delivery photos are sensitive); the app
-- serves images via short-TTL signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-photos',
  'delivery-photos',
  false,
  5 * 1024 * 1024, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Path convention: addresses/{address_id}/{uuid}.jpg
-- Shared read for authenticated users; insert attributed to the uploader;
-- delete only your own objects.
create policy "delivery_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-photos');

create policy "delivery_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'delivery-photos' and owner = auth.uid());

create policy "delivery_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'delivery-photos' and owner = auth.uid());
