// A real Postgres (PGlite) with every migration applied in order, plus minimal stand-ins for what
// Supabase provides: roles, auth.users, auth.uid(), the storage schema.
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema auth, storage to authenticated, service_role;
  grant execute on function auth.uid() to authenticated, service_role;
  grant select, insert, delete on storage.objects to authenticated;
`;

// Supabase's default privileges: set before the migrations run, so a migration's own `revoke` sticks.
const DEFAULT_PRIVILEGES = `
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export async function freshDb() {
  const db = await PGlite.create({ extensions: { pg_trgm } });
  await db.exec(SUPABASE_STUBS);
  await db.exec(DEFAULT_PRIVILEGES);
  for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  return db;
}

/** Runs a query as a signed-in user (or signed out with null), the way Supabase does. */
export async function as(db, user, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ""}', false); set role authenticated;`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}
