// ============================================================================
// SIC Unified Attendance & Operations Management System
// Next.js Middleware: Route Protection & Supabase Auth Session Refresh
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgnwtuabvbtfgxpwvqdn.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_development';

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

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 1. API Route Handling (NEVER redirect API routes to HTML login pages)
  if (pathname.startsWith('/api/')) {
    const isPublicApi =
      pathname.startsWith('/api/auth') ||
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

  // 3. Public Web Pages
  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/sic/check-in' ||
    pathname.includes('/qr') ||
    pathname.includes('/live');

  // If unauthenticated and accessing a protected UI page, redirect to /login
  if (!user && !isPublicPage) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If already authenticated and accessing login or forgot-password, redirect to /dashboard
  if (user && (pathname === '/login' || pathname === '/forgot-password')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
