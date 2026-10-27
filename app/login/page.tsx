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
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your institutional email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message || 'Invalid credentials. Please verify your email and password.');
        return;
      }

      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during sign-in.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo account quick filler for testing convenience
  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPassword2027!');
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        {/* Branding & Welcome Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white font-bold text-xl shadow-md mb-3">
            SIC
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
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
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
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

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              or institutional email
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" /> Institutional Email
            </label>
            <input
              type="email"
              required
              placeholder="e.g. director@sic.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" /> Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <span>Authenticating Session...</span>
            ) : (
              <>
                Sign In to Dashboard <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>


        {/* Quick Identity Selector (Evaluation & Testing Helper) */}
        <div className="pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Users className="h-3 w-3" /> Quick Test Identities:
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => fillDemoAccount('director@sic.internal')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100"
            >
              <div className="font-bold text-slate-800">Super Admin</div>
              <div className="text-slate-400 truncate">director@sic.internal</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('aarav.patel@sic.internal')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100"
            >
              <div className="font-bold text-slate-800">Project Admin</div>
              <div className="text-slate-400 truncate">aarav.patel@...</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('bhavna.rao@sic.internal')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100"
            >
              <div className="font-bold text-slate-800">Group Lead</div>
              <div className="text-slate-400 truncate">bhavna.rao@...</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('divya.nair@sic.internal')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100"
            >
              <div className="font-bold text-slate-800">Member</div>
              <div className="text-slate-400 truncate">divya.nair@...</div>
            </button>
          </div>
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
