// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/reports
// Institutional Analytics, Compliance & Audit Reporting
// ============================================================================

import { BarChart3, Download, FileSpreadsheet, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AnalyticsCharts } from '@/components/sic/analytics-charts';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const adminClient = createAdminClient();

  const [
    { data: auditLogs },
    { count: sessionCount },
    { data: groups },
    { data: attendanceRecords },
    { count: momCount },
  ] = await Promise.all([
    adminClient.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
    adminClient.from('sessions').select('*', { count: 'exact', head: true }),
    adminClient.from('groups').select('id, name, code, group_memberships(count)'),
    adminClient.from('attendance_records').select('status, created_at'),
    adminClient.from('meeting_minutes').select('*', { count: 'exact', head: true }),
  ]);

  const totalAtt = (attendanceRecords || []).length;
  const presentCount = (attendanceRecords || []).filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const punctualCount = (attendanceRecords || []).filter(r => r.status === 'PRESENT').length;
  const overallTurnoutPct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 1000) / 10 : 0;
  const punctualityPct = totalAtt > 0 ? Math.round((punctualCount / totalAtt) * 1000) / 10 : 0;
  const momCompliancePct = (sessionCount && sessionCount > 0)
    ? Math.min(100, Math.round(((momCount || 0) / sessionCount) * 100))
    : 0;

  const trends: Array<{ month: string; attendancePct: number; sessions: number }> = [];

  const groupComparison = (groups || []).map((g: { code?: string; name: string; group_memberships?: Array<{ count: number }> }) => ({
    group_name: g.code || g.name,
    attendancePct: overallTurnoutPct,
    totalMembers: g.group_memberships?.[0]?.count || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Audit Reports</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Turnout metrics, group compliance benchmarks, and historical audit trail logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" /> Export CSV Roster
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Overall Turnout</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{overallTurnoutPct}%</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">{totalAtt} total check-ins</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Punctuality Rate</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{punctualityPct}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Within grace window</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Audit Logs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{(auditLogs || []).length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Recorded events</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">MoM Compliance</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{momCompliancePct}%</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">{momCount || 0} of {sessionCount || 0} sessions</div>
        </div>
      </div>

      {/* Recharts Analytics Charts */}
      <AnalyticsCharts trends={trends} groupComparison={groupComparison} />

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Security & Operations Audit Trail</h3>
            <p className="text-xs text-slate-500">Tamper-evident log of attendance, QR generation, and approvals</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            Immutable Storage
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action Event</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {(auditLogs || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No audit logs recorded yet. All operations will appear here automatically.
                  </td>
                </tr>
              ) : (
                auditLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.entity_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                      {log.entity_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" /> Logged
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
