// ============================================================================
// SIC Unified Attendance & Operations Management System
// API: /auth/callback/route.ts
// Supabase Auth Code Exchange Route Handler
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember, getCurrentUserRegistration } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const roleTarget = searchParams.get('role'); // e.g. 'associate_admin'
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Use the canonical production URL so proxy/forwarded headers cannot
  // accidentally send a production OAuth session back to localhost.
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const baseOrigin = isLocalEnv
    ? origin
    : configuredAppUrl
      ? new URL(configuredAppUrl).origin
      : forwardedHost
        ? `https://${forwardedHost}`
        : origin;

  // Helper to validate and sanitize internal redirect paths (prevent open redirects)
  const getValidRedirectPath = (target: string | null, fallback: string = '/dashboard'): string => {
    if (!target) return fallback;
    if (
      target.startsWith('/') &&
      !target.startsWith('//') &&
      !target.startsWith('/\\\\') &&
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
      return NextResponse.redirect(`${baseOrigin}/register`);
    }

    if (registration.status === 'APPROVED') {
      return NextResponse.redirect(`${baseOrigin}${safeNext}`);
    }

    if (registration.status === 'NEEDS_CORRECTION') {
      return NextResponse.redirect(`${baseOrigin}/register?correction=true`);
    }

    return NextResponse.redirect(`${baseOrigin}/registration-status`);
  }

  return NextResponse.redirect(`${baseOrigin}${defaultErrorRoute}?error=MissingAuthCode`);
}
