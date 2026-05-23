grant select, insert, update, delete on table "5s".subbodegas_5s to anon, authenticated;
grant usage, select on all sequences in schema "5s" to anon, authenticated;
grant all on table "5s".subbodegas_5s to service_role;
grant all on all sequences in schema "5s" to service_role;