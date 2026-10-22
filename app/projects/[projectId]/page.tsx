// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /projects/[projectId]
// Detailed Project Workspace, Scoped Members & Role Management
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { 
  FolderKanban, 
  Users, 
  Layers, 
  CalendarDays, 
  ArrowLeft, 
  ShieldCheck, 
  Plus, 
  UserPlus,
  Clock
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentMember } from '@/lib/auth/session';
import { resolveUserContext } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const currentMember = await getCurrentMember();
  const userContext = currentMember ? await resolveUserContext(currentMember.id, projectId) : null;
  const adminClient = createAdminClient();

  const [
    { data: project },
    { data: memberships },
    { data: groups },
    { data: sessions },
  ] = await Promise.all([
    adminClient.from('projects').select('*').eq('id', projectId).single(),
    adminClient
      .from('project_memberships')
      .select(`
        id,
        role,
        status,
        created_at,
        member:members(id, full_name, email, member_code, department, designation)
      `)
      .eq('project_id', projectId)
      .eq('status', 'ACTIVE')
      .order('role', { ascending: true }),
    adminClient.from('groups').select('*').eq('project_id', projectId),
    adminClient.from('sessions').select('*, host:members(full_name)').eq('project_id', projectId).order('scheduled_start', { ascending: false }),
  ]);

  if (!project) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        Project not found or you do not have permission to access it.
      </div>
    );
  }

  const canManageMembers = userContext?.isSuperAdmin || userContext?.effectiveRole === 'PROJECT_ADMIN';

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects Directory
      </Link>

      {/* Project Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              {project.slug}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {project.status}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
            {project.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {project.description || 'Dedicated institutional research workspace.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard?project_id=${project.id}`}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            Open in Dashboard
          </Link>
        </div>
      </div>

      {/* Main Grid: Project Members & Scoped Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members & Roles Table (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-700" />
                Project Membership &amp; Scoped Roles ({memberships?.length || 0})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Roles are project-scoped: a member can be Project Admin here and Member elsewhere.
              </p>
            </div>

            {canManageMembers && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" /> Assign Member
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Member</th>
                  <th className="px-3 py-2.5">Department</th>
                  <th className="px-3 py-2.5">Project Role</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {(memberships || []).map((pm) => {
                  const m = pm.member as any;
                  return (
                    <tr key={pm.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">{m?.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{m?.member_code}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {m?.department}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pm.role === 'PROJECT_ADMIN'
                            ? 'bg-blue-100 text-blue-800'
                            : pm.role === 'LEAD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {pm.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {pm.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Linked Groups & Sessions (1 column) */}
        <div className="space-y-6">
          {/* Linked Groups */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-700" />
              Project Groups &amp; Wings ({groups?.length || 0})
            </h3>
            <div className="space-y-2">
              {(groups || []).length === 0 ? (
                <div className="text-xs text-slate-400 py-2">No groups assigned to this project.</div>
              ) : (
                groups?.map(g => (
                  <div key={g.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="font-bold text-slate-900">{g.name}</div>
                    <div className="font-mono text-[10px] text-slate-500">{g.code}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Linked Sessions */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-700" />
              Project Sessions ({sessions?.length || 0})
            </h3>
            <div className="space-y-2">
              {(sessions || []).length === 0 ? (
                <div className="text-xs text-slate-400 py-2">No sessions scheduled for this project.</div>
              ) : (
                sessions?.slice(0, 3).map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{s.title}</div>
                      <div className="text-[10px] text-slate-500">{new Date(s.scheduled_start).toLocaleDateString()}</div>
                    </div>
                    <Link
                      href={`/sic/sessions/${s.id}/live`}
                      className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800"
                    >
                      Monitor
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
