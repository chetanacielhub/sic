// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Browser Client
// ============================================================================

import { createBrowserClient } from '@supabase/ssr';

const CANONICAL_SUPABASE_URL = 'https://oovusdcssgdspizneqjr.supabase.co';
const CANONICAL_PUBLISHABLE_KEY = 'sb_publishable_ixP2ffMebEOuzOYooyoiIw_1jQb12s2';

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '');
  const url =
    !rawUrl || rawUrl.includes('hgnwtuabvbtfgxpwvqdn')
      ? CANONICAL_SUPABASE_URL
      : rawUrl;

  const rawPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, '');
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '');
  const candidateKey = rawPub || rawAnon || '';
  const key =
    !candidateKey ||
    candidateKey.includes('dummy') ||
    candidateKey.includes('placeholder') ||
    candidateKey.startsWith('sb_secret_')
      ? CANONICAL_PUBLISHABLE_KEY
      : candidateKey;

  return createBrowserClient(url, key);
}
