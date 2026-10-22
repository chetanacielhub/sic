// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Live Headcount Monitor & Attendance Roster
// ============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  QrCode, 
  FileDown, 
  Search, 
  RefreshCw,
  Radio,
  FileText
} from 'lucide-react';

interface GroupInfo {
  id: string;
  name: string;
  code: string;
}

interface MemberRosterItem {
  member_id: string;
  member_code: string;
  full_name: string;
  email: string;
  department: string;
  avatar_url?: string | null;
  origin_groups: GroupInfo[];
  status: string;
  check_in_time?: string | null;
  verification_method?: string | null;
}

interface LiveRosterProps {
  sessionId: string;
}

export function LiveAttendanceMonitor({ sessionId }: LiveRosterProps) {
  const [data, setData] = useState<{
    session?: { title: string; status: string; scheduled_start: string; session_groups: Array<{ group: GroupInfo }> };
    summary: {
      total_eligible: number;
      total_present: number;
      total_late: number;
      total_excused: number;
      total_unmarked: number;
      attendance_percentage: number;
    };
    roster: MemberRosterItem[];
  }>({
    summary: {
      total_eligible: 0,
      total_present: 0,
      total_late: 0,
      total_excused: 0,
      total_unmarked: 0,
      attendance_percentage: 0,
    },
    roster: [],
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchAttendance = useCallback(async () => {
    try {
      const url = `/api/sic/sessions/${sessionId}/attendance${selectedGroupId ? `?group_id=${selectedGroupId}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error fetching live attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedGroupId]);

  // Initial fetch and 4-second live poll
  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 4000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  // Extract unique participating groups from the session for filter buttons
  const participatingGroups: GroupInfo[] = (data.session?.session_groups || [])
    .map(sg => sg.group)
    .filter(Boolean);

  // Client-side search and status filters
  const filteredRoster = data.roster.filter(m => {
    const matchesSearch = 
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.member_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Session Title & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">
              Live Monitor • Real-time Headcount
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {data.session?.title || 'Session Attendance'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-syncing • Last verified at {lastUpdated || 'connecting...'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/sic/sessions/${sessionId}/qr`}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            Display Rotating QR
          </Link>
          <Link
            href={`/sic/mom/${sessionId}`}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <FileText className="h-4 w-4 text-emerald-700" />
            Open MoM Editor
          </Link>
          <button
            onClick={fetchAttendance}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Refresh Headcount"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Headcount Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" />
            Unique Eligible
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {data.summary.total_eligible}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Deduplicated Members</div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 shadow-xs">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Present (On Time)
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {data.summary.total_present}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Verified via QR</div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60 shadow-xs">
          <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-600" />
            Late Arrivals
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {data.summary.total_late}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">Beyond Grace Period</div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            Unmarked
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {data.summary.total_unmarked}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Pending Check-in</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
          <div className="text-xs font-semibold text-slate-500">Attendance Turnout</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {data.summary.attendance_percentage}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${data.summary.attendance_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Multi-Group Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Group:
          </span>
          <button
            onClick={() => setSelectedGroupId(null)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              selectedGroupId === null
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Groups (Deduplicated)
          </button>
          {participatingGroups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                selectedGroupId === group.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search roster..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Group Membership</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Check-In Time</th>
                <th className="px-4 py-3">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No matching members found in this roster view.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item) => {
                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      NOT MARKED
                    </span>
                  );
                  if (item.status === 'PRESENT') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> PRESENT
                      </span>
                    );
                  } else if (item.status === 'LATE') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Clock className="h-3 w-3" /> LATE
                      </span>
                    );
                  } else if (item.status === 'EXCUSED') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        EXCUSED
                      </span>
                    );
                  }

                  return (
                    <tr key={item.member_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.full_name}</div>
                        <div className="text-[11px] text-slate-500">{item.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600">
                        {item.member_code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.origin_groups.map(g => (
                            <span 
                              key={g.id} 
                              className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 border border-slate-200 rounded text-slate-700"
                            >
                              {g.code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusBadge}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.check_in_time 
                          ? new Date(item.check_in_time).toLocaleTimeString() 
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {item.verification_method || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
