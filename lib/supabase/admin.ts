// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Privileged Admin Client (server-only; bypasses RLS when service key is set)
// ============================================================================

import 'server-only';
import { createClient as createBaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oovusdcssgdspizneqjr.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_ixP2ffMebEOuzOYooyoiIw_1jQb12s2';

  return createBaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
