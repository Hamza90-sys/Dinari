# Backend (Supabase)

This folder contains backend assets for Dinari.

## Files
- `supabase/schema.sql`: PostgreSQL schema, RLS policies, RPC functions, and storage policies.

## Setup
1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Create an admin profile row by updating your user role to `admin` in `profiles`.

## Frontend connection
Set these in `Frontend/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`