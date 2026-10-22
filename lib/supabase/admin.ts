// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Privileged Admin Client (Server-Only, Bypasses RLS where necessary)
// ============================================================================

import { createClient as createBaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgnwtuabvbtfgxpwvqdn.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_development';

  return createBaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
