// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Full-Screen Rotating QR Code Presentation Display
// ============================================================================

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Clock, 
  Users, 
  ShieldCheck, 
  AlertTriangle,
  Radio,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface QrDisplayProps {
  sessionId: string;
  initialTitle?: string;
}

export function RotatingQrDisplay({ sessionId, initialTitle }: QrDisplayProps) {
  const [sessionTitle, setSessionTitle] = useState(initialTitle || 'Session Attendance');
  const [challenge, setChallenge] = useState<string>('');
  const [remainingSec, setRemainingSec] = useState<number>(30);
  const [totalInterval, setTotalInterval] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [headcount, setHeadcount] = useState<{ present: number; total: number }>({ present: 0, total: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Challenge from API
  const fetchChallenge = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/sic/sessions/${sessionId}/qr`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to generate attendance challenge.');
        return;
      }

      setChallenge(json.data.challenge);
      setSessionTitle(json.data.title || sessionTitle);
      const rem = json.data.remainingSeconds || 30;
      setRemainingSec(rem);
      setTotalInterval(json.data.rotationIntervalSec || 30);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, sessionTitle]);

  // Fetch current headcount
  const fetchHeadcount = useCallback(async () => {
    try {
      const res = await fetch(`/api/sic/sessions/${sessionId}/attendance`);
      const json = await res.json();
      if (json.success && json.data?.summary) {
        setHeadcount({
          present: json.data.summary.total_present + json.data.summary.total_late,
          total: json.data.summary.total_eligible,
        });
      }
    } catch {
      // Background poll failure is non-critical
    }
  }, [sessionId]);

  // Render QR Code onto Canvas
  useEffect(() => {
    if (!challenge || !canvasRef.current) return;

    // The QR contains a direct link to the check-in page with pre-filled challenge
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const checkInUrl = `${origin}/sic/check-in?challenge=${encodeURIComponent(challenge)}`;

    QRCode.toCanvas(
      canvasRef.current,
      checkInUrl,
      {
        width: 380,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) console.error('QR Render Error:', err);
      }
    );
  }, [challenge]);

  // Initial load & headcount polling
  useEffect(() => {
    fetchChallenge();
    fetchHeadcount();
    const countInterval = setInterval(fetchHeadcount, 8000);
    return () => clearInterval(countInterval);
  }, [fetchChallenge, fetchHeadcount]);

  // Second-by-second countdown ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          // Time expired, refresh code!
          fetchChallenge();
          return totalInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchChallenge, totalInterval]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const progressPct = Math.max(0, Math.min(100, (remainingSec / totalInterval) * 100));

  return (
    <div className={`flex flex-col items-center justify-between min-h-[82vh] p-6 rounded-2xl bg-white border border-slate-200 shadow-sm ${isFullscreen ? 'p-12' : ''}`}>
      {/* Top Session Metadata */}
      <div className="w-full max-w-2xl flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Live Attendance Active
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {sessionTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/sic/sessions/${sessionId}/live`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Radio className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
            Live Monitor
          </Link>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Main QR Card */}
      <div className="flex flex-col items-center my-6">
        {error ? (
          <div className="flex flex-col items-center p-8 bg-amber-50 rounded-2xl border border-amber-200 text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-amber-600 mb-3" />
            <h3 className="text-base font-bold text-amber-900">Attendance Window Closed</h3>
            <p className="text-xs text-amber-800 mt-1">{error}</p>
            <button
              onClick={fetchChallenge}
              className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="relative p-5 bg-white rounded-3xl border-2 border-slate-900/10 shadow-xl flex flex-col items-center">
            {/* The QR Canvas */}
            <canvas ref={canvasRef} className="rounded-xl" />

            {/* Rotation Countdown Bar */}
            <div className="w-full mt-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Code Rotates In:
                </span>
                <span className={`font-mono text-sm ${remainingSec <= 5 ? 'text-rose-600 font-extrabold animate-bounce' : 'text-slate-900'}`}>
                  {remainingSec}s
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    remainingSec <= 5 ? 'bg-rose-500' : remainingSec <= 10 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Security Watermark & Instruction */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span>Cryptographically rotating challenge • Single-use verification</span>
        </div>
      </div>

      {/* Footer Metrics & Actions */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <div className="text-xs">
              <span className="text-slate-500">Live Verified: </span>
              <span className="font-bold text-slate-900 text-sm">
                {headcount.present} / {headcount.total}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchChallenge}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Force Rotate
        </button>
      </div>
    </div>
  );
}
