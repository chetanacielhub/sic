// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /forgot-password
// Password Reset Request
// ============================================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setIsSubmitted(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending password reset email.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your institutional email to receive secure recovery instructions.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">Recovery Instructions Sent</h3>
            <p className="text-xs text-emerald-700">
              If an account exists for <strong>{email}</strong>, a password reset link has been dispatched.
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 text-xs font-bold text-emerald-800 underline"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Institutional Email
              </label>
              <input
                type="email"
                required
                placeholder="e.g. member@sic.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Dispatching Recovery Email...' : 'Send Recovery Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
