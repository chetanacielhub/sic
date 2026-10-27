// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /registration-status
// Real-Time Member Registration Lifecycle & Approval Status Screen
// ============================================================================

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ShieldAlert, 
  ArrowRight, 
  RefreshCw, 
  LogOut, 
  FileEdit,
  GraduationCap,
  Layers,
  Hash,
  Mail,
  User,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MemberRegistration, RegistrationStatus } from '@/lib/types/sic';

function RegistrationStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcedStatus = searchParams.get('status') as RegistrationStatus | null;

  const [isLoading, setIsLoading] = useState(true);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [status, setStatus] = useState<RegistrationStatus | 'NOT_REGISTERED'>('PENDING');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const supabase = createClient();

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || null);

      if (forcedStatus) {
        setStatus(forcedStatus);
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/sic/register');
      if (res.ok) {
        const json = await res.json();
        if (json.isApprovedMember) {
          setStatus('APPROVED');
          setRegistration(null);
        } else if (json.registration) {
          setRegistration(json.registration);
          setStatus(json.registration.status);
        } else {
          setStatus('NOT_REGISTERED');
        }
      }
    } catch (err) {
      console.error('Failed to load registration status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [forcedStatus]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-xs font-semibold text-slate-500">Checking membership registration status...</p>
      </div>
    );
  }

  // If not registered yet, redirect to registration
  if (status === 'NOT_REGISTERED') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Registration Incomplete</h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          You have authenticated with Google, but have not submitted your institutional details yet.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <span>Complete Registration Now</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 space-y-6">
      {/* Status Card Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center space-y-4">
        {/* Status Icon & Badge */}
        {status === 'PENDING' && (
          <>
            <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Application Under Review
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Awaiting Associate Admin Review
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Your SIC membership registration has been received and queued for review by the authorized Associate Administrator for your institution.
              </p>
            </div>
          </>
        )}

        {status === 'NEEDS_CORRECTION' && (
          <>
            <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <FileEdit className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Action Required
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Correction Requested
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                The Associate Administrator has requested amendments to your submitted registration. Please review the feedback below and update your application.
              </p>
            </div>

            {registration?.correction_notes && (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-left space-y-1">
                <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  Reviewer Feedback:
                </div>
                <div className="text-xs text-amber-800 font-medium leading-relaxed">
                  {registration.correction_notes}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/register?correction=true"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <FileEdit className="h-4 w-4" />
                <span>Edit &amp; Resubmit Application</span>
              </Link>
            </div>
          </>
        )}

        {status === 'APPROVED' && (
          <>
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Membership Approved
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Welcome to SIC!
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Your registration has been approved. You now have full access to your projects, groups, live sessions, and attendance operations.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <span>Proceed to SIC Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}

        {status === 'REJECTED' && (
          <>
            <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <XCircle className="h-8 w-8 text-rose-600" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                Application Not Approved
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Registration Rejected
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Your application could not be approved by the institutional administration.
              </p>
            </div>

            {registration?.rejection_reason && (
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-left space-y-1">
                <div className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
                  Reason for Rejection:
                </div>
                <div className="text-xs text-rose-800 font-medium leading-relaxed">
                  {registration.rejection_reason}
                </div>
              </div>
            )}
          </>
        )}

        {status === 'SUSPENDED' && (
          <>
            <div className="h-16 w-16 bg-slate-100 text-slate-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="h-8 w-8 text-slate-600" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800">
                Access Suspended
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Account Suspended
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Your SIC access is currently inactive. Please contact your institution&apos;s SIC Director or administrator.
              </p>
            </div>
          </>
        )}

        {/* Refresh Action */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Check for Updates</span>
          </button>
        </div>
      </div>

      {/* Submitted Details Summary (if registration exists) */}
      {registration && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Submitted Application Record
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Applicant Name</div>
              <div className="font-bold text-slate-800 mt-0.5">{registration.full_name}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Institutional Email</div>
              <div className="font-bold text-slate-800 mt-0.5 truncate">{registration.email}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">College / Institution</div>
              <div className="font-bold text-slate-800 mt-0.5">{registration.college?.name || 'Assigned College'}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Course / Program</div>
              <div className="font-bold text-slate-800 mt-0.5">{registration.course?.name || 'Selected Course'}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Academic Year &amp; Division</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {registration.academic_year?.year_name || 'Year'} — {registration.division?.name || 'Division'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Roll Number</div>
              <div className="font-mono font-bold text-slate-800 mt-0.5">{registration.roll_number}</div>
            </div>
          </div>
        </div>
      )}

      {/* Account Controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <span>Logged in as: <strong className="text-slate-600">{userEmail}</strong></span>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function RegistrationStatusPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading status...</div>}>
      <RegistrationStatusContent />
    </Suspense>
  );
}
