// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Browser Client
// ============================================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oovusdcssgdspizneqjr.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_ixP2ffMebEOuzOYooyoiIw_1jQb12s2';

  return createBrowserClient(url, key);
}
