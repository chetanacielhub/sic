// ============================================================================
// SIC Unified Attendance & Operations Management System
// Next.js Middleware: Route Protection & Supabase Auth Session Refresh
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getPublicOrigin(request: NextRequest): string {
  if (process.env.NODE_ENV === 'development') {
    return request.nextUrl.origin;
  }

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
    const proto = host.includes(':') ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  return 'https://sic.cielhub.org';
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const publicOrigin = getPublicOrigin(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oovusdcssgdspizneqjr.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_ixP2ffMebEOuzOYooyoiIw_1jQb12s2';

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;

  // If Supabase OAuth redirected to root /?code=... instead of /auth/callback, forward to /auth/callback
  if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
    return NextResponse.redirect(
      new URL(`/auth/callback${request.nextUrl.search}`, publicOrigin)
    );
  }

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. API Route Handling (NEVER redirect API routes to HTML login pages)
  if (pathname.startsWith('/api/')) {
    const isPublicApi =
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/sic/academic') ||
      pathname === '/api/sic/attendance/check-in' ||
      pathname === '/api/sic/members' ||
      pathname === '/api/sic/groups' ||
      pathname.endsWith('/qr') ||
      pathname.endsWith('/attendance');

    if (!user && !isPublicApi) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication session required' },
        { status: 401 }
      );
    }

    return supabaseResponse;
  }

  // 2. Static and system assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  // 3. Root index handling: start with /login if unauthenticated, or /dashboard if authenticated
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', publicOrigin));
    }
    return NextResponse.redirect(new URL('/login', publicOrigin));
  }

  // 4. Public Web Pages
  const isPublicPage =
    pathname === '/login' ||
    pathname === '/associate-admin-login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/sic/check-in' ||
    pathname.includes('/qr') ||
    pathname.includes('/live');

  // If unauthenticated and accessing a protected UI page
  if (!user && !isPublicPage) {
    // If accessing associate admin dashboard without login, redirect to associate admin login
    if (pathname.startsWith('/associate-admin')) {
      const redirectUrl = new URL('/associate-admin-login', publicOrigin);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = new URL('/login', publicOrigin);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated user tries to access /login or /forgot-password
  if (user && (pathname === '/login' || pathname === '/forgot-password')) {
    return NextResponse.redirect(new URL('/dashboard', publicOrigin));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
