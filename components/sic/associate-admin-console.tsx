// ============================================================================
// SIC Unified Attendance & Operations Management System
// Component: Associate Admin Console
// Full Academic Structure Management & Multi-Group Member Approval Engine
// ============================================================================

'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  GraduationCap, 
  CalendarDays, 
  Layers, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Crown, 
  Search, 
  Filter, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText
} from 'lucide-react';
import { 
  College, 
  Course, 
  AcademicYear, 
  Division, 
  MemberRegistration, 
  Member, 
  RegistrationStatus 
} from '@/lib/types/sic';

interface Props {
  currentMember: Member;
  scope: {
    isAuthorized: boolean;
    isSuperAdmin: boolean;
    collegeIds: string[];
  };
  initialColleges: College[];
  initialCourses: Course[];
  initialYears: AcademicYear[];
  initialDivisions: Division[];
  initialRegistrations: MemberRegistration[];
}

export function AssociateAdminConsole({
  currentMember,
  scope,
  initialColleges,
  initialCourses,
  initialYears,
  initialDivisions,
  initialRegistrations,
}: Props) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'REGISTRATIONS' | 'ACADEMIC'>('REGISTRATIONS');

  // Academic Structure State
  const [colleges, setColleges] = useState<College[]>(initialColleges);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialYears);
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions);

  // Selected filters for Academic Hierarchy tree
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(initialColleges[0]?.id || '');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  // Registrations State
  const [registrations, setRegistrations] = useState<MemberRegistration[]>(initialRegistrations);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCollegeId, setFilterCollegeId] = useState<string>('ALL');

  // Modal State for Review Actions
  const [reviewModalTarget, setReviewModalTarget] = useState<MemberRegistration | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [approvedGroups, setApprovedGroups] = useState<string[]>([]);
  const [approvedLeaderGroups, setApprovedLeaderGroups] = useState<string[]>([]);
  const [isProcessingReview, setIsProcessingReview] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals for Adding Academic Entities
  const [showAddCollegeModal, setShowAddCollegeModal] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');
  const [newCollegeDesc, setNewCollegeDesc] = useState('');

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseDuration, setNewCourseDuration] = useState(3);

  const [showAddDivisionModal, setShowAddDivisionModal] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('Division A');
  const [batchDivisionCount, setBatchDivisionCount] = useState(3);

  // --------------------------------------------------------------------------
  // Review Actions: Approve, Reject, Request Correction
  // --------------------------------------------------------------------------
  const openReviewModal = (reg: MemberRegistration, action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION') => {
    setReviewModalTarget(reg);
    setReviewAction(action);
    setReviewNotes('');

    // Pre-select all requested member and leader groups
    const mGroups = (reg.requested_groups || [])
      .filter(rg => rg.request_type === 'MEMBER')
      .map(rg => rg.group_id);
    const lGroups = (reg.requested_groups || [])
      .filter(rg => rg.request_type === 'LEADER')
      .map(rg => rg.group_id);

    setApprovedGroups(mGroups);
    setApprovedLeaderGroups(lGroups);
  };

  const handleExecuteReview = async () => {
    if (!reviewModalTarget) return;

    if (reviewAction === 'REQUEST_CORRECTION' && !reviewNotes.trim()) {
      alert('Please specify the correction details for the applicant.');
      return;
    }

    try {
      setIsProcessingReview(true);
      const res = await fetch(`/api/sic/associate-admin/registrations/${reviewModalTarget.id}/review`, {
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
        setFeedbackMessage({ type: 'error', text: json.error || 'Failed to process review' });
        return;
      }

      // Update local registrations list
      setRegistrations(prev =>
        prev.map(r => (r.id === reviewModalTarget.id ? json.data : r))
      );

      setFeedbackMessage({ type: 'success', text: json.message });
      setReviewModalTarget(null);
    } catch (err: unknown) {
      setFeedbackMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setIsProcessingReview(false);
    }
  };

  // --------------------------------------------------------------------------
  // Academic Creation Handlers
  // --------------------------------------------------------------------------
  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sic/academic/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollegeName, code: newCollegeCode, description: newCollegeDesc }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setColleges(prev => [...prev, json.data]);
        setShowAddCollegeModal(false);
        setNewCollegeName('');
        setNewCollegeCode('');
        setNewCollegeDesc('');
      } else {
        alert(json.error || 'Failed to create college');
      }
    } catch (e) {
      alert('Error creating college');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollegeId) return;
    try {
      const res = await fetch('/api/sic/academic/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_id: selectedCollegeId,
          name: newCourseName,
          code: newCourseCode,
          duration_years: Number(newCourseDuration),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCourses(prev => [...prev, json.data]);
        setShowAddCourseModal(false);
        setNewCourseName('');
        setNewCourseCode('');
      } else {
        alert(json.error || 'Failed to create course');
      }
    } catch {
      alert('Error creating course');
    }
  };

  const handleBatchSetDivisions = async () => {
    if (!selectedCollegeId || !selectedCourseId || !selectedYearId) return;
    try {
      const res = await fetch('/api/sic/academic/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_id: selectedCollegeId,
          course_id: selectedCourseId,
          academic_year_id: selectedYearId,
          count: Number(batchDivisionCount),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDivisions(json.data);
        setShowAddDivisionModal(false);
      } else {
        alert(json.error || 'Failed to configure divisions');
      }
    } catch {
      alert('Error configuring divisions');
    }
  };

  const handleDeleteDivision = async (divId: string) => {
    if (!confirm('Are you sure you want to delete this division record?')) return;
    try {
      const res = await fetch(`/api/sic/academic/divisions?id=${divId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setDivisions(prev => prev.filter(d => d.id !== divId));
      }
    } catch {
      alert('Failed to delete division');
    }
  };

  // --------------------------------------------------------------------------
  // Filters & Derived Registrations
  // --------------------------------------------------------------------------
  const filteredRegistrations = registrations.filter(r => {
    // Status Filter
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

    // College Filter
    if (filterCollegeId !== 'ALL' && r.college_id !== filterCollegeId) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.full_name.toLowerCase().includes(q);
      const matchEmail = r.email.toLowerCase().includes(q);
      const matchRoll = r.roll_number.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll) return false;
    }

    return true;
  });

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length;
  const approvedCount = registrations.filter(r => r.status === 'APPROVED').length;
  const correctionCount = registrations.filter(r => r.status === 'NEEDS_CORRECTION').length;

  // Courses for the selected college
  const currentCollegeCourses = courses.filter(c => c.college_id === selectedCollegeId);

  // Years for selected course
  const currentCourseYears = academicYears.filter(y => y.course_id === selectedCourseId);

  // Divisions for selected year
  const currentYearDivisions = divisions.filter(d => d.academic_year_id === selectedYearId);

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner / Scope Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                {scope.isSuperAdmin
                  ? 'Platform Super Admin Scope (All Institutions)'
                  : `Associate Admin Scope: ${colleges.map(c => c.code).join(', ') || 'Assigned Colleges'}`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Associate Administrator Console
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Verify student identity, manage academic college hierarchies, configure divisions, and govern SIC membership approvals.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700/60 text-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center">
              {currentMember.full_name.charAt(0)}
            </div>
            <div className="pr-3 text-right">
              <div className="font-bold">{currentMember.full_name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{currentMember.member_code}</div>
            </div>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-black text-white mt-1">{pendingCount}</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Approved Members</div>
            <div className="text-2xl font-black text-white mt-1">{approvedCount}</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colleges Managed</div>
            <div className="text-2xl font-black text-white mt-1">{colleges.length}</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Divisions</div>
            <div className="text-2xl font-black text-white mt-1">{divisions.length}</div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('REGISTRATIONS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'REGISTRATIONS'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Membership Registrations</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ACADEMIC')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ACADEMIC'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Academic Structure (Colleges &bull; Courses &bull; Divisions)</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: MEMBERSHIP REGISTRATIONS                                       */}
      {/* ===================================================================== */}
      {activeTab === 'REGISTRATIONS' && (
        <div className="space-y-6">
          {/* Controls: Search & Status Pills */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'PENDING', label: 'Pending', count: pendingCount, color: 'amber' },
                { id: 'NEEDS_CORRECTION', label: 'Needs Correction', count: correctionCount, color: 'amber' },
                { id: 'APPROVED', label: 'Approved', count: approvedCount, color: 'emerald' },
                { id: 'REJECTED', label: 'Rejected', count: registrations.filter(r => r.status === 'REJECTED').length, color: 'rose' },
                { id: 'ALL', label: 'All Requests', count: registrations.length, color: 'slate' },
              ].map(pill => {
                const isActive = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & College Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, roll no, email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>

              {colleges.length > 1 && (
                <select
                  value={filterCollegeId}
                  onChange={e => setFilterCollegeId(e.target.value)}
                  className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                >
                  <option value="ALL">All Colleges</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Registrations List */}
          {filteredRegistrations.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Applications Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No member registrations match the selected filter ({statusFilter}).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRegistrations.map(reg => {
                const memberRequests = (reg.requested_groups || []).filter(rg => rg.request_type === 'MEMBER');
                const leaderRequests = (reg.requested_groups || []).filter(rg => rg.request_type === 'LEADER');

                return (
                  <div
                    key={reg.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition-all"
                  >
                    {/* Top Row: Applicant Identity & Status */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-600 text-lg">
                          {reg.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={reg.avatar_url} alt={reg.full_name} className="h-full w-full object-cover" />
                          ) : (
                            reg.full_name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{reg.full_name}</h3>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              Roll: {reg.roll_number}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{reg.email}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {reg.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="h-3 w-3" /> Pending Review
                          </span>
                        )}
                        {reg.status === 'NEEDS_CORRECTION' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertCircle className="h-3 w-3" /> Correction Requested
                          </span>
                        )}
                        {reg.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Approved Member
                          </span>
                        )}
                        {reg.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Academic Coordinates Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">College</div>
                        <div className="font-bold text-slate-800 mt-0.5 truncate">{reg.college?.name || reg.college_id}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Course</div>
                        <div className="font-bold text-slate-800 mt-0.5 truncate">{reg.course?.name || reg.course_id}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Academic Year</div>
                        <div className="font-bold text-slate-800 mt-0.5">{reg.academic_year?.year_name || 'Year'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Division</div>
                        <div className="font-bold text-slate-800 mt-0.5">{reg.division?.name || 'Division'}</div>
                      </div>
                    </div>

                    {/* Group Participation Requests */}
                    <div className="space-y-2 pt-1 text-xs">
                      {/* Member Of */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Member Of:</span>
                        {memberRequests.map(rg => (
                          <span
                            key={rg.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-[11px]"
                          >
                            {rg.group?.name || 'Group'} ({rg.group?.code || 'GRP'})
                          </span>
                        ))}
                      </div>

                      {/* Leader Of (Separately highlighted) */}
                      {leaderRequests.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <Crown className="h-3 w-3 text-amber-500" /> Leader Of (Requested):
                          </span>
                          {leaderRequests.map(rg => (
                            <span
                              key={rg.id}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-950 border border-amber-300 font-bold text-[11px] flex items-center gap-1"
                            >
                              <span>{rg.group?.name || 'Group'}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded-sm bg-amber-200 text-amber-900">
                                {rg.status}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Review Action Controls */}
                    {reg.status === 'PENDING' && (
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openReviewModal(reg, 'REQUEST_CORRECTION')}
                          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors border border-amber-200 cursor-pointer"
                        >
                          Request Correction
                        </button>
                        <button
                          type="button"
                          onClick={() => openReviewModal(reg, 'REJECT')}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => openReviewModal(reg, 'APPROVE')}
                          className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Review &amp; Approve</span>
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

      {/* ===================================================================== */}
      {/* TAB 2: ACADEMIC STRUCTURE MANAGEMENT                                 */}
      {/* ===================================================================== */}
      {activeTab === 'ACADEMIC' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Colleges & Courses */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
            {/* Colleges Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-700" /> Colleges ({colleges.length})
                </h3>
                {scope.isSuperAdmin && (
                  <button
                    onClick={() => setShowAddCollegeModal(true)}
                    className="p-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add College
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {colleges.map(c => {
                  const isSelected = selectedCollegeId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCollegeId(c.id);
                        setSelectedCourseId('');
                        setSelectedYearId('');
                      }}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/80 font-bold text-emerald-950 shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{c.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white border border-slate-200 font-mono text-slate-500">
                          {c.code}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courses for Selected College */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-emerald-700" /> Courses ({currentCollegeCourses.length})
                </h3>
                <button
                  onClick={() => setShowAddCourseModal(true)}
                  disabled={!selectedCollegeId}
                  className="p-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Course
                </button>
              </div>

              <div className="space-y-1.5">
                {currentCollegeCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No courses added yet for this college.</p>
                ) : (
                  currentCollegeCourses.map(course => {
                    const isSelected = selectedCourseId === course.id;
                    return (
                      <div
                        key={course.id}
                        onClick={() => {
                          setSelectedCourseId(course.id);
                          setSelectedYearId('');
                        }}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 font-bold text-emerald-950 shadow-2xs'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{course.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white border border-slate-200 font-mono text-slate-500">
                            {course.code}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Duration: {course.duration_years} Years
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Academic Years */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-700" /> Academic Years
            </h3>

            {!selectedCourseId ? (
              <p className="text-xs text-slate-400 p-8 text-center">
                Select a course on the left to view and configure academic years.
              </p>
            ) : (
              <div className="space-y-2">
                {currentCourseYears.map(year => {
                  const isSelected = selectedYearId === year.id;
                  const yearDivs = divisions.filter(d => d.academic_year_id === year.id);

                  return (
                    <div
                      key={year.id}
                      onClick={() => setSelectedYearId(year.id)}
                      className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/80 font-bold text-emerald-950 shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{year.year_name} (Year {year.year_number})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                          {yearDivs.length} Divisions
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Divisions (Actual Division Records & Dynamic Count) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-700" /> Divisions Configuration
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Count derived directly from actual division records
                </p>
              </div>

              {selectedYearId && (
                <button
                  onClick={() => setShowAddDivisionModal(true)}
                  className="p-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Configure
                </button>
              )}
            </div>

            {!selectedYearId ? (
              <p className="text-xs text-slate-400 p-8 text-center">
                Select an academic year to inspect and configure divisions.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Configured Divisions:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {currentYearDivisions.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {currentYearDivisions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-4 text-center">
                      No divisions configured yet for this year. Click &quot;Configure&quot; above to set division count.
                    </p>
                  ) : (
                    currentYearDivisions.map(div => (
                      <div
                        key={div.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">{div.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDivision(div.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove division"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* REVIEW ACTION MODAL (APPROVE / REJECT / CORRECTION)                    */}
      {/* ===================================================================== */}
      {reviewModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900">
                {reviewAction === 'APPROVE' && 'Approve Membership & Leadership'}
                {reviewAction === 'REQUEST_CORRECTION' && 'Request Application Correction'}
                {reviewAction === 'REJECT' && 'Reject Registration'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Applicant Details */}
            <div className="text-xs p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div><strong>Applicant:</strong> {reviewModalTarget.full_name}</div>
              <div><strong>Email:</strong> {reviewModalTarget.email}</div>
              <div><strong>Roll Number:</strong> {reviewModalTarget.roll_number}</div>
              <div><strong>College:</strong> {reviewModalTarget.college?.name}</div>
            </div>

            {/* If APPROVE: Group & Leadership Selectors */}
            {reviewAction === 'APPROVE' && (
              <div className="space-y-4 text-xs">
                {/* Membership Groups */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Approve Group Memberships:
                  </label>
                  <div className="space-y-1">
                    {(reviewModalTarget.requested_groups || [])
                      .filter(rg => rg.request_type === 'MEMBER')
                      .map(rg => {
                        const isChecked = approvedGroups.includes(rg.group_id);
                        return (
                          <label
                            key={rg.id}
                            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setApprovedGroups(prev =>
                                  isChecked ? prev.filter(g => g !== rg.group_id) : [...prev, rg.group_id]
                                );
                              }}
                              className="rounded text-emerald-600"
                            />
                            <span>{rg.group?.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Leadership Groups (Approved separately!) */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5 text-amber-900">
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    Review Leadership Requests (Separate Approval Required):
                  </label>
                  {(reviewModalTarget.requested_groups || []).filter(rg => rg.request_type === 'LEADER').length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No leadership requested by applicant.</p>
                  ) : (
                    <div className="space-y-1">
                      {(reviewModalTarget.requested_groups || [])
                        .filter(rg => rg.request_type === 'LEADER')
                        .map(rg => {
                          const isChecked = approvedLeaderGroups.includes(rg.group_id);
                          return (
                            <label
                              key={rg.id}
                              className="flex items-center gap-2 p-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setApprovedLeaderGroups(prev =>
                                    isChecked ? prev.filter(g => g !== rg.group_id) : [...prev, rg.group_id]
                                  );
                                }}
                                className="rounded text-amber-600"
                              />
                              <span className="font-semibold">{rg.group?.name} (Group Lead)</span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* If CORRECTION or REJECT: Notes Input */}
            {(reviewAction === 'REQUEST_CORRECTION' || reviewAction === 'REJECT') && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-800">
                  {reviewAction === 'REQUEST_CORRECTION' ? 'Correction Instructions (Sent to Applicant):' : 'Rejection Reason:'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Please correct your institutional roll number to match your student ID card..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModalTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessingReview}
                onClick={handleExecuteReview}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                  reviewAction === 'APPROVE'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : reviewAction === 'REQUEST_CORRECTION'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isProcessingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm {reviewAction.replace('_', ' ')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD COLLEGE                                                    */}
      {/* ===================================================================== */}
      {showAddCollegeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateCollege} className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add New College / Institution</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">College Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Chetana's Institute of Management"
                value={newCollegeName}
                onChange={e => setNewCollegeName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Short Code</label>
              <input
                type="text"
                required
                placeholder="e.g. CIMR"
                value={newCollegeCode}
                onChange={e => setNewCollegeCode(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 uppercase font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCollegeModal(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save College
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD COURSE                                                     */}
      {/* ===================================================================== */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateCourse} className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add Course to College</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Course / Degree Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Master of Business Administration"
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Course Code</label>
              <input
                type="text"
                required
                placeholder="e.g. MBA"
                value={newCourseCode}
                onChange={e => setNewCourseCode(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 uppercase font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Duration (Years)</label>
              <input
                type="number"
                min={1}
                max={6}
                value={newCourseDuration}
                onChange={e => setNewCourseDuration(Number(e.target.value))}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCourseModal(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Course
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CONFIGURE DIVISIONS (BATCH COUNT)                             */}
      {/* ===================================================================== */}
      {showAddDivisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Configure Divisions for Academic Year</h3>
            <p className="text-xs text-slate-500">
              Set the number of divisions. Divisions will be created as Division A, B, C...
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Number of Divisions (1 to 8)</label>
              <input
                type="number"
                min={1}
                max={8}
                value={batchDivisionCount}
                onChange={e => setBatchDivisionCount(Number(e.target.value))}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDivisionModal(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchSetDivisions}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Apply Divisions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
