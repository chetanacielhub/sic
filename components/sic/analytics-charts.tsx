// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Recharts Analytics Dashboards
// ============================================================================

'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface AnalyticsChartsProps {
  trends: Array<{ month: string; attendancePct: number; sessions: number }>;
  groupComparison: Array<{ group_name: string; attendancePct: number; totalMembers: number }>;
}

export function AnalyticsCharts({ trends, groupComparison }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Attendance Trend Area Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900">Institutional Attendance Turnout Trend</h3>
          <p className="text-xs text-slate-500">Historical verified attendance percentage by month</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#047857" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="attendancePct"
                stroke="#047857"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#attendanceGradient)"
                name="Attendance %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Group Comparative Bar Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900">Group Participation Benchmarks</h3>
          <p className="text-xs text-slate-500">Cross-wing attendance compliance rate</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="group_name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="attendancePct" fill="#0f766e" radius={[6, 6, 0, 0]} name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
