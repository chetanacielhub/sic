// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/members
// Member Directory & Multi-Group Profile Overview
// ============================================================================

import { Users, Mail, Building, ShieldCheck, Layers } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const adminClient = createAdminClient();

  const { data: members } = await adminClient
    .from('members')
    .select(`
      *,
      group_memberships(
        status,
        group:groups(id, name, code)
      )
    `)
    .order('member_code', { ascending: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">SIC Member Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Institutional identities, roles, departments, and cross-group affiliations.
          </p>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(members || []).map((member) => {
          const activeGroups = ((member.group_memberships || []) as any[])
            .filter((gm: any) => gm.status === 'ACTIVE')
            .map((gm: any) => Array.isArray(gm.group) ? gm.group[0] : gm.group)
            .filter(Boolean);

          return (
            <div
              key={member.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {member.member_code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    member.org_role === 'SIC_DIRECTOR' || member.org_role === 'SIC_ADMIN'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {member.org_role?.replace('_', ' ')}
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 mt-3">{member.full_name}</h2>
                <div className="text-xs text-slate-500">{member.designation}</div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>{member.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
              </div>

              {/* Group Memberships (Multi-group support demonstration) */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Group Affiliations ({activeGroups.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeGroups.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No groups assigned</span>
                  ) : (
                    activeGroups.map((g: { code: string; name: string }) => (
                      <span
                        key={g.code}
                        className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md"
                      >
                        {g.code}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
