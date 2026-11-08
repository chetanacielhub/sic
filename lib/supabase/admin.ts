// ============================================================================
// SIC Unified Attendance & Operations Management System
// Supabase Privileged Admin Client (server-only; PostgreSQL persistence)
// ============================================================================

import 'server-only';
import { createClient as createBaseClient } from '@supabase/supabase-js';
import { createClient as createServerSessionClient } from './server';

const CANONICAL_SUPABASE_URL = 'https://oovusdcssgdspizneqjr.supabase.co';
const CANONICAL_PUBLISHABLE_KEY = 'sb_publishable_ixP2ffMebEOuzOYooyoiIw_1jQb12s2';

declare global {
  var __sic_invalid_service_keys: Set<string> | undefined;
}

function sanitizeEnvValue(val?: string | null): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

function getCanonicalSupabaseUrl(): string {
  const envUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!envUrl || envUrl.includes('hgnwtuabvbtfgxpwvqdn')) {
    return CANONICAL_SUPABASE_URL;
  }
  return envUrl;
}

function getCanonicalPublishableKey(): string {
  const pub = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (pub && !pub.includes('dummy')) return pub;

  const anon = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (anon && !anon.includes('dummy') && !anon.includes('hgnwtuabvbtfgxpwvqdn')) {
    return anon;
  }

  return CANONICAL_PUBLISHABLE_KEY;
}

function extractProjectRef(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

/**
 * Validates whether a configured SUPABASE_SERVICE_ROLE_KEY is structurally valid
 * and belongs to the active Supabase project URL.
 */
export function isValidServiceRoleKey(url: string, key?: string | null): boolean {
  const cleanKey = sanitizeEnvValue(key);
  if (!cleanKey) return false;

  if (globalThis.__sic_invalid_service_keys?.has(cleanKey)) {
    return false;
  }

  const lower = cleanKey.toLowerCase();
  if (
    lower.includes('dummy') ||
    lower.includes('placeholder') ||
    lower.includes('your-') ||
    lower.includes('your_') ||
    cleanKey.startsWith('sb_publishable_')
  ) {
    return false;
  }

  if (cleanKey.startsWith('sb_secret_')) {
    return cleanKey.length > 20;
  }

  // Legacy Supabase JWT format (header.payload.signature)
  const parts = cleanKey.split('.');
  if (parts.length === 3 && cleanKey.startsWith('eyJ')) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as { role?: string; ref?: string };
      if (payload.role && payload.role !== 'service_role') {
        return false;
      }
      const expectedRef = extractProjectRef(url);
      if (payload.ref && expectedRef && payload.ref !== expectedRef) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Creates the server-only Supabase PostgreSQL client.
 * - Uses SUPABASE_SERVICE_ROLE_KEY when a valid secret key for the project is configured.
 * - If SUPABASE_SERVICE_ROLE_KEY in the environment is missing, belongs to an old project,
 *   or is rejected by Supabase with HTTP 401 ("Invalid API key"), transparently authenticates
 *   the PostgreSQL request using the verified server-side user session JWT under RLS.
 */
export function createAdminClient() {
  const url = getCanonicalSupabaseUrl();
  const publishableKey = getCanonicalPublishableKey();
  const rawServiceKey = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasCandidateServiceKey = isValidServiceRoleKey(url, rawServiceKey);

  const initialKey = hasCandidateServiceKey ? rawServiceKey : publishableKey;

  const serverAdminFetch: typeof fetch = async (input, init) => {
    const canTryServiceKey =
      hasCandidateServiceKey && !globalThis.__sic_invalid_service_keys?.has(rawServiceKey);

    if (canTryServiceKey) {
      const response = await fetch(input, init);
      if (response.status !== 401) {
        return response;
      }

      // Check if Supabase rejected SUPABASE_SERVICE_ROLE_KEY with "Invalid API key"
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        if (text.includes('Invalid API key')) {
          if (!globalThis.__sic_invalid_service_keys) {
            globalThis.__sic_invalid_service_keys = new Set();
          }
          globalThis.__sic_invalid_service_keys.add(rawServiceKey);
          console.warn(
            '[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY was rejected with "Invalid API key". Retrying with verified server session JWT under PostgreSQL RLS.'
          );
        } else {
          return response;
        }
      } catch {
        return response;
      }
    }

    // Execute PostgreSQL query using the valid publishable key + authenticated user's JWT from server cookies
    let accessToken: string | null = null;
    try {
      const sessionClient = await createServerSessionClient();
      const {
        data: { session },
      } = await sessionClient.auth.getSession();
      accessToken = session?.access_token || null;
    } catch {}

    const headers = new Headers(init?.headers);
    headers.set('apikey', publishableKey);
    headers.set('Authorization', `Bearer ${accessToken || publishableKey}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  return createBaseClient(url, initialKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: serverAdminFetch,
    },
  });
}
