'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Users,
  Crown,
  Plus,
  UserCheck,
  Search,
  Settings2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Group, GroupType, LeadType, Member } from '@/lib/types/sic';

interface GroupsDirectoryClientProps {
  initialGroups: Group[];
  availableMembers: Member[];
  currentMember: {
    id: string;
    email: string;
    full_name: string;
    member_code: string;
    org_role: string;
  } | null;
  isAdmin: boolean;
}

export function GroupsDirectoryClient({
  initialGroups,
  availableMembers,
  currentMember,
  isAdmin,
}: GroupsDirectoryClientProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MY_MEMBER' | 'MY_LEADER'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Group Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createType, setCreateType] = useState<GroupType>('PERMANENT');
  const [createGraceMins, setCreateGraceMins] = useState(15);
  const [createMinAttendance, setCreateMinAttendance] = useState(75);
  const [createLeaders, setCreateLeaders] = useState<Record<string, LeadType>>({});
  const [createMemberIds, setCreateMemberIds] = useState<string[]>([]);
  const [memberSearchInCreate, setMemberSearchInCreate] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Edit Group Leaders & Roster Modal State
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editLeaders, setEditLeaders] = useState<Record<string, LeadType>>({});
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [memberSearchInEdit, setMemberSearchInEdit] = useState('');
  const [savingRoster, setSavingRoster] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const currentEmail = currentMember?.email?.toLowerCase() || '';
  const currentId = currentMember?.id || '';

  // Helper to check if current user is a leader in a group
  const getCurrentUserLeadRole = (group: Group): LeadType | null => {
    if (!currentMember) return null;
    const activeLeads = (group.group_leads || []).filter(l => l.is_active);
    for (const l of activeLeads) {
      const mem = Array.isArray(l.member) ? l.member[0] : l.member;
      if (
        l.member_id === currentId ||
        mem?.id === currentId ||
        (currentEmail && mem?.email?.toLowerCase() === currentEmail)
      ) {
        return l.lead_type;
      }
    }
    return null;
  };

  // Helper to check if current user is an enrolled member in a group
  const isCurrentUserMember = (group: Group): boolean => {
    if (!currentMember) return false;
    if (getCurrentUserLeadRole(group)) return true; // Leaders are also in the group
    const activeMembers = (group.group_memberships || []).filter(m => m.status === 'ACTIVE');
    for (const m of activeMembers) {
      const mem = Array.isArray(m.member) ? m.member[0] : m.member;
      if (
        m.member_id === currentId ||
        mem?.id === currentId ||
        (currentEmail && mem?.email?.toLowerCase() === currentEmail)
      ) {
        return true;
      }
    }
    return false;
  };

  // Compute current user's groups summary
  const myLeaderGroups = useMemo(
    () => groups.filter(g => getCurrentUserLeadRole(g) !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, currentId, currentEmail]
  );

  const myMemberGroups = useMemo(
    () => groups.filter(g => isCurrentUserMember(g)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, currentId, currentEmail]
  );

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (activeFilter === 'MY_LEADER' && !getCurrentUserLeadRole(g)) return false;
      if (activeFilter === 'MY_MEMBER' && !isCurrentUserMember(g)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchesGroup =
        g.name.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q);

      const matchesLeader = (g.group_leads || []).some(l => {
        const mem = Array.isArray(l.member) ? l.member[0] : l.member;
        return (
          mem?.full_name?.toLowerCase().includes(q) ||
          mem?.email?.toLowerCase().includes(q) ||
          mem?.member_code?.toLowerCase().includes(q)
        );
      });

      const matchesMember = (g.group_memberships || []).some(m => {
        const mem = Array.isArray(m.member) ? m.member[0] : m.member;
        return (
          mem?.full_name?.toLowerCase().includes(q) ||
          mem?.email?.toLowerCase().includes(q) ||
          mem?.member_code?.toLowerCase().includes(q)
        );
      });

      return matchesGroup || matchesLeader || matchesMember;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, activeFilter, searchQuery, currentId, currentEmail]);

  // Toggle leader selection in Create Modal
  const toggleCreateLeader = (memberId: string) => {
    setCreateLeaders(prev => {
      const next = { ...prev };
      if (next[memberId]) {
        delete next[memberId];
      } else {
        next[memberId] = 'PRIMARY_LEAD';
        // Also ensure added as member
        setCreateMemberIds(mPrev => (mPrev.includes(memberId) ? mPrev : [...mPrev, memberId]));
      }
      return next;
    });
  };

  const changeCreateLeaderType = (memberId: string, leadType: LeadType) => {
    setCreateLeaders(prev => ({
      ...prev,
      [memberId]: leadType,
    }));
  };

  const toggleCreateMember = (memberId: string) => {
    setCreateMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  // Handle Group Creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createCode.trim()) return;

    setCreatingGroup(true);
    setFeedback(null);

    try {
      const leadersPayload = Object.entries(createLeaders).map(([member_id, lead_type]) => ({
        member_id,
        lead_type,
      }));

      const res = await fetch('/api/sic/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          code: createCode.trim().toUpperCase(),
          description: createDescription.trim() || null,
          group_type: createType,
          grace_period_mins: Number(createGraceMins) || 15,
          min_attendance_pct: Number(createMinAttendance) || 75,
          leaders: leadersPayload,
          member_ids: createMemberIds,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', text: json.error || 'Failed to create group.' });
      } else {
        setGroups(prev => [...prev, json.data]);
        setFeedback({
          type: 'success',
          text: `Group "${json.data.name}" (${json.data.code}) created with ${leadersPayload.length} leader(s).`,
        });
        setShowCreateModal(false);
        setCreateName('');
        setCreateCode('');
        setCreateDescription('');
        setCreateType('PERMANENT');
        setCreateLeaders({});
        setCreateMemberIds([]);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error while creating group.' });
    } finally {
      setCreatingGroup(false);
    }
  };

  // Open Edit Leaders & Roster Modal
  const openEditModal = (group: Group) => {
    const initialLeaderMap: Record<string, LeadType> = {};
    for (const l of group.group_leads || []) {
      if (!l.is_active) continue;
      const mem = Array.isArray(l.member) ? l.member[0] : l.member;
      const mid = l.member_id || mem?.id;
      if (mid) initialLeaderMap[mid] = l.lead_type || 'PRIMARY_LEAD';
    }

    const initialMemberList: string[] = [];
    for (const m of group.group_memberships || []) {
      if (m.status !== 'ACTIVE') continue;
      const mem = Array.isArray(m.member) ? m.member[0] : m.member;
      const mid = m.member_id || mem?.id;
      if (mid && !initialMemberList.includes(mid)) initialMemberList.push(mid);
    }

    setEditingGroup(group);
    setEditLeaders(initialLeaderMap);
    setEditMemberIds(initialMemberList);
    setMemberSearchInEdit('');
  };

  const toggleEditLeader = (memberId: string) => {
    setEditLeaders(prev => {
      const next = { ...prev };
      if (next[memberId]) {
        delete next[memberId];
      } else {
        next[memberId] = 'PRIMARY_LEAD';
        setEditMemberIds(mPrev => (mPrev.includes(memberId) ? mPrev : [...mPrev, memberId]));
      }
      return next;
    });
  };

  const changeEditLeaderType = (memberId: string, leadType: LeadType) => {
    setEditLeaders(prev => ({
      ...prev,
      [memberId]: leadType,
    }));
  };

  const toggleEditMember = (memberId: string) => {
    setEditMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSaveRoster = async () => {
    if (!editingGroup) return;
    setSavingRoster(true);
    setFeedback(null);

    try {
      const leadersPayload = Object.entries(editLeaders).map(([member_id, lead_type]) => ({
        member_id,
        lead_type,
      }));

      const res = await fetch('/api/sic/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: editingGroup.id,
          leaders: leadersPayload,
          member_ids: editMemberIds,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', text: json.error || 'Failed to update group leaders and members.' });
      } else {
        setGroups(prev => prev.map(g => (g.id === editingGroup.id ? json.data : g)));
        setFeedback({
          type: 'success',
          text: `Updated "${editingGroup.name}" with ${leadersPayload.length} leader(s) and ${json.data.group_memberships?.length || 0} member(s).`,
        });
        setEditingGroup(null);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error while updating group.' });
    } finally {
      setSavingRoster(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Delete group "${group.name}" (${group.code})?`)) return;
    setDeletingGroupId(group.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/sic/groups?id=${encodeURIComponent(group.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', text: json.error || 'Failed to delete group.' });
      } else {
        setGroups(prev => prev.filter(g => g.id !== group.id));
        setFeedback({ type: 'success', text: `Deleted group "${group.name}".` });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error while deleting group.' });
    } finally {
      setDeletingGroupId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-700" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              SIC Innovation Groups &amp; Multi-Leaders
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            View your enrolled SIC groups and leadership assignments, or manage research wings and multiple group leaders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Create Group &amp; Assign Leaders
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SIC Member Personal Group & Leadership Status Card */}
      {currentMember && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-emerald-800/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                Your SIC Group Standing
              </div>
              <h2 className="text-lg font-extrabold mt-0.5">
                {currentMember.full_name}{' '}
                <span className="text-xs font-mono text-slate-400 font-normal">
                  ({currentMember.member_code})
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeFilter === 'ALL'
                    ? 'bg-white text-slate-900'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                All Groups ({groups.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('MY_MEMBER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeFilter === 'MY_MEMBER'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                My Groups ({myMemberGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('MY_LEADER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeFilter === 'MY_LEADER'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                Groups I Lead ({myLeaderGroups.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Groups where current user is a Leader */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                <Crown className="h-4 w-4" />
                Groups You Lead ({myLeaderGroups.length})
              </div>
              {myLeaderGroups.length === 0 ? (
                <p className="text-xs text-slate-400">
                  You are not currently assigned as a Group Leader for any group.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {myLeaderGroups.map(g => {
                    const role = getCurrentUserLeadRole(g);
                    return (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs font-bold"
                      >
                        <Crown className="h-3.5 w-3.5 text-amber-400" />
                        <span>
                          {g.name} ({g.code})
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-[10px] uppercase">
                          {role === 'PRIMARY_LEAD' ? 'Leader' : 'Co-Lead'}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Groups where current user is a Member */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-2">
                <Users className="h-4 w-4" />
                Groups You Are In ({myMemberGroups.length})
              </div>
              {myMemberGroups.length === 0 ? (
                <p className="text-xs text-slate-400">
                  You are not enrolled as a member in any SIC group yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {myMemberGroups.map(g => {
                    const isLead = getCurrentUserLeadRole(g) !== null;
                    return (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>
                          {g.name} ({g.code})
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-400/20 text-[10px] uppercase">
                          {isLead ? 'Leader & Member' : 'Member'}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search groups, codes, leaders, or members..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing <span className="font-bold text-slate-900">{filteredGroups.length}</span> of{' '}
          <span className="font-bold text-slate-900">{groups.length}</span> groups
        </div>
      </div>

      {/* Empty State */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No SIC Groups Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {groups.length === 0
              ? isAdmin
                ? 'No groups have been created yet. Click "Create Group & Assign Leaders" above to create your first SIC group.'
                : 'No innovation groups have been published by the administrator yet.'
              : 'No groups match your current filter or search query.'}
          </p>
          {isAdmin && groups.length === 0 && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First SIC Group
            </button>
          )}
        </div>
      ) : (
        /* Groups Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGroups.map(group => {
            const leads = (group.group_leads || []).filter(l => l.is_active);
            const activeMembers = (group.group_memberships || []).filter(
              m => m.status === 'ACTIVE'
            );
            const myLeadRole = getCurrentUserLeadRole(group);
            const myMembership = isCurrentUserMember(group);

            // Set of leader emails/IDs to badge them in the member roster too
            const leaderRoleByMemberKey = new Map<string, LeadType>();
            for (const l of leads) {
              const mem = Array.isArray(l.member) ? l.member[0] : l.member;
              if (l.member_id) leaderRoleByMemberKey.set(l.member_id, l.lead_type);
              if (mem?.id) leaderRoleByMemberKey.set(mem.id, l.lead_type);
              if (mem?.email) leaderRoleByMemberKey.set(mem.email.toLowerCase(), l.lead_type);
            }

            return (
              <div
                key={group.id}
                className={`bg-white rounded-3xl border p-6 shadow-xs flex flex-col justify-between space-y-6 transition-all ${
                  myLeadRole
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : myMembership
                    ? 'border-emerald-300 ring-2 ring-emerald-500/15'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {group.code}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">
                        {group.group_type}
                      </span>
                    </div>

                    {/* Personal Role Indicator Badges */}
                    <div className="flex items-center gap-1.5">
                      {myLeadRole && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <Crown className="h-3 w-3 text-amber-600" />
                          You are {myLeadRole === 'PRIMARY_LEAD' ? 'Group Leader' : 'Co-Leader'}
                        </span>
                      )}
                      {!myLeadRole && myMembership && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                          You are a Member
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Group Title & Description */}
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{group.name}</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {group.description || 'Specialized SIC innovation and research unit.'}
                      </p>
                    </div>

                    {/* Admin Controls for this Group */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(group)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                          title="Assign or update multiple group leaders and members"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Manage Leaders &amp; Members
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          disabled={deletingGroupId === group.id}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                          title="Delete Group"
                        >
                          {deletingGroupId === group.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multi-Leads Section */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-emerald-700" />
                        Group Leaders ({leads.length}):
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => openEditModal(group)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                          + Assign / Edit Leaders
                        </button>
                      )}
                    </div>

                    {leads.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 italic">
                        No group leaders assigned yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {leads.map(l => {
                          const mem = Array.isArray(l.member) ? l.member[0] : l.member;
                          const isMe =
                            currentMember &&
                            (l.member_id === currentId ||
                              mem?.id === currentId ||
                              (currentEmail && mem?.email?.toLowerCase() === currentEmail));

                          return (
                            <div
                              key={l.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                isMe
                                  ? 'bg-amber-50/80 border-amber-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                                  <span className="truncate">{mem?.full_name || 'SIC Leader'}</span>
                                  {isMe && (
                                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/70 px-1.5 py-0.2 rounded">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 truncate">
                                  {mem?.member_code || mem?.email}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                  l.lead_type === 'PRIMARY_LEAD'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {l.lead_type === 'PRIMARY_LEAD' ? 'Leader' : 'Co-Lead'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Members Roster */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-slate-400" />
                        Group Members ({activeMembers.length}):
                      </span>
                    </div>

                    {activeMembers.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 italic">
                        No members enrolled in this group yet.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {activeMembers.map(m => {
                          const mem = Array.isArray(m.member) ? m.member[0] : m.member;
                          const isMe =
                            currentMember &&
                            (m.member_id === currentId ||
                              mem?.id === currentId ||
                              (currentEmail && mem?.email?.toLowerCase() === currentEmail));

                          const memberLeadRole =
                            leaderRoleByMemberKey.get(m.member_id) ||
                            (mem?.id ? leaderRoleByMemberKey.get(mem.id) : undefined) ||
                            (mem?.email
                              ? leaderRoleByMemberKey.get(mem.email.toLowerCase())
                              : undefined);

                          return (
                            <div
                              key={m.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                                isMe
                                  ? 'bg-emerald-50/80 border-emerald-300 font-bold'
                                  : 'bg-slate-50/70 border-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-slate-800 truncate">
                                  {mem?.full_name || 'SIC Member'}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-950">
                                    YOU
                                  </span>
                                )}
                                {memberLeadRole && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    {memberLeadRole === 'PRIMARY_LEAD' ? 'Leader' : 'Co-Lead'}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 shrink-0">
                                {mem?.member_code || mem?.email}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendance Policy Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Grace Period: {group.attendance_policy?.grace_period_mins ?? 15} mins
                  </span>
                  <span>
                    Minimum Attendance: {group.attendance_policy?.min_attendance_pct ?? 75}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADMIN MODAL 1: CREATE GROUP & ASSIGN MULTIPLE GROUP LEADERS            */}
      {/* ===================================================================== */}
      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-700" />
                  Create SIC Group &amp; Assign Group Leaders
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure a new group and select one or multiple Group Leaders and members.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="e.g. AI & Autonomous Robotics Wing"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Group Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={createCode}
                    onChange={e => setCreateCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SIC-AI"
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Group Type
                  </label>
                  <select
                    value={createType}
                    onChange={e => setCreateType(e.target.value as GroupType)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="PERMANENT">PERMANENT</option>
                    <option value="PROJECT">PROJECT</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="EVENT">EVENT</option>
                    <option value="TEMPORARY">TEMPORARY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grace Period (mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={createGraceMins}
                    onChange={e => setCreateGraceMins(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min Attendance (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={createMinAttendance}
                    onChange={e => setCreateMinAttendance(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  placeholder="Brief summary of the group's research focus or operational mandate..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Multi-Leader & Member Selection */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Assign Group Leaders (Multiple Allowed) &amp; Members
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Selected Leaders ({Object.keys(createLeaders).length}) • Selected Members (
                      {createMemberIds.length})
                    </p>
                  </div>
                  <input
                    type="text"
                    value={memberSearchInCreate}
                    onChange={e => setMemberSearchInCreate(e.target.value)}
                    placeholder="Filter members by name or email..."
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {availableMembers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    No registered members found yet. You can create the group now and assign leaders later, or invite members on <code>/sic/members</code>.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                    {availableMembers
                      .filter(m => {
                        if (!memberSearchInCreate.trim()) return true;
                        const q = memberSearchInCreate.toLowerCase();
                        return (
                          m.full_name.toLowerCase().includes(q) ||
                          m.email.toLowerCase().includes(q) ||
                          m.member_code.toLowerCase().includes(q)
                        );
                      })
                      .map(m => {
                        const isLeader = Boolean(createLeaders[m.id]);
                        const isMember = createMemberIds.includes(m.id) || isLeader;

                        return (
                          <div
                            key={m.id}
                            className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                              isLeader
                                ? 'bg-amber-50/60'
                                : isMember
                                ? 'bg-emerald-50/40'
                                : 'bg-white'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900">{m.full_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {m.email} • {m.member_code}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Toggle Member */}
                              <button
                                type="button"
                                onClick={() => toggleCreateMember(m.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  isMember
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {isMember ? '✓ Member' : '+ Member'}
                              </button>

                              {/* Toggle Leader (Multiple Supported) */}
                              <button
                                type="button"
                                onClick={() => toggleCreateLeader(m.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                                  isLeader
                                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <Crown className="h-3 w-3" />
                                {isLeader ? '✓ Group Leader' : '+ Make Leader'}
                              </button>

                              {/* Choose Lead Type if Leader */}
                              {isLeader && (
                                <select
                                  value={createLeaders[m.id]}
                                  onChange={e =>
                                    changeCreateLeaderType(m.id, e.target.value as LeadType)
                                  }
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-amber-300 text-amber-900"
                                >
                                  <option value="PRIMARY_LEAD">Primary Lead</option>
                                  <option value="CO_LEAD">Co-Lead</option>
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {creatingGroup ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Group
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADMIN MODAL 2: MANAGE MULTIPLE LEADERS & MEMBERS FOR EXISTING GROUP   */}
      {/* ===================================================================== */}
      {editingGroup && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {editingGroup.code}
                  </span>
                  <h2 className="text-lg font-black text-slate-900">{editingGroup.name}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Assign or remove multiple Group Leaders (Primary Lead / Co-Lead) and manage enrolled group members.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                  Leaders Assigned: {Object.keys(editLeaders).length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                  Members Enrolled:{' '}
                  {
                    Array.from(new Set([...editMemberIds, ...Object.keys(editLeaders)])).length
                  }
                </span>
              </div>
              <input
                type="text"
                value={memberSearchInEdit}
                onChange={e => setMemberSearchInEdit(e.target.value)}
                placeholder="Search members..."
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {availableMembers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                No members found in the directory yet. Invite or approve members on{' '}
                <code>/sic/members</code> first.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {availableMembers
                  .filter(m => {
                    if (!memberSearchInEdit.trim()) return true;
                    const q = memberSearchInEdit.toLowerCase();
                    return (
                      m.full_name.toLowerCase().includes(q) ||
                      m.email.toLowerCase().includes(q) ||
                      m.member_code.toLowerCase().includes(q)
                    );
                  })
                  .map(m => {
                    const isLeader = Boolean(editLeaders[m.id]);
                    const isMember = editMemberIds.includes(m.id) || isLeader;

                    return (
                      <div
                        key={m.id}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          isLeader
                            ? 'bg-amber-50/60'
                            : isMember
                            ? 'bg-emerald-50/40'
                            : 'bg-white'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{m.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {m.email} • {m.member_code}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleEditMember(m.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                              isMember
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isMember ? '✓ Member' : '+ Member'}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleEditLeader(m.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                              isLeader
                                ? 'bg-amber-500 text-slate-950 border-amber-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Crown className="h-3 w-3" />
                            {isLeader ? '✓ Group Leader' : '+ Make Leader'}
                          </button>

                          {isLeader && (
                            <select
                              value={editLeaders[m.id]}
                              onChange={e =>
                                changeEditLeaderType(m.id, e.target.value as LeadType)
                              }
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-amber-300 text-amber-900"
                            >
                              <option value="PRIMARY_LEAD">Primary Lead</option>
                              <option value="CO_LEAD">Co-Lead</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoster}
                disabled={savingRoster}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {savingRoster ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Save Leaders &amp; Members
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

