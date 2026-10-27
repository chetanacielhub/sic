// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Member Profile View & Avatar Management
// ============================================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Layers, 
  Mail, 
  Crown, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LayoutDashboard
} from 'lucide-react';

import { Member, Group } from '@/lib/types/sic';

interface Props {
  member: Member;
  groups: Group[];
  leadingGroups: Array<Group & { lead_type?: string }>;
}

export function MemberProfileView({ member, groups, leadingGroups }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(member.avatar_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Only JPG, PNG, and WebP images are allowed.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File size must be 5MB or less.' });
      return;
    }

    try {
      setIsUploading(true);
      setFeedback(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/sic/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', message: json.error || 'Failed to upload image.' });
        return;
      }

      setAvatarUrl(json.avatar_url);
      setFeedback({ type: 'success', message: 'Profile picture updated successfully.' });
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred during upload.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Avatar & Live Upload Button */}
            <div className="relative group shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl bg-slate-100 border-2 border-slate-200 overflow-hidden relative shadow-sm flex items-center justify-center text-xl sm:text-2xl font-bold text-slate-500">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={member.full_name} className="h-full w-full object-cover" />
                ) : (
                  member.full_name.charAt(0).toUpperCase()
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>

              <label
                className="absolute -bottom-2 -right-2 p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95 touch-manipulation"
                title="Change Profile Photo"
                aria-label="Upload New Profile Photo"
              >
                <Upload className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  {member.full_name}
                </h1>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  {member.member_code}
                </span>
              </div>

              <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {member.email}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  Role: {member.org_role.replace('_', ' ')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  {member.status}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors active:scale-[0.98] touch-manipulation"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Open Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Academic & Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Column 1: Institutional Academic Coordinates */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-emerald-700" /> Academic Coordinates
          </h2>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">College / Institution</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {member.college?.name || 'Chetana Innovation Ecosystem'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Course / Program</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {member.course?.name || member.department}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Academic Year</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {member.academic_year?.year_name || 'Current Year'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Division</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {member.division?.name || 'Assigned Division'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Institutional Roll Number</div>
              <div className="font-mono font-bold text-slate-800 mt-0.5">
                {member.roll_number || 'Registered'}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: SIC Group Memberships & Leadership */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
          {/* Memberships */}
          <div className="space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-700" /> Member Of ({groups.length})
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Active Memberships</span>
            </h2>

            {groups.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-2xl">
                No active group memberships currently assigned.
              </p>
            ) : (
              <div className="space-y-1.5">
                {groups.map(g => (
                  <div
                    key={g.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{g.name}</div>
                      {g.description && (
                        <div className="text-[10px] text-slate-500 line-clamp-1">{g.description}</div>
                      )}
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-600">
                      {g.code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leadership */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-amber-500" /> Leader Of ({leadingGroups.length})
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">Leadership Assignments</span>
            </h2>

            {leadingGroups.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-2xl">
                No active leadership assignments.
              </p>
            ) : (
              <div className="space-y-1.5">
                {leadingGroups.map(lg => (
                  <div
                    key={lg.id}
                    className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{lg.name}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      {lg.lead_type === 'PRIMARY_LEAD' ? 'Primary Lead' : 'Co-Lead'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
