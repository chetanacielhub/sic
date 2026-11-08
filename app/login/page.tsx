// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /login
// Institutional Login & Supabase Auth Entry Point
// ============================================================================

'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck,
  CheckCircle2,
  Users,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const urlError = searchParams.get('error');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlError) {
      if (urlError === 'InvalidAuthCode') {
        setError('Authentication code expired or invalid. Please sign in again.');
      } else {
        setError(decodeURIComponent(urlError));
      }
    }
  }, [urlError]);

  const supabase = createClient();

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      // Clear any stale PKCE code-verifier cookies from earlier failed/cross-origin attempts
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const name = cookie.split('=')[0]?.trim();
          if (name && name.includes('code-verifier')) {
            document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
          }
        });
      }

      const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
      const isProdHost =
        process.env.NODE_ENV === 'production' ||
        (typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1');
      const appOrigin = isProdHost
        ? configuredAppUrl || 'https://sic.cielhub.org'
        : window.location.origin;
      const callbackPath =
        redirectTo && redirectTo !== '/dashboard'
          ? `/auth/callback?next=${encodeURIComponent(redirectTo)}`
          : '/auth/callback';
      const redirectUrl = `${appOrigin}${callbackPath}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        if (
          oauthError.message?.toLowerCase().includes('not enabled') || 
          oauthError.message?.toLowerCase().includes('unsupported provider')
        ) {
          setError(
            'Google OAuth is not enabled yet in this Supabase project. Please enable Google provider in your Supabase dashboard (Authentication > Providers > Google).'
          );
        } else {
          setError(oauthError.message || 'Failed to initialize Google Sign-In.');
        }
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during Google sign-in.';
      setError(msg);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-6 sm:py-8 px-3 sm:px-4">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8 space-y-5 sm:space-y-6">
        {/* Branding & Welcome Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white font-bold text-xl shadow-md mb-3">
            SIC
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your SIC Innovation project, live sessions, and attendance operations.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Google OAuth Login */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full min-h-[48px] py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] touch-manipulation"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="h-4 w-4 shrink-0" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Protected by Supabase Auth &amp; PostgreSQL RLS</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
