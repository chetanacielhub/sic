// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /register
// Institutional Member Registration Form with Academic Hierarchy & Multi-Groups
// ============================================================================

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  GraduationCap, 
  CalendarDays, 
  Layers, 
  Hash, 
  Users, 
  Crown, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  ShieldAlert, 
  LogOut,
  Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { College, Course, AcademicYear, Division, Group } from '@/lib/types/sic';

function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCorrectionMode = searchParams.get('correction') === 'true';

  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string; avatar?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [memberGroupIds, setMemberGroupIds] = useState<string[]>([]);
  const [leaderGroupIds, setLeaderGroupIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Correction banner data
  const [correctionNotes, setCorrectionNotes] = useState<string | null>(null);

  // Academic Dropdown Data
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  // Loading & Submission State
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSubmitted, setSuccessSubmitted] = useState(false);

  const supabase = createClient();

  // 1. Check Authenticated Session & Prefill from Google / Existing Registration
  useEffect(() => {
    async function initUserSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?redirectTo=/register');
          return;
        }

        const gName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const gAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

        setCurrentUser({
          id: user.id,
          email: user.email,
          name: gName,
          avatar: gAvatar,
        });

        setFullName(gName);
        if (gAvatar) setAvatarUrl(gAvatar);

        // Fetch existing registration if any
        const regRes = await fetch('/api/sic/register');
        if (regRes.ok) {
          const regJson = await regRes.json();
          if (regJson.isApprovedMember) {
            router.push('/dashboard');
            return;
          }

          if (regJson.registration) {
            const reg = regJson.registration;
            if (reg.status === 'PENDING') {
              router.push('/registration-status');
              return;
            }
            if (reg.status === 'REJECTED' || reg.status === 'SUSPENDED') {
              router.push('/registration-status');
              return;
            }

            // NEEDS_CORRECTION -> prefill previous data
            if (reg.status === 'NEEDS_CORRECTION') {
              setCorrectionNotes(reg.correction_notes || 'Please update your submitted details.');
              setFullName(reg.full_name);
              setSelectedCollegeId(reg.college_id);
              setSelectedCourseId(reg.course_id);
              setSelectedYearId(reg.academic_year_id);
              setSelectedDivisionId(reg.division_id);
              setRollNumber(reg.roll_number);
              if (reg.avatar_url) setAvatarUrl(reg.avatar_url);

              // Pre-select requested groups
              const mGroups = (reg.requested_groups || [])
                .filter((rg: { request_type: string }) => rg.request_type === 'MEMBER')
                .map((rg: { group_id: string }) => rg.group_id);
              const lGroups = (reg.requested_groups || [])
                .filter((rg: { request_type: string }) => rg.request_type === 'LEADER')
                .map((rg: { group_id: string }) => rg.group_id);

              setMemberGroupIds(mGroups);
              setLeaderGroupIds(lGroups);
            }
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        setAuthChecking(false);
      }
    }

    initUserSession();
  }, [router, supabase]);

  // 2. Fetch Colleges and SIC Groups on mount
  useEffect(() => {
    async function loadInitialOptions() {
      try {
        const [collegesRes, groupsRes] = await Promise.all([
          fetch('/api/sic/academic/colleges'),
          fetch('/api/sic/groups'),
        ]);

        if (collegesRes.ok) {
          const json = await collegesRes.json();
          setColleges(json.data || []);
        }

        if (groupsRes.ok) {
          const json = await groupsRes.json();
          setAvailableGroups(json.data || []);
        }
      } catch (err) {
        console.error('Error loading colleges or groups:', err);
      }
    }

    loadInitialOptions();
  }, []);

  // 3. Dependent Dropdown: Courses when College changes
  useEffect(() => {
    if (!selectedCollegeId) {
      setCourses([]);
      setSelectedCourseId('');
      return;
    }

    async function loadCourses() {
      setLoadingCourses(true);
      try {
        const res = await fetch(`/api/sic/academic/courses?college_id=${selectedCollegeId}`);
        if (res.ok) {
          const json = await res.json();
          setCourses(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoadingCourses(false);
      }
    }

    loadCourses();
  }, [selectedCollegeId]);

  // 4. Dependent Dropdown: Academic Years when Course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setAcademicYears([]);
      setSelectedYearId('');
      return;
    }

    async function loadYears() {
      setLoadingYears(true);
      try {
        const res = await fetch(`/api/sic/academic/years?course_id=${selectedCourseId}`);
        if (res.ok) {
          const json = await res.json();
          setAcademicYears(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load academic years:', err);
      } finally {
        setLoadingYears(false);
      }
    }

    loadYears();
  }, [selectedCourseId]);

  // 5. Dependent Dropdown: Divisions when Year changes
  useEffect(() => {
    if (!selectedYearId) {
      setDivisions([]);
      setSelectedDivisionId('');
      return;
    }

    async function loadDivisions() {
      setLoadingDivisions(true);
      try {
        const res = await fetch(`/api/sic/academic/divisions?academic_year_id=${selectedYearId}`);
        if (res.ok) {
          const json = await res.json();
          setDivisions(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load divisions:', err);
      } finally {
        setLoadingDivisions(false);
      }
    }

    loadDivisions();
  }, [selectedYearId]);

  // Group Multi-Select Toggles
  const toggleMemberGroup = (groupId: string) => {
    setMemberGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleLeaderGroup = (groupId: string) => {
    setLeaderGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // Profile Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Only JPG, PNG, or WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be under 5MB.');
      return;
    }

    try {
      setUploadingAvatar(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/sic/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMessage(json.error || 'Failed to upload profile picture.');
        return;
      }

      setAvatarUrl(json.avatar_url);
    } catch {
      setErrorMessage('Error uploading image. You can continue and upload it later in your profile.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please provide your full legal name.');
      return;
    }
    if (!selectedCollegeId) {
      setErrorMessage('Please select your institution college.');
      return;
    }
    if (!selectedCourseId) {
      setErrorMessage('Please select your enrolled course.');
      return;
    }
    if (!selectedYearId) {
      setErrorMessage('Please select your academic year.');
      return;
    }
    if (!selectedDivisionId) {
      setErrorMessage('Please select your division.');
      return;
    }
    if (!rollNumber.trim()) {
      setErrorMessage('Please enter your institutional roll number.');
      return;
    }
    if (memberGroupIds.length === 0) {
      setErrorMessage('Please select at least one SIC Group under "Member Of".');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        full_name: fullName.trim(),
        college_id: selectedCollegeId,
        course_id: selectedCourseId,
        academic_year_id: selectedYearId,
        division_id: selectedDivisionId,
        roll_number: rollNumber.trim(),
        member_group_ids: memberGroupIds,
        leader_group_ids: leaderGroupIds,
        avatar_url: avatarUrl,
      };

      const res = await fetch('/api/sic/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMessage(json.error || 'Failed to submit registration. Please check your details.');
        return;
      }

      setSuccessSubmitted(true);
      setTimeout(() => {
        router.push('/registration-status');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-xs font-semibold text-slate-500">Verifying authenticated session...</p>
      </div>
    );
  }

  if (successSubmitted) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <div className="h-16 w-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto text-emerald-700 shadow-sm">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Application Submitted</h1>
        <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
          Your SIC membership application has been received and queued for Associate Administrator review. Redirecting to your status screen...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white font-bold text-lg shadow-sm">
              SIC
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                SIC Member Registration
              </h1>
              <p className="text-xs text-slate-500">
                Institutional Innovation &amp; Operations Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]">
              {currentUser?.email}
            </span>
          </div>
        </div>

        {/* Correction Notice Alert if applicable */}
        {correctionNotes && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-900">Application Correction Requested</div>
              <div className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {correctionNotes}
              </div>
              <div className="text-[11px] text-amber-700 mt-1 font-medium">
                Please review and correct the required fields below, then resubmit your application.
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <Info className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>
            Google authenticated successfully. To complete your SIC induction, submit your institutional details below for Associate Admin approval.
          </span>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Personal Details & Avatar */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> 1. Personal &amp; Profile Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Avatar Preview & Upload */}
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
              <div className="h-20 w-20 rounded-2xl bg-slate-200 overflow-hidden relative shadow-inner mb-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xl">
                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>

              <label className="cursor-pointer text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <Upload className="h-3 w-3" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-slate-400 mt-1">JPG, PNG, WebP &le; 5MB (Optional)</span>
            </div>

            {/* Full Name & Email */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name (Legal / Institutional)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Institutional Email (Verified by Google)</label>
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full text-xs p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Academic Hierarchy (Dependent Dropdowns) */}
        <div className="pt-6 border-t border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> 2. Academic Coordinates
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* College Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-slate-400" /> College / Institution
              </label>
              <select
                required
                value={selectedCollegeId}
                onChange={(e) => {
                  setSelectedCollegeId(e.target.value);
                  setSelectedCourseId('');
                  setSelectedYearId('');
                  setSelectedDivisionId('');
                }}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              >
                <option value="">Select College</option>
                {colleges.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Course Dropdown (Dependent on College) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <GraduationCap className="h-3 w-3 text-slate-400" /> Course / Program
              </label>
              <select
                required
                disabled={!selectedCollegeId || loadingCourses}
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedYearId('');
                  setSelectedDivisionId('');
                }}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium disabled:opacity-50"
              >
                <option value="">
                  {loadingCourses ? 'Loading Courses...' : selectedCollegeId ? 'Select Course' : 'Select College First'}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year Dropdown (Dependent on Course) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <CalendarDays className="h-3 w-3 text-slate-400" /> Year
              </label>
              <select
                required
                disabled={!selectedCourseId || loadingYears}
                value={selectedYearId}
                onChange={(e) => {
                  setSelectedYearId(e.target.value);
                  setSelectedDivisionId('');
                }}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium disabled:opacity-50"
              >
                <option value="">
                  {loadingYears ? 'Loading Years...' : selectedCourseId ? 'Select Academic Year' : 'Select Course First'}
                </option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name} (Year {year.year_number})
                  </option>
                ))}
              </select>
            </div>

            {/* Division Dropdown (Dependent on Academic Year) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Layers className="h-3 w-3 text-slate-400" /> Division
              </label>
              <select
                required
                disabled={!selectedYearId || loadingDivisions}
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium disabled:opacity-50"
              >
                <option value="">
                  {loadingDivisions ? 'Loading Divisions...' : selectedYearId ? 'Select Division' : 'Select Year First'}
                </option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Roll Number */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Hash className="h-3 w-3 text-slate-400" /> Institutional Roll Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2026-PGDM-042 or 104"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Roll number must match your college student ID card. Unique within your division.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: SIC Group Memberships (Member Of & Leader Of) */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> 3. SIC Group Participation &amp; Leadership
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Select one or more SIC wings you wish to join. Multi-group participation is supported.
            </p>
          </div>

          {/* Member Of (Multi-select) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Member Of (Requested Groups) <span className="text-rose-500">*</span></span>
              <span className="text-[11px] text-slate-400 font-normal">
                {memberGroupIds.length} selected
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableGroups.map((group) => {
                const isSelected = memberGroupIds.includes(group.id);
                return (
                  <div
                    key={`member-${group.id}`}
                    onClick={() => toggleMemberGroup(group.id)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>{group.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white border border-slate-200 font-mono text-slate-500">
                          {group.code}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-[10px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leader Of (Multi-select) */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                Leader Of (Optional Leadership Request)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {leaderGroupIds.length} requested
              </span>
            </label>

            <p className="text-[11px] text-slate-500">
              Request leadership for projects or groups you lead. Leadership is reviewed and approved separately by Administrators.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableGroups.map((group) => {
                const isSelected = leaderGroupIds.includes(group.id);
                return (
                  <div
                    key={`leader-${group.id}`}
                    onClick={() => toggleLeaderGroup(group.id)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>{group.name}</span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm font-semibold">
                          Lead Candidate
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            By submitting, you agree to adhere to the SIC Attendance &amp; Operations Policy.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting Registration...</span>
              </>
            ) : (
              <>
                <span>Submit for Associate Admin Review</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Registration Form...</div>}>
      <RegistrationForm />
    </Suspense>
  );
}
