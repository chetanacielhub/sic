// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Browser Client
// ============================================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgnwtuabvbtfgxpwvqdn.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_development';

  return createBrowserClient(url, key);
}
