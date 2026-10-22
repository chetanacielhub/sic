// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/sessions/new
// Schedule Session & Configure Multi-Group Participation
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CalendarDays, 
  ArrowLeft, 
  Layers, 
  UserCheck, 
  Clock, 
  MapPin, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface GroupItem {
  id: string;
  name: string;
  code: string;
  group_type: string;
}

interface MemberItem {
  id: string;
  full_name: string;
  member_code: string;
  department: string;
}

export default function NewSessionPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionType, setSessionType] = useState('MULTI_GROUP_MEETING');
  const [hostId, setHostId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [venue, setVenue] = useState('SIC Innovation Lab 3');
  const [rotationSec, setRotationSec] = useState(30);
  const [graceMins, setGraceMins] = useState(15);

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize start/end times with sensible defaults (now -> +1 hr)
  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setScheduledStart(startStr);

    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setScheduledEnd(endStr);
  }, []);

  // Fetch groups and members
  useEffect(() => {
    async function loadResources() {
      try {
        const [grpRes, memRes] = await Promise.all([
          fetch('/api/sic/groups'),
          fetch('/api/sic/members'),
        ]);

        if (grpRes.ok && grpRes.headers.get('content-type')?.includes('application/json')) {
          const grpJson = await grpRes.json();
          if (grpJson.success && grpJson.data) {
            setGroups(grpJson.data);
            // Select all active groups by default for combined review
            setSelectedGroupIds(grpJson.data.map((g: GroupItem) => g.id));
          }
        }

        if (memRes.ok && memRes.headers.get('content-type')?.includes('application/json')) {
          const memJson = await memRes.json();
          if (memJson.success && memJson.data) {
            setMembers(memJson.data);
            if (memJson.data.length > 0) {
              setHostId(memJson.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load form resources:', err);
      }
    }
    loadResources();
  }, []);

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Session title is required.');
      return;
    }
    if (selectedGroupIds.length === 0) {
      setError('Please select at least one participating group.');
      return;
    }
    if (!hostId) {
      setError('Please select a session host.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        session_type: sessionType,
        host_id: hostId,
        group_ids: selectedGroupIds,
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
        venue: venue.trim() || null,
        qr_rotation_interval_sec: Number(rotationSec),
        late_grace_period_mins: Number(graceMins),
      };

      const res = await fetch('/api/sic/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError(`Server returned an unexpected format (${res.status}).`);
        return;
      }

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to create session.');
      } else {
        router.push(`/sic/sessions/${json.data.id}/qr`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/sic/sessions"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sessions Directory
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-700" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Schedule New Session</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure meeting schedule, multi-group eligibility snapshot, and rotating QR attendance rules.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Session Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Joint Review: Autonomous Systems & IoT"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Description / Scope</label>
            <textarea
              rows={2}
              placeholder="Meeting purpose, key discussion targets, and attendance expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Session Type & Host */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Session Type</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="MULTI_GROUP_MEETING">Combined Multi-Group Meeting</option>
                <option value="GROUP_MEETING">Single Group Meeting</option>
                <option value="DAILY_DUTY">Daily SIC Duty Session</option>
                <option value="GENERAL_MEETING">General SIC Meeting</option>
                <option value="WORKSHOP">Multi-Day Workshop</option>
                <option value="EVENT">SIC Event / Demonstration</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" /> Session Host *
              </label>
              <select
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.member_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Group Participation Checkboxes */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-400" /> Participating Innovation Groups *
            </label>
            <p className="text-[11px] text-slate-500">
              Members belonging to multiple selected groups will be automatically deduplicated in the session register.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {groups.map(group => {
                const isSelected = selectedGroupIds.includes(group.id);
                return (
                  <label
                    key={group.id}
                    onClick={() => toggleGroup(group.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <div className="text-xs">
                      <div>{group.name}</div>
                      <span className="font-mono text-[10px] text-slate-500">{group.code}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Scheduled Start *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Scheduled End *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Venue & QR Policies */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Venue / Room
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> QR Rotation
              </label>
              <select
                value={rotationSec}
                onChange={(e) => setRotationSec(Number(e.target.value))}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value={15}>15 Seconds</option>
                <option value={30}>30 Seconds (Default)</option>
                <option value={60}>60 Seconds</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Late Grace Period</label>
              <select
                value={graceMins}
                onChange={(e) => setGraceMins(Number(e.target.value))}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/sic/sessions"
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Creating Session & Eligibility...' : 'Schedule & Open QR Window'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
