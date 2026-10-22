// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/groups
// Group Management, Memberships & Multi-Lead Directory
// ============================================================================

import { 
  Layers, 
  Users, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  UserCheck 
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const adminClient = createAdminClient();

  const { data: groups } = await adminClient
    .from('groups')
    .select(`
      *,
      group_leads(
        id,
        lead_type,
        is_active,
        member:members(id, full_name, email, member_code, department)
      ),
      group_memberships(
        id,
        status,
        member:members(id, full_name, email, member_code, department)
      )
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Innovation Groups & Multi-Leads</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure research wings, assign primary &amp; co-leads, manage memberships, and review attendance policies.
          </p>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(groups || []).map((group) => {
          const leads = (group.group_leads || []).filter((l: { is_active: boolean }) => l.is_active);
          const activeMembers = (group.group_memberships || []).filter((m: { status: string }) => m.status === 'ACTIVE');

          return (
            <div
              key={group.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {group.code}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {group.group_type}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-900 mt-2">{group.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{group.description || 'Specialized innovation unit.'}</p>

                {/* Multi-Leads Section */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-700" />
                    Designated Group Leads ({leads.length}):
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {leads.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No leads currently assigned</span>
                    ) : (
                      (leads as any[]).map((l: any) => {
                        const mem = Array.isArray(l.member) ? l.member[0] : l.member;
                        return (
                          <div
                            key={l.id}
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">{mem?.full_name}</div>
                              <div className="text-[10px] font-mono text-slate-500">{mem?.member_code}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              l.lead_type === 'PRIMARY_LEAD'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {l.lead_type === 'PRIMARY_LEAD' ? 'Lead' : 'Co-Lead'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Active Members Roster */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-slate-400" />
                      Enrolled Members ({activeMembers.length}):
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(activeMembers as any[]).map((m: any) => {
                      const mem = Array.isArray(m.member) ? m.member[0] : m.member;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
                        >
                          <div className="font-semibold text-slate-800">{mem?.full_name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{mem?.member_code}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Attendance Policy Summary */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Grace Period: {group.attendance_policy?.grace_period_mins || 15} mins</span>
                <span>Minimum Attendance: {group.attendance_policy?.min_attendance_pct || 75}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
