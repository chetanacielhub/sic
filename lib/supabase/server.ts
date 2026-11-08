// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Server Client (App Router & Route Handlers)
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const CANONICAL_SUPABASE_URL = 'https://oovusdcssgdspizneqjr.supabase.co';
const CANONICAL_PUBLISHABLE_KEY = 'sb_publishable_ixP2ffMebEOuzOYooyoiIw_1jQb12s2';

function resolveSupabasePublicConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '');
  const url =
    !rawUrl || rawUrl.includes('hgnwtuabvbtfgxpwvqdn')
      ? CANONICAL_SUPABASE_URL
      : rawUrl;

  const rawPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, '');
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '');

  const candidateKey = rawPub || rawAnon || '';
  const isStaleKey =
    !candidateKey ||
    candidateKey.includes('dummy') ||
    candidateKey.includes('placeholder') ||
    candidateKey.startsWith('sb_secret_');

  return {
    url,
    key: isStaleKey ? CANONICAL_PUBLISHABLE_KEY : candidateKey,
  };
}

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = resolveSupabasePublicConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
