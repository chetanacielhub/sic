// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/sessions
// Session & Meetings Directory
// ============================================================================

import Link from 'next/link';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  QrCode, 
  Radio, 
  FileText 
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function SessionsListPage() {
  const adminClient = createAdminClient();

  const { data: sessions } = await adminClient
    .from('sessions')
    .select(`
      *,
      host:members(full_name, member_code),
      session_groups(group:groups(id, name, code))
    `)
    .order('scheduled_start', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sessions & Meetings</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage scheduled meetings, combined cross-group sessions, rotating QR windows, and live rosters.
          </p>
        </div>

        <Link
          href="/sic/sessions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <Plus className="h-4 w-4" /> Schedule New Session
        </Link>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(sessions || []).length === 0 ? (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
            No sessions scheduled yet. Click &quot;Schedule New Session&quot; to begin.
          </div>
        ) : (
          sessions?.map((session) => {
            const isOpen = ['OPEN', 'IN_PROGRESS'].includes(session.status);
            const groups = (session.session_groups as any[])?.map((sg: any) => {
              const g = Array.isArray(sg.group) ? sg.group[0] : sg.group;
              return g?.code;
            }).filter(Boolean);

            return (
              <div
                key={session.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isOpen
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                      {session.status}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {session.session_type?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">{session.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{session.description || 'No description provided.'}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Date(session.scheduled_start).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{session.venue || 'SIC Innovation Centre'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>Host: {session.host?.full_name || 'Assigned Lead'}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {groups?.map((code: string) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/sic/sessions/${session.id}/qr`}
                    className="flex-1 text-center py-1.5 px-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs flex items-center justify-center gap-1"
                  >
                    <QrCode className="h-3.5 w-3.5" /> QR
                  </Link>
                  <Link
                    href={`/sic/sessions/${session.id}/live`}
                    className="flex-1 text-center py-1.5 px-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Radio className="h-3.5 w-3.5" /> Monitor
                  </Link>
                  <Link
                    href={`/sic/mom/${session.id}`}
                    className="flex-1 text-center py-1.5 px-2 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" /> MoM
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
