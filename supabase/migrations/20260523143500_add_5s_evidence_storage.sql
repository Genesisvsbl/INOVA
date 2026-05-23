insert into storage.buckets (id, name, public)
values ('evidencias-5s', 'evidencias-5s', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read evidencias 5S" on storage.objects;
create policy "Public read evidencias 5S"
on storage.objects for select
using (bucket_id = 'evidencias-5s');

drop policy if exists "Authenticated upload evidencias 5S" on storage.objects;
create policy "Authenticated upload evidencias 5S"
on storage.objects for insert
with check (bucket_id = 'evidencias-5s');

drop policy if exists "Authenticated update evidencias 5S" on storage.objects;
create policy "Authenticated update evidencias 5S"
on storage.objects for update
using (bucket_id = 'evidencias-5s')
with check (bucket_id = 'evidencias-5s');

drop policy if exists "Authenticated delete evidencias 5S" on storage.objects;
create policy "Authenticated delete evidencias 5S"
on storage.objects for delete
using (bucket_id = 'evidencias-5s');
