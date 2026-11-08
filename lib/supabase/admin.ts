// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Privileged Admin Client (server-only; bypasses RLS intentionally)
// ============================================================================

import 'server-only';
import { createClient as createBaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL. Configure it in Vercel and redeploy.');
  }

  if (!serviceRoleKey) {
    // Never silently fall back to a publishable/anon key. Doing so causes privileged
    // admin operations to fail under RLS and can mask broken production configuration.
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Configure the server-only secret in Vercel and redeploy.'
    );
  }

  return createBaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
