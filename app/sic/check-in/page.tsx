// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/check-in
// Authenticated Member Mobile Check-In & Challenge Verification
// ============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface MemberOption {
  id: string;
  full_name: string;
  member_code: string;
  department: string;
}

interface VerificationSuccess {
  record_id: string;
  session_title: string;
  member_name: string;
  member_code: string;
  status: string;
  check_in_time: string;
  is_duplicate: boolean;
  message: string;
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const initialChallenge = searchParams.get('challenge') || '';

  const [challenge, setChallenge] = useState<string>(initialChallenge);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationSuccess | null>(null);

  // Fetch enrolled members to allow selecting active account
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/sic/members');
        const json = await res.json();
        if (json.success && json.data) {
          setMembers(json.data);
          if (json.data.length > 0) {
            setSelectedMemberId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    }
    loadMembers();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge.trim()) {
      setError('Please provide a valid attendance challenge token.');
      return;
    }
    if (!selectedMemberId) {
      setError('Please select your member identity.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch('/api/sic/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge: challenge.trim(),
          member_id: selectedMemberId,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Attendance check-in rejected.');
      } else {
        setResult(json.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error during check-in.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm mb-3">
            <QrCode className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">SIC Attendance Verification</h1>
          <p className="text-xs text-slate-500 mt-1">
            Authenticate your presence via rotating cryptographic challenge
          </p>
        </div>

        {/* Success Card */}
        {result ? (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                result.status === 'PRESENT'
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-200 text-amber-900'
              }`}>
                {result.status === 'PRESENT' ? 'VERIFIED • ON TIME' : 'VERIFIED • LATE ARRIVAL'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">{result.session_title}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{result.message}</p>
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-emerald-100 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Attendee:</span>
                <span className="font-bold text-slate-900">{result.member_name} ({result.member_code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in Timestamp:</span>
                <span className="font-mono font-medium text-slate-800">
                  {new Date(result.check_in_time).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-medium text-slate-800">Rotating HMAC Challenge</span>
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setChallenge('');
              }}
              className="w-full py-2.5 px-4 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors"
            >
              Scan Another Code
            </button>
          </div>
        ) : (
          /* Check-In Form */
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Authenticated Member Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                Member Identity
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.member_code}) — {m.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Challenge Token Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                QR Challenge Token
              </label>
              <textarea
                rows={3}
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="SIC:ATTEND:session_uuid:timestamp:nonce:signature"
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <p className="text-[11px] text-slate-500">
                Auto-populated when scanning the host&apos;s rotating QR code via camera.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !challenge.trim()}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>Verifying Challenge Signature...</>
              ) : (
                <>
                  Verify & Mark Attendance <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
            Return to Operations Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading check-in scanner...</div>}>
      <CheckInContent />
    </Suspense>
  );
}
