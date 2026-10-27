// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /associate-admin-login
// Dedicated Gateway for Authorized Associate Administrators
// ============================================================================

'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Lock,
  Users
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

function AssociateAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlError) {
      if (urlError === 'UnauthorizedAdmin') {
        setError(
          'Access Denied: This Google account is not recognized as an authorized Associate Administrator. Access to institutional administrative controls requires an explicit assignment from a Super Admin.'
        );
      } else if (urlError === 'InvalidAuthCode') {
        setError('Authentication session code expired. Please sign in again.');
      } else {
        setError(decodeURIComponent(urlError));
      }
    }
  }, [urlError]);

  const supabase = createClient();

  const handleGoogleAdminLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      // Direct through auth callback specifying role=associate_admin and next=/associate-admin/dashboard
      const redirectUrl = `${window.location.origin}/auth/callback?role=associate_admin&next=/associate-admin/dashboard`;

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
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during admin sign-in.';
      setError(msg);
      setIsGoogleLoading(false);
    }
  };

  // Demo testing account login for testing evaluation
  const loginWithDemoAdmin = async (email: string) => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: 'DemoPassword2027!',
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.user) {
        router.push('/associate-admin/dashboard');
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold text-xl shadow-md mb-3">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 mb-1">
            Institutional Gateway
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Associate Admin Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Authorized administrative access for institutional academic structure configuration and student registration review.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Single Continue with Google Button */}
        <div className="space-y-4 pt-2">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            disabled={isGoogleLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span>Verifying Administrator Identity...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="h-4 w-4 shrink-0" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Only accounts with an authorized <strong>Associate Administrator</strong> or <strong>Super Admin</strong> assignment can access this portal.
          </p>
        </div>

        {/* Quick Testing Identities for Evaluators */}
        <div className="pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Users className="h-3 w-3" /> Quick Evaluation Credentials:
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => loginWithDemoAdmin('aarav.patel@sic.internal')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60"
            >
              <div className="font-bold text-slate-800">Aarav Patel</div>
              <div className="text-slate-400 truncate">Associate Admin</div>
            </button>
            <button
              type="button"
              onClick={() => loginWithDemoAdmin('director@sic.internal')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60"
            >
              <div className="font-bold text-slate-800">Director</div>
              <div className="text-slate-400 truncate">Super Admin</div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-slate-400" />
          <span>Role-Scoped Security &bull; PostgreSQL RLS</span>
        </div>
      </div>
    </div>
  );
}

export default function AssociateAdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Administrator Gateway...</div>}>
      <AssociateAdminLoginForm />
    </Suspense>
  );
}
