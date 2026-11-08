// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /auth/callback/route.ts
// Supabase Auth Code Exchange Route Handler
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember, getCurrentUserRegistration } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';

const CANONICAL_PRODUCTION_ORIGIN = 'https://sic.cielhub.org';

function resolveBaseOrigin(request: NextRequest, requestOrigin: string): string {
  const isLocalEnv = process.env.NODE_ENV === 'development';
  if (isLocalEnv) {
    return requestOrigin;
  }

  // In production, prefer NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SITE_URL),
  // then non-localhost forwarded/host headers, and finally the canonical
  // production domain so production never redirects to localhost:3000.
  const configuredAppUrl = (
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  )?.trim();
  if (configuredAppUrl) {
    try {
      const parsedOrigin = new URL(configuredAppUrl).origin;
      if (!parsedOrigin.includes('localhost') && !parsedOrigin.includes('127.0.0.1')) {
        return parsedOrigin;
      }
    } catch {}
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  if (
    forwardedHost &&
    !forwardedHost.includes('localhost') &&
    !forwardedHost.startsWith('127.0.0.1')
  ) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get('host')?.trim();
  if (host && !host.includes('localhost') && !host.startsWith('127.0.0.1')) {
    return `https://${host}`;
  }

  if (!requestOrigin.includes('localhost') && !requestOrigin.includes('127.0.0.1')) {
    return requestOrigin;
  }

  return CANONICAL_PRODUCTION_ORIGIN;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const roleTarget = searchParams.get('role'); // e.g. 'associate_admin'
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Use the canonical production URL so proxy/forwarded headers cannot
  // accidentally send a production OAuth session back to localhost.
  const baseOrigin = resolveBaseOrigin(request, origin);

  // Helper to validate and sanitize internal redirect paths (prevent open redirects)
  const getValidRedirectPath = (target: string | null, fallback: string = '/dashboard'): string => {
    if (!target) return fallback;
    // Must be a relative path starting with '/', but not protocol-relative ('//') or malformed ('/\\')
    if (
      target.startsWith('/') &&
      !target.startsWith('//') &&
      !target.startsWith('/\\') &&
      !target.includes('://')
    ) {
      return target;
    }
    return fallback;
  };

  const safeNext = getValidRedirectPath(next, '/dashboard');
  const defaultErrorRoute = roleTarget === 'associate_admin' ? '/associate-admin-login' : '/login';

  // Handle OAuth provider error response (e.g. user cancelled or access denied)
  if (errorParam) {
    const errorMsg = errorDescription || errorParam;
    return NextResponse.redirect(`${baseOrigin}${defaultErrorRoute}?error=${encodeURIComponent(errorMsg)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !user) {
      const errorMsg = exchangeError?.message || 'InvalidAuthCode';
      return NextResponse.redirect(`${baseOrigin}${defaultErrorRoute}?error=${encodeURIComponent(errorMsg)}`);
    }

    const member = await getCurrentMember(user);

    // 1. Check if user attempted Associate Admin Login flow
    if (roleTarget === 'associate_admin' || safeNext.startsWith('/associate-admin')) {
      if (!member) {
        return NextResponse.redirect(
          `${baseOrigin}/associate-admin-login?error=UnauthorizedAdmin`
        );
      }

      const isDirectSuper =
        member.org_role === 'SUPER_ADMIN' ||
        member.org_role === 'SIC_DIRECTOR' ||
        member.org_role === 'SIC_ADMIN';

      if (!isDirectSuper) {
        const scope = await getAssociateAdminScope(member.id);
        if (!scope.isAuthorized) {
          return NextResponse.redirect(
            `${baseOrigin}/associate-admin-login?error=UnauthorizedAdmin`
          );
        }
      }

      return NextResponse.redirect(`${baseOrigin}/associate-admin/dashboard`);
    }

    // 2. Existing approved member access
    if (member) {
      if (member.status === 'SUSPENDED') {
        return NextResponse.redirect(`${baseOrigin}/registration-status?status=SUSPENDED`);
      }
      return NextResponse.redirect(`${baseOrigin}${safeNext}`);
    }

    // 3. Not an approved member -> inspect registration status
    const registration = await getCurrentUserRegistration(user.id);

    if (!registration) {
      // First-time user: redirect to Registration Form
      return NextResponse.redirect(`${baseOrigin}/register`);
    }

    if (registration.status === 'APPROVED') {
      return NextResponse.redirect(`${baseOrigin}${safeNext}`);
    }

    if (registration.status === 'NEEDS_CORRECTION') {
      return NextResponse.redirect(`${baseOrigin}/register?correction=true`);
    }

    // For PENDING, REJECTED, SUSPENDED -> show status screen
    return NextResponse.redirect(`${baseOrigin}/registration-status`);
  }

  // Return user to login with error parameter if code is missing
  return NextResponse.redirect(`${baseOrigin}${defaultErrorRoute}?error=MissingAuthCode`);
}
