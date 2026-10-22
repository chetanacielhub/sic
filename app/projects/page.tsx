// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /projects
// Project Directory & Innovation Portfolio Overview
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { 
  FolderKanban, 
  Users, 
  Layers, 
  CalendarDays, 
  Plus, 
  ArrowRight, 
  ShieldCheck 
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentMember } from '@/lib/auth/session';
import { resolveUserContext } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const currentMember = await getCurrentMember();
  const userContext = currentMember ? await resolveUserContext(currentMember.id) : null;
  const adminClient = createAdminClient();

  const { data: projects } = await adminClient
    .from('projects')
    .select(`
      *,
      project_memberships(
        role,
        status,
        member:members(id, full_name, email, member_code)
      ),
      groups(id, name, code),
      sessions(id, title, status)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-emerald-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Projects &amp; Initiatives</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Project-based authorization scopes, dedicated research initiatives, and member affiliations.
          </p>
        </div>

        {userContext?.isSuperAdmin && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="h-4 w-4" /> Create New Project
          </button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(projects || []).map((project) => {
          const members = (project.project_memberships || []).filter((pm: { status: string }) => pm.status === 'ACTIVE');
          const myMembership = currentMember 
            ? members.find((pm: { member: { id: string } }) => pm.member?.id === currentMember.id)
            : null;

          return (
            <div
              key={project.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {project.slug}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    project.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {project.status}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-900 mt-3">{project.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{project.description || 'Innovation research project.'}</p>

                {/* My Project Role if assigned */}
                {myMembership && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-500">Your Project Role:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      myMembership.role === 'PROJECT_ADMIN'
                        ? 'bg-blue-100 text-blue-800'
                        : myMembership.role === 'LEAD'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {myMembership.role?.replace('_', ' ')}
                    </span>
                  </div>
                )}

                {/* Metrics */}
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-lg font-black text-slate-900">{members.length}</div>
                    <div className="text-[10px] text-slate-500">Members</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-lg font-black text-slate-900">{(project.groups || []).length}</div>
                    <div className="text-[10px] text-slate-500">Groups/Wings</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-lg font-black text-slate-900">{(project.sessions || []).length}</div>
                    <div className="text-[10px] text-slate-500">Sessions</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  Enter Project Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/dashboard?project_id=${project.id}`}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Set as Active Context
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
