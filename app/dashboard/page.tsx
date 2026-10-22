// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /dashboard
// Role-Aware Unified Dashboard & Project Context Resolver
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Layers, 
  CalendarDays, 
  QrCode, 
  BarChart3, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  FolderKanban, 
  UserCheck, 
  ArrowRight,
  FileText
} from 'lucide-react';
import { getCurrentMember } from '@/lib/auth/session';
import { resolveUserContext } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function RoleAwareDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const { project_id: targetProjectId } = await searchParams;
  const currentMember = await getCurrentMember();

  // If no logged in user detected in server component, show login prompt
  if (!currentMember) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Authentication Required</h2>
        <p className="text-xs text-slate-500">
          Please sign in to access your project dashboard, active sessions, and attendance operations.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
        >
          Sign In Now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const userContext = await resolveUserContext(currentMember.id, targetProjectId);
  const adminClient = createAdminClient();

  // Fetch relevant sessions and groups
  const [
    { data: activeSessions },
    { data: groups },
    { data: myAttendance },
    { data: allProjects },
  ] = await Promise.all([
    adminClient.from('sessions').select('*, host:members(full_name)').order('scheduled_start', { ascending: false }).limit(4),
    adminClient.from('groups').select('*').eq('is_active', true).limit(4),
    adminClient.from('attendance_records').select('*, session:sessions(title, scheduled_start)').eq('member_id', currentMember.id).limit(4),
    adminClient.from('projects').select('*').eq('status', 'ACTIVE'),
  ]);

  const activeProject = userContext.projects.find(p => p.project.id === userContext.activeProjectId)?.project || allProjects?.[0];
  const roleTitle = userContext.isSuperAdmin
    ? 'Platform Super Admin'
    : userContext.effectiveRole === 'PROJECT_ADMIN'
    ? 'Project Administrator'
    : userContext.effectiveRole === 'LEAD'
    ? 'Group Lead'
    : 'SIC Member';

  return (
    <div className="space-y-8">
      {/* User Header & Role Context Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              userContext.isSuperAdmin 
                ? 'bg-purple-100 text-purple-800' 
                : userContext.effectiveRole === 'PROJECT_ADMIN'
                ? 'bg-blue-100 text-blue-800'
                : userContext.effectiveRole === 'LEAD'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {roleTitle}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500 font-mono">{currentMember.member_code}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {currentMember.full_name}
          </h1>
          <p className="text-xs text-slate-500">
            {currentMember.designation} — {currentMember.department}
          </p>
        </div>

        {/* Project Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <FolderKanban className="h-5 w-5 text-slate-500 shrink-0" />
          <div className="text-xs">
            <div className="text-[10px] font-bold uppercase text-slate-400">Current Project Scope:</div>
            <div className="font-bold text-slate-900">{activeProject?.name || 'All Platform Projects'}</div>
          </div>

          {userContext.projects.length > 1 && (
            <div className="flex gap-1 mt-2 sm:mt-0">
              {userContext.projects.map(p => (
                <Link
                  key={p.project.id}
                  href={`/dashboard?project_id=${p.project.id}`}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    p.project.id === userContext.activeProjectId
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.project.name.split(' ')[0]}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role-Specific Action Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Check-In Action (Every Member) */}
        <Link
          href="/sic/check-in"
          className="bg-emerald-700 text-white p-5 rounded-2xl hover:bg-emerald-800 transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Quick Check-in</span>
            <QrCode className="h-5 w-5" />
          </div>
          <div className="text-base font-bold mt-3">Scan Session QR</div>
          <p className="text-[11px] text-emerald-200 mt-0.5">Verify attendance via rotating code</p>
        </Link>

        {/* Schedule Session (Leads & Admins) */}
        {(userContext.isSuperAdmin || userContext.permissions.includes('attendance.create')) ? (
          <Link
            href="/sic/sessions/new"
            className="bg-white text-slate-900 p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Schedule</span>
              <CalendarDays className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="text-base font-bold mt-3">Create Meeting</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Multi-group attendance window</p>
          </Link>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400">My Attendance</span>
            <div className="text-2xl font-black text-slate-900 mt-2">95%</div>
            <p className="text-[11px] text-slate-500">Punctual record</p>
          </div>
        )}

        {/* Groups & Teams */}
        <Link
          href="/sic/groups"
          className="bg-white text-slate-900 p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Innovation Units</span>
            <Layers className="h-5 w-5 text-teal-700" />
          </div>
          <div className="text-base font-bold mt-3">Groups &amp; Leads</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Multi-lead management</p>
        </Link>

        {/* Analytics / Audit (Admins & Leads) */}
        <Link
          href="/sic/reports"
          className="bg-white text-slate-900 p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Governance</span>
            <BarChart3 className="h-5 w-5 text-indigo-700" />
          </div>
          <div className="text-base font-bold mt-3">Reports &amp; Audit</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Live turnouts &amp; logs</p>
        </Link>
      </div>

      {/* Role-Specific Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Meetings / Sessions */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Upcoming &amp; Active Sessions</h2>
              <p className="text-xs text-slate-500">Live meetings and attendance windows</p>
            </div>
            <Link href="/sic/sessions" className="text-xs font-bold text-emerald-700 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {(activeSessions || []).map(s => {
              const isOpen = ['OPEN', 'IN_PROGRESS'].includes(s.status);
              return (
                <div
                  key={s.id}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 flex items-center justify-between transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <div className="text-xs font-bold text-slate-900">{s.title}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(s.scheduled_start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>•</span>
                      <span>Host: {s.host?.full_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/sic/sessions/${s.id}/qr`}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    >
                      QR
                    </Link>
                    <Link
                      href={`/sic/sessions/${s.id}/live`}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    >
                      Monitor
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Personal History or Admin Overview */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {userContext.isSuperAdmin || userContext.effectiveRole === 'PROJECT_ADMIN' ? 'Projects & Innovation Units' : 'My Recent Check-ins'}
              </h2>
              <p className="text-xs text-slate-500">Verified attendance history and status</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {(myAttendance || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No recent personal check-ins. Click &quot;Scan Session QR&quot; when attending a meeting.
              </div>
            ) : (
              myAttendance?.map(att => (
                <div
                  key={att.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{att.session?.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(att.check_in_time).toLocaleTimeString()} • {att.verification_method}
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    att.status === 'PRESENT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {att.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
