# SIC Unified Attendance & Operations Management System
## Deployment & Environment Configuration Guide

---

### 1. Environment Variables Configuration

Create a `.env.local` file in the project root:
```env
# -------------------------------------------------------------
# Supabase Configuration
# -------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://hgnwtuabvbtfgxpwvqdn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# -------------------------------------------------------------
# Privileged Service Role (Server-Only, NEVER expose in browser)
# -------------------------------------------------------------
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# -------------------------------------------------------------
# SIC Security & Cryptographic Rotation Secret
# -------------------------------------------------------------
# Must be a 32+ character random string for HMAC generation
SIC_QR_SECRET_KEY=sic_jwt_hmac_secret_key_rotating_token_2027_ciel

# -------------------------------------------------------------
# Application URL
# -------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 2. Database Migration Deployment
1. Run migrations in order using Supabase SQL Editor or Supabase CLI:
   * `supabase/migrations/20261022000000_sic_initial_schema.sql`
   * `supabase/migrations/20261022000001_sic_rls_policies.sql`
   * `supabase/migrations/20261022000002_sic_attendance_functions.sql`
2. Optional Development Seeding:
   * `supabase/seed.sql` (Creates test groups: Group A, Group B, and Members 1, 2, 3, 4, 6 for end-to-end verification).

---

### 3. Vercel Deployment Instructions
1. Import repository `https://github.com/chetanacielhub/sic.git` to Vercel.
2. Select Framework Preset: **Next.js**.
3. Configure Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SIC_QR_SECRET_KEY`).
4. Build Command: `npm run build`.
5. Deploy and verify Realtime WebSocket connection on `/sic/sessions/[id]/live`.
