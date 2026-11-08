'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Mail,
  Building,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  GraduationCap,
  Crown,
  Loader2,
  Hash,
  Settings,
  UserPlus,
  Ban,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Group, Member, MemberRegistration, OrgRole } from '@/lib/types/sic';

export interface DirectoryMemberItem extends Member {
  activeGroups?: Array<{ id?: string; code: string; name: string }>;
}

interface Props {
  initialMembers: DirectoryMemberItem[];
  initialRegistrations: MemberRegistration[];
  availableGroups?: Group[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentMemberEmail?: string;
}

export function MembersDirectoryClient({
  initialMembers,
  initialRegistrations,
  availableGroups = [],
  isAdmin,
  isSuperAdmin,
  currentMemberEmail,
}: Props) {
  const [members, setMembers] = useState<DirectoryMemberItem[]>(initialMembers);
  const [registrations, setRegistrations] = useState<MemberRegistration[]>(initialRegistrations);

  // Admin view tabs: 'APPROVALS' | 'DIRECTORY'
  const pendingCount = registrations.filter(r => r.status === 'PENDING').length;
  const bannedCount = members.filter(m => m.status === 'SUSPENDED').length;

  const [activeView, setActiveView] = useState<'APPROVALS' | 'DIRECTORY'>(
    isAdmin && pendingCount > 0 ? 'APPROVALS' : 'DIRECTORY'
  );

  // Filters
  const [regStatusFilter, setRegStatusFilter] = useState<string>('PENDING');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Review Modal State
  const [reviewTarget, setReviewTarget] = useState<MemberRegistration | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [approvedGroups, setApprovedGroups] = useState<string[]>([]);
  const [approvedLeaderGroups, setApprovedLeaderGroups] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Invite User Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('MEMBER');
  const [inviteDept, setInviteDept] = useState('Innovation & Operations');
  const [inviteDesignation, setInviteDesignation] = useState('SIC Member');
  const [inviteRollNo, setInviteRollNo] = useState('');
  const [inviteGroupIds, setInviteGroupIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Action loading state
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openReviewModal = (
    reg: MemberRegistration,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION'
  ) => {
    setReviewTarget(reg);
    setReviewAction(action);
    setReviewNotes('');

    const mGroups = (reg.requested_groups || [])
      .filter(rg => rg.request_type === 'MEMBER')
      .map(rg => rg.group_id);
    const lGroups = (reg.requested_groups || [])
      .filter(rg => rg.request_type === 'LEADER')
      .map(rg => rg.group_id);

    setApprovedGroups(mGroups);
    setApprovedLeaderGroups(lGroups);
  };

  const handleConfirmReview = async () => {
    if (!reviewTarget) return;

    if (reviewAction === 'REQUEST_CORRECTION' && !reviewNotes.trim()) {
      setBannerMsg({ type: 'error', text: 'Please provide correction notes for the student.' });
      return;
    }

    try {
      setIsSubmittingReview(true);
      setBannerMsg(null);

      const res = await fetch(`/api/sic/associate-admin/registrations/${reviewTarget.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          notes: reviewNotes.trim(),
          approved_group_ids: approvedGroups,
          approved_leader_group_ids: approvedLeaderGroups,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setBannerMsg({ type: 'error', text: json.error || 'Failed to process review action.' });
        return;
      }

      const updatedReg: MemberRegistration = json.data;
      setRegistrations(prev => prev.map(r => (r.id === updatedReg.id ? updatedReg : r)));

      if (reviewAction === 'APPROVE') {
        const cleanCode = updatedReg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase();
        const approvedGroupItems = (updatedReg.requested_groups || [])
          .filter(rg => rg.request_type === 'MEMBER' && approvedGroups.includes(rg.group_id))
          .map(rg => ({
            id: rg.group_id,
            code: rg.group?.code || 'SIC',
            name: rg.group?.name || 'SIC Group',
          }));

        const newDirectoryMember: DirectoryMemberItem = {
          id: updatedReg.member_id || updatedReg.id,
          auth_user_id: updatedReg.auth_user_id,
          member_code: `SIC-${cleanCode}`,
          full_name: updatedReg.full_name,
          email: updatedReg.email,
          phone: null,
          department: updatedReg.course?.name || 'Innovation & Operations',
          designation: 'SIC Member',
          org_role: 'MEMBER',
          status: 'ACTIVE',
          avatar_url: updatedReg.avatar_url || null,
          college_id: updatedReg.college_id,
          course_id: updatedReg.course_id,
          academic_year_id: updatedReg.academic_year_id,
          division_id: updatedReg.division_id,
          roll_number: updatedReg.roll_number,
          college: updatedReg.college,
          course: updatedReg.course,
          academic_year: updatedReg.academic_year,
          division: updatedReg.division,
          joined_at: updatedReg.reviewed_at || new Date().toISOString(),
          created_at: updatedReg.created_at,
          updated_at: updatedReg.updated_at,
          activeGroups: approvedGroupItems,
        };

        setMembers(prev => {
          const exists = prev.some(m => m.email.toLowerCase() === newDirectoryMember.email.toLowerCase());
          if (exists) {
            return prev.map(m =>
              m.email.toLowerCase() === newDirectoryMember.email.toLowerCase() ? newDirectoryMember : m
            );
          }
          return [newDirectoryMember, ...prev];
        });
      }

      setBannerMsg({ type: 'success', text: json.message || 'Application updated successfully.' });
      setReviewTarget(null);
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Invite User Handler
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      setBannerMsg(null);

      const res = await fetch('/api/sic/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: inviteName.trim(),
          email: inviteEmail.trim(),
          org_role: inviteRole,
          department: inviteDept.trim() || 'Innovation & Operations',
          designation: inviteDesignation.trim() || 'SIC Member',
          roll_number: inviteRollNo.trim() || null,
          group_ids: inviteGroupIds,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setBannerMsg({ type: 'error', text: json.error || 'Failed to invite user.' });
        return;
      }

      const created: DirectoryMemberItem = json.data;
      setMembers(prev => {
        const exists = prev.some(m => m.email.toLowerCase() === created.email.toLowerCase());
        if (exists) {
          return prev.map(m => (m.email.toLowerCase() === created.email.toLowerCase() ? created : m));
        }
        return [created, ...prev];
      });

      setBannerMsg({ type: 'success', text: json.message });
      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('MEMBER');
      setInviteRollNo('');
      setInviteGroupIds([]);
      setActiveView('DIRECTORY');
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error inviting user.',
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Approve / Ban / Unban Member Handler
  const handleSetMemberStatus = async (
    member: DirectoryMemberItem,
    newStatus: 'ACTIVE' | 'SUSPENDED'
  ) => {
    const actionLabel =
      newStatus === 'SUSPENDED'
        ? 'ban/suspend'
        : member.status === 'SUSPENDED'
        ? 'remove the ban and approve'
        : 'approve';

    if (!confirm(`Are you sure you want to ${actionLabel} ${member.full_name} (${member.email})?`)) {
      return;
    }

    try {
      setProcessingMemberId(member.id);
      setBannerMsg(null);

      const res = await fetch('/api/sic/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          email: member.email,
          full_name: member.full_name,
          department: member.department,
          designation: member.designation,
          roll_number: member.roll_number,
          status: newStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setBannerMsg({ type: 'error', text: json.error || 'Failed to update member status.' });
        return;
      }

      setMembers(prev =>
        prev.map(m =>
          m.id === member.id || m.email.toLowerCase() === member.email.toLowerCase()
            ? { ...m, status: newStatus }
            : m
        )
      );

      setRegistrations(prev =>
        prev.map(r =>
          r.id === member.id ||
          r.member_id === member.id ||
          r.email.toLowerCase() === member.email.toLowerCase()
            ? { ...r, status: newStatus === 'SUSPENDED' ? 'SUSPENDED' : 'APPROVED' }
            : r
        )
      );

      setBannerMsg({ type: 'success', text: json.message });
    } catch {
      setBannerMsg({ type: 'error', text: 'Failed to update member status.' });
    } finally {
      setProcessingMemberId(null);
    }
  };

  // Remove Member Handler
  const handleRemoveMember = async (member: DirectoryMemberItem) => {
    if (!confirm(`Are you sure you want to remove ${member.full_name} (${member.email}) from SIC?`)) {
      return;
    }

    try {
      setProcessingMemberId(member.id);
      setBannerMsg(null);

      const res = await fetch(
        `/api/sic/members?id=${encodeURIComponent(member.id)}&email=${encodeURIComponent(member.email)}`,
        { method: 'DELETE' }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        setBannerMsg({ type: 'error', text: json.error || 'Failed to remove member.' });
        return;
      }

      setMembers(prev =>
        prev.filter(
          m => m.id !== member.id && m.email.toLowerCase() !== member.email.toLowerCase()
        )
      );
      setRegistrations(prev =>
        prev.filter(
          r =>
            r.id !== member.id &&
            r.member_id !== member.id &&
            r.email.toLowerCase() !== member.email.toLowerCase()
        )
      );

      setBannerMsg({ type: 'success', text: json.message });
    } catch {
      setBannerMsg({ type: 'error', text: 'Failed to remove member.' });
    } finally {
      setProcessingMemberId(null);
    }
  };

  // Filtered registrations
  const filteredRegistrations = registrations.filter(r => {
    if (regStatusFilter !== 'ALL' && r.status !== regStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.roll_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered members
  const filteredMembers = members.filter(m => {
    if (memberStatusFilter !== 'ALL' && m.status !== memberStatusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.member_code?.toLowerCase().includes(q) ||
      m.roll_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              SIC Members &amp; Administration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Approve applications, invite users, remove bans, or remove members from the directory.'
              : 'Institutional identities, roles, academic coordinates, and cross-group affiliations.'}
          </p>
        </div>

        {/* Admin Mode Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invite User</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('APPROVALS')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeView === 'APPROVALS'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Approvals</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-400 text-slate-950 font-black">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveView('DIRECTORY')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeView === 'DIRECTORY'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Directory ({members.length})</span>
                {bannedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-black">
                    {bannedCount} Banned
                  </span>
                )}
              </button>

              <Link
                href="/associate-admin/dashboard"
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Academic Setup</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-slate-400 hover:text-slate-600 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, roll number, or member code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
          />
        </div>

        {isAdmin && activeView === 'APPROVALS' && (
          <div className="flex flex-wrap gap-1.5">
            {(['PENDING', 'ALL', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setRegStatusFilter(st)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                  regStatusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {isAdmin && activeView === 'DIRECTORY' && (
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'ALL', label: `All (${members.length})` },
                { id: 'ACTIVE', label: `Approved (${members.filter(m => m.status === 'ACTIVE').length})` },
                { id: 'INACTIVE', label: `Pending (${members.filter(m => m.status === 'INACTIVE').length})` },
                { id: 'SUSPENDED', label: `Banned (${bannedCount})` },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMemberStatusFilter(tab.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                  memberStatusFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: ADMIN MEMBER APPROVALS QUEUE                                */}
      {/* =================================================================== */}
      {isAdmin && activeView === 'APPROVALS' && (
        <div className="space-y-4">
          {filteredRegistrations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                No {regStatusFilter !== 'ALL' ? regStatusFilter.toLowerCase().replace('_', ' ') : ''} member applications found
              </div>
              <p className="text-xs text-slate-400">
                When students submit the registration form at <code>/register</code>, their applications will appear here for approval.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRegistrations.map(reg => {
                const memberReqs = (reg.requested_groups || []).filter(rg => rg.request_type === 'MEMBER');
                const leaderReqs = (reg.requested_groups || []).filter(rg => rg.request_type === 'LEADER');

                return (
                  <div
                    key={reg.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                        {reg.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={reg.avatar_url} alt={reg.full_name} className="h-full w-full object-cover" />
                        ) : (
                          reg.full_name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900">{reg.full_name}</h3>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              reg.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : reg.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : reg.status === 'NEEDS_CORRECTION'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {reg.status === 'SUSPENDED' ? 'BANNED / SUSPENDED' : reg.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Roll: {reg.roll_number}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> {reg.email}
                          </span>
                          {reg.college && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3.5 w-3.5 text-slate-400" /> {reg.college.name} ({reg.college.code})
                            </span>
                          )}
                          {reg.course && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> {reg.course.code} •{' '}
                              {reg.academic_year?.year_name} • {reg.division?.name}
                            </span>
                          )}
                        </div>

                        {/* Requested Groups */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {memberReqs.map(rg => (
                            <span
                              key={rg.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                            >
                              Member: {rg.group?.name || rg.group?.code || 'SIC Group'}
                            </span>
                          ))}
                          {leaderReqs.map(rg => (
                            <span
                              key={rg.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1"
                            >
                              <Crown className="h-3 w-3 text-amber-600" />
                              Lead Request: {rg.group?.name || rg.group?.code || 'SIC Group'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {reg.status !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => openReviewModal(reg, 'APPROVE')}
                          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {reg.status === 'SUSPENDED' || reg.status === 'REJECTED'
                              ? 'Remove Ban & Approve'
                              : 'Approve'}
                          </span>
                        </button>
                      )}

                      {reg.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openReviewModal(reg, 'REQUEST_CORRECTION')}
                            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Request Correction
                          </button>
                          <button
                            type="button"
                            onClick={() => openReviewModal(reg, 'REJECT')}
                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {reg.status !== 'SUSPENDED' && (
                        <button
                          type="button"
                          disabled={processingMemberId === (reg.member_id || reg.id)}
                          onClick={() =>
                            handleSetMemberStatus(
                              {
                                id: reg.member_id || reg.id,
                                auth_user_id: reg.auth_user_id,
                                member_code: `SIC-${reg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
                                full_name: reg.full_name,
                                email: reg.email,
                                phone: null,
                                department: reg.course?.name || 'Innovation & Operations',
                                designation: 'SIC Member',
                                org_role: 'MEMBER',
                                status: 'SUSPENDED',
                                avatar_url: reg.avatar_url || null,
                                roll_number: reg.roll_number,
                                created_at: reg.created_at,
                                updated_at: reg.updated_at,
                              },
                              'SUSPENDED'
                            )
                          }
                          className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Ban</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={processingMemberId === (reg.member_id || reg.id)}
                        onClick={() =>
                          handleRemoveMember({
                            id: reg.member_id || reg.id,
                            auth_user_id: reg.auth_user_id,
                            member_code: `SIC-${reg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
                            full_name: reg.full_name,
                            email: reg.email,
                            phone: null,
                            department: reg.course?.name || 'Innovation & Operations',
                            designation: 'SIC Member',
                            org_role: 'MEMBER',
                            status: 'INACTIVE',
                            avatar_url: reg.avatar_url || null,
                            roll_number: reg.roll_number,
                            created_at: reg.created_at,
                            updated_at: reg.updated_at,
                          })
                        }
                        className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: APPROVED & MANAGED MEMBER DIRECTORY                         */}
      {/* =================================================================== */}
      {(!isAdmin || activeView === 'DIRECTORY') && (
        <div>
          {filteredMembers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
              <Users className="h-8 w-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">No Matching SIC Members</div>
              <p className="text-xs text-slate-400">
                Use the &quot;Invite User&quot; button above or approve pending registrations to add members.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map(member => {
                const activeGroups = member.activeGroups || [];
                const isBanned = member.status === 'SUSPENDED';
                const isPending = member.status === 'INACTIVE';

                return (
                  <div
                    key={member.id}
                    className={`bg-white p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all ${
                      isBanned
                        ? 'border-rose-300 bg-rose-50/20'
                        : isPending
                        ? 'border-amber-300 bg-amber-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {member.member_code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isBanned && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              BANNED
                            </span>
                          )}
                          {isPending && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              PENDING APPROVAL
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              member.org_role === 'SUPER_ADMIN' ||
                              member.org_role === 'SIC_DIRECTOR' ||
                              member.org_role === 'SIC_ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : member.org_role === 'ASSOCIATE_ADMIN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {member.org_role?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm overflow-hidden shrink-0">
                          {member.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover" />
                          ) : (
                            member.full_name?.charAt(0).toUpperCase() || 'M'
                          )}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-slate-900 truncate">{member.full_name}</h2>
                          <div className="text-xs text-slate-500 truncate">{member.designation}</div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {member.college?.name || member.department}
                          </span>
                        </div>
                        {member.roll_number && (
                          <div className="flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                              Roll: {member.roll_number}
                              {member.course ? ` • ${member.course.code}` : ''}
                              {member.division ? ` (${member.division.name})` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>

                      {/* Group Memberships */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                          <Layers className="h-3 w-3" /> Group Affiliations ({activeGroups.length}):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {activeGroups.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No groups assigned</span>
                          ) : (
                            activeGroups.map(g => (
                              <span
                                key={g.code + g.name}
                                className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md"
                              >
                                {g.code || g.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Management Controls (Approve / Ban / Remove) */}
                    {isAdmin && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={processingMemberId === member.id || member.status === 'ACTIVE'}
                          onClick={() => handleSetMemberStatus(member, 'ACTIVE')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            member.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                              : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs cursor-pointer'
                          } disabled:opacity-75`}
                        >
                          {processingMemberId === member.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>
                                {member.status === 'ACTIVE'
                                  ? 'Approved'
                                  : isBanned
                                  ? 'Approve / Unban'
                                  : 'Approve'}
                              </span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={processingMemberId === member.id || isBanned}
                          onClick={() => handleSetMemberStatus(member, 'SUSPENDED')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            isBanned
                              ? 'bg-rose-100 text-rose-800 border border-rose-200 cursor-default'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer'
                          } disabled:opacity-75`}
                        >
                          {processingMemberId === member.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Ban className="h-3.5 w-3.5" />
                              <span>{isBanned ? 'Banned' : 'Ban'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={processingMemberId === member.id}
                          onClick={() => handleRemoveMember(member)}
                          className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="Remove Member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: INVITE / ADD USER                                            */}
      {/* =================================================================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleInviteUser}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Invite / Add SIC User</h2>
                <p className="text-[11px] text-slate-500">
                  Pre-authorize a user by email so they gain immediate access when signing in with Google.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Sharma"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Google / Institutional Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@gmail.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as OrgRole)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                >
                  <option value="MEMBER">SIC Member</option>
                  <option value="ASSOCIATE_ADMIN">Associate Admin</option>
                  <option value="SIC_ADMIN">SIC Admin</option>
                  <option value="SIC_DIRECTOR">SIC Director</option>
                  <option value="OPERATIONS_MANAGER">Operations Manager</option>
                  <option value="ATTENDANCE_AUDITOR">Attendance Auditor</option>
                  {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Roll Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-PGDM-01"
                  value={inviteRollNo}
                  onChange={e => setInviteRollNo(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Department / College</label>
                <input
                  type="text"
                  value={inviteDept}
                  onChange={e => setInviteDept(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Designation</label>
                <input
                  type="text"
                  value={inviteDesignation}
                  onChange={e => setInviteDesignation(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {availableGroups.length > 0 && (
              <div className="space-y-1.5 text-xs pt-2">
                <label className="font-bold text-slate-700 block">
                  Assign to SIC Groups (Optional):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableGroups.map(g => {
                    const checked = inviteGroupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setInviteGroupIds(prev =>
                              checked ? prev.filter(id => id !== g.id) : [...prev, g.id]
                            )
                          }
                          className="rounded text-emerald-600"
                        />
                        <span className="font-semibold">
                          {g.name} ({g.code})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isInviting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                <span>Invite &amp; Activate User</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* REVIEW MODAL (APPROVE / REQUEST CORRECTION / REJECT)                */}
      {/* =================================================================== */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">
                {reviewAction === 'APPROVE' && 'Approve SIC Member Registration'}
                {reviewAction === 'REQUEST_CORRECTION' && 'Request Registration Correction'}
                {reviewAction === 'REJECT' && 'Reject Member Registration'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Full Name:</strong> {reviewTarget.full_name}
              </div>
              <div>
                <strong>Email:</strong> {reviewTarget.email}
              </div>
              <div>
                <strong>Roll Number:</strong> {reviewTarget.roll_number}
              </div>
              {reviewTarget.college && (
                <div>
                  <strong>Academic:</strong> {reviewTarget.college.name} • {reviewTarget.course?.name} •{' '}
                  {reviewTarget.academic_year?.year_name} ({reviewTarget.division?.name})
                </div>
              )}
            </div>

            {reviewAction === 'APPROVE' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5">
                    Approve Requested Group Memberships:
                  </label>
                  {(reviewTarget.requested_groups || []).filter(rg => rg.request_type === 'MEMBER')
                    .length === 0 ? (
                    <p className="text-slate-400 italic">No specific group memberships requested.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(reviewTarget.requested_groups || [])
                        .filter(rg => rg.request_type === 'MEMBER')
                        .map(rg => {
                          const checked = approvedGroups.includes(rg.group_id);
                          return (
                            <label
                              key={rg.id}
                              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setApprovedGroups(prev =>
                                    checked ? prev.filter(id => id !== rg.group_id) : [...prev, rg.group_id]
                                  )
                                }
                                className="rounded text-emerald-600"
                              />
                              <span className="font-semibold">
                                {rg.group?.name || 'SIC Group'} ({rg.group?.code || 'SIC'})
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    Approve Leadership Requests (Optional):
                  </label>
                  {(reviewTarget.requested_groups || []).filter(rg => rg.request_type === 'LEADER')
                    .length === 0 ? (
                    <p className="text-slate-400 italic">No leadership roles requested.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(reviewTarget.requested_groups || [])
                        .filter(rg => rg.request_type === 'LEADER')
                        .map(rg => {
                          const checked = approvedLeaderGroups.includes(rg.group_id);
                          return (
                            <label
                              key={rg.id}
                              className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setApprovedLeaderGroups(prev =>
                                    checked ? prev.filter(id => id !== rg.group_id) : [...prev, rg.group_id]
                                  )
                                }
                                className="rounded text-amber-600"
                              />
                              <span className="font-semibold">
                                {rg.group?.name || 'SIC Group'} (Group Lead)
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(reviewAction === 'REQUEST_CORRECTION' || reviewAction === 'REJECT') && (
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-800 block">
                  {reviewAction === 'REQUEST_CORRECTION'
                    ? 'Correction Instructions for Student:'
                    : 'Reason for Rejection:'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide clear feedback for the applicant..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleConfirmReview}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  reviewAction === 'APPROVE'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : reviewAction === 'REQUEST_CORRECTION'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmittingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm {reviewAction.replace('_', ' ')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
