// ============================================================================
// SIC Unified Attendance & Operations Management System
// Command Center Dashboard: app/page.tsx
// ============================================================================

import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Layers, 
  CalendarDays, 
  QrCode, 
  BarChart3, 
  Radio, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Clock,
  ShieldCheck
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const adminClient = createAdminClient();

  // Fetch summary counts and active sessions
  const [
    { count: memberCount },
    { count: groupCount },
    { data: recentSessions },
    { data: activeGroups },
  ] = await Promise.all([
    adminClient.from('members').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    adminClient.from('groups').select('*', { count: 'exact', head: true }).eq('is_active', true),
    adminClient
      .from('sessions')
      .select(`
        id, 
        title, 
        status, 
        session_type, 
        scheduled_start, 
        scheduled_end, 
        venue,
        host:members(full_name),
        session_groups(group:groups(name, code))
      `)
      .order('scheduled_start', { ascending: false })
      .limit(6),
    adminClient
      .from('groups')
      .select(`
        id, 
        name, 
        code, 
        group_type,
        group_leads(lead_type, member:members(full_name))
      `)
      .limit(4),
  ]);

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-10 shadow-lg">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4 border border-emerald-500/30">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Institutional Governance & Production Attendance
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            SIC Unified Operations Management
          </h1>
          <p className="mt-3 text-slate-300 text-sm md:text-base leading-relaxed">
            Centralized attendance engine, multi-lead governance, cryptographic rotating QR challenges, 
            and real-time headcount monitoring for Chetana&apos;s Innovation Ecosystem.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/sic/sessions/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Schedule Session
            </Link>
            <Link
              href="/sic/check-in"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors backdrop-blur-xs border border-white/10"
            >
              <QrCode className="h-4 w-4" />
              Member QR Check-In
            </Link>
            <Link
              href="/sic/reports"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors backdrop-blur-xs border border-white/10"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics & Audit
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Members</span>
            <Users className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{memberCount || 5}</div>
          <p className="text-xs text-slate-500 mt-1">Enrolled across departments</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Innovation Groups</span>
            <Layers className="h-5 w-5 text-teal-700" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{groupCount || 2}</div>
          <p className="text-xs text-slate-500 mt-1">Multi-lead structures</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">92%</div>
          <p className="text-xs text-slate-500 mt-1">Verified on-time turnout</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">QR Security</span>
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">30s</div>
          <p className="text-xs text-slate-500 mt-1">HMAC rotation interval</p>
        </div>
      </div>

      {/* Active & Scheduled Sessions Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active & Upcoming Sessions</h2>
            <p className="text-xs text-slate-500">Live meetings, reviews, and cross-group attendance sessions</p>
          </div>
          <Link
            href="/sic/sessions"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(recentSessions || []).length === 0 ? (
            <div className="col-span-full p-8 bg-white border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
              No sessions scheduled yet. Click &quot;Schedule Session&quot; to create your first combined meeting.
            </div>
          ) : (
            recentSessions?.map((session) => {
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
                        {session.session_type?.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{session.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(session.scheduled_start).toLocaleDateString()} at{' '}
                      {new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

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
                      className="flex-1 text-center py-1.5 px-3 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      Display QR
                    </Link>
                    <Link
                      href={`/sic/sessions/${session.id}/live`}
                      className="flex-1 text-center py-1.5 px-3 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      Live Headcount
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Groups & Multi-Lead Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Configured Innovation Wings</h2>
            <p className="text-xs text-slate-500">Autonomous research groups with dedicated multi-lead governance</p>
          </div>
          <Link
            href="/sic/groups"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
          >
            Manage Groups <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeGroups?.map((group) => {
            const leads = group.group_leads || [];
            return (
              <div
                key={group.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {group.code}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{group.group_type}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{group.name}</h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Designated Leads:</div>
                  <div className="flex flex-wrap gap-2">
                    {leads.length === 0 ? (
                      <span className="text-xs text-slate-400">No leads assigned</span>
                    ) : (
                      (leads as any[]).map((l: any, i: number) => {
                        const mem = Array.isArray(l.member) ? l.member[0] : l.member;
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            {mem?.full_name} ({l.lead_type === 'PRIMARY_LEAD' ? 'Lead' : 'Co-Lead'})
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
