// ============================================================================
// SIC Unified Attendance & Operations Management System
// Domain Engine: Academic Structure & Registration Store
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { 
  College, 
  Course, 
  AcademicYear, 
  Division, 
  MemberRegistration, 
  RegistrationGroup
} from '@/lib/types/sic';


// ----------------------------------------------------------------------------
// Default Institutional Academic Structure
// ----------------------------------------------------------------------------
export const SEED_COLLEGES: College[] = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    name: "Chetana's Institute of Management & Research",
    code: 'CIMR',
    description: 'Postgraduate Business, Innovation & Management Studies',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    name: "Chetana's Hazarimal Somani College of Commerce & Economics",
    code: 'CHSC',
    description: 'Undergraduate & Professional Programs in Commerce, IT & Management',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const SEED_COURSES: Course[] = [
  {
    id: 'f1111111-1111-1111-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    name: 'Post Graduate Diploma in Management (PGDM)',
    code: 'PGDM',
    duration_years: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f2222222-2222-2222-2222-222222222222',
    college_id: 'e2222222-2222-2222-2222-222222222222',
    name: 'Bachelor of Commerce (B.Com)',
    code: 'BCOM',
    duration_years: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f3333333-3333-3333-3333-333333333333',
    college_id: 'e2222222-2222-2222-2222-222222222222',
    name: 'Bachelor of Management Studies (BMS)',
    code: 'BMS',
    duration_years: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f4444444-4444-4444-4444-444444444444',
    college_id: 'e2222222-2222-2222-2222-222222222222',
    name: 'B.Sc Information Technology (B.Sc IT)',
    code: 'BSCIT',
    duration_years: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const SEED_YEARS: AcademicYear[] = [
  // PGDM
  { id: 'c1111111-0001-1111-1111-111111111111', course_id: 'f1111111-1111-1111-1111-111111111111', year_name: 'First Year', year_number: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c1111111-0002-1111-1111-111111111111', course_id: 'f1111111-1111-1111-1111-111111111111', year_name: 'Second Year', year_number: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // B.Com
  { id: 'c2222222-0001-1111-1111-111111111111', course_id: 'f2222222-2222-2222-2222-222222222222', year_name: 'First Year', year_number: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c2222222-0002-1111-1111-111111111111', course_id: 'f2222222-2222-2222-2222-222222222222', year_name: 'Second Year', year_number: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c2222222-0003-1111-1111-111111111111', course_id: 'f2222222-2222-2222-2222-222222222222', year_name: 'Third Year', year_number: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // BMS
  { id: 'c3333333-0001-1111-1111-111111111111', course_id: 'f3333333-3333-3333-3333-333333333333', year_name: 'First Year', year_number: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c3333333-0002-1111-1111-111111111111', course_id: 'f3333333-3333-3333-3333-333333333333', year_name: 'Second Year', year_number: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c3333333-0003-1111-1111-111111111111', course_id: 'f3333333-3333-3333-3333-333333333333', year_name: 'Third Year', year_number: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // B.Sc IT
  { id: 'c4444444-0001-1111-1111-111111111111', course_id: 'f4444444-4444-4444-4444-444444444444', year_name: 'First Year', year_number: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c4444444-0002-1111-1111-111111111111', course_id: 'f4444444-4444-4444-4444-444444444444', year_name: 'Second Year', year_number: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c4444444-0003-1111-1111-111111111111', course_id: 'f4444444-4444-4444-4444-444444444444', year_name: 'Third Year', year_number: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const SEED_DIVISIONS: Division[] = [
  // PGDM Year 1: A, B, C
  { id: 'd1111111-0001-1111-1111-111111111111', academic_year_id: 'c1111111-0001-1111-1111-111111111111', course_id: 'f1111111-1111-1111-1111-111111111111', college_id: 'e1111111-1111-1111-1111-111111111111', name: 'Division A', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd1111111-0002-1111-1111-111111111111', academic_year_id: 'c1111111-0001-1111-1111-111111111111', course_id: 'f1111111-1111-1111-1111-111111111111', college_id: 'e1111111-1111-1111-1111-111111111111', name: 'Division B', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd1111111-0003-1111-1111-111111111111', academic_year_id: 'c1111111-0001-1111-1111-111111111111', course_id: 'f1111111-1111-1111-1111-111111111111', college_id: 'e1111111-1111-1111-1111-111111111111', name: 'Division C', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // PGDM Year 2: A, B
  { id: 'd1111111-0004-1111-1111-111111111111', academic_year_id: 'c1111111-0002-1111-1111-111111111111', course_id: 'f1111111-1111-1111-1111-111111111111', college_id: 'e1111111-1111-1111-1111-111111111111', name: 'Division A', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd1111111-0005-1111-1111-111111111111', academic_year_id: 'c1111111-0002-1111-1111-111111111111', course_id: 'f1111111-1111-1111-1111-111111111111', college_id: 'e1111111-1111-1111-1111-111111111111', name: 'Division B', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // B.Com Year 1: A, B, C, D
  { id: 'd2222222-0001-1111-1111-111111111111', academic_year_id: 'c2222222-0001-1111-1111-111111111111', course_id: 'f2222222-2222-2222-2222-222222222222', college_id: 'e2222222-2222-2222-2222-222222222222', name: 'Division A', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd2222222-0002-1111-1111-111111111111', academic_year_id: 'c2222222-0001-1111-1111-111111111111', course_id: 'f2222222-2222-2222-2222-222222222222', college_id: 'e2222222-2222-2222-2222-222222222222', name: 'Division B', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd2222222-0003-1111-1111-111111111111', academic_year_id: 'c2222222-0001-1111-1111-111111111111', course_id: 'f2222222-2222-2222-2222-222222222222', college_id: 'e2222222-2222-2222-2222-222222222222', name: 'Division C', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd2222222-0004-1111-1111-111111111111', academic_year_id: 'c2222222-0001-1111-1111-111111111111', course_id: 'f2222222-2222-2222-2222-222222222222', college_id: 'e2222222-2222-2222-2222-222222222222', name: 'Division D', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // B.Sc IT Year 1: A
  { id: 'd4444444-0001-1111-1111-111111111111', academic_year_id: 'c4444444-0001-1111-1111-111111111111', course_id: 'f4444444-4444-4444-4444-444444444444', college_id: 'e2222222-2222-2222-2222-222222222222', name: 'Division A', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // BMS Year 1: A, B
  { id: 'd3333333-0001-1111-1111-111111111111', academic_year_id: 'c3333333-0001-1111-1111-111111111111', course_id: 'f3333333-3333-3333-3333-333333333333', college_id: 'e2222222-2222-2222-2222-222222222222', name: 'Division A', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd3333333-0002-1111-1111-111111111111', academic_year_id: 'c3333333-0001-1111-1111-111111111111', course_id: 'f3333333-3333-3333-3333-333333333333', college_id: 'e2222222-2222-2222-2222-222222222222', name: 'Division B', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Persistent state cache across hot-reloads
declare global {
  var __sic_colleges: College[] | undefined;
  var __sic_courses: Course[] | undefined;
  var __sic_academic_years: AcademicYear[] | undefined;
  var __sic_divisions: Division[] | undefined;
  var __sic_registrations: MemberRegistration[] | undefined;
}

if (!globalThis.__sic_colleges) globalThis.__sic_colleges = [...SEED_COLLEGES];
if (!globalThis.__sic_courses) globalThis.__sic_courses = [...SEED_COURSES];
if (!globalThis.__sic_academic_years) globalThis.__sic_academic_years = [...SEED_YEARS];
if (!globalThis.__sic_divisions) globalThis.__sic_divisions = [...SEED_DIVISIONS];
if (!globalThis.__sic_registrations) globalThis.__sic_registrations = [];

// ----------------------------------------------------------------------------
// Academic Query Helpers
// ----------------------------------------------------------------------------
export async function getColleges(): Promise<College[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('colleges').select('*').order('name');
    if (!error && data && data.length > 0) return data as College[];
  } catch {}
  return globalThis.__sic_colleges || SEED_COLLEGES;
}

export async function addCollege(name: string, code: string, description?: string): Promise<College> {
  const newCol: College = {
    id: crypto.randomUUID(),
    name: name.trim(),
    code: code.trim().toUpperCase(),
    description: description?.trim() || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('colleges').insert(newCol).select().single();
    if (!error && data) return data as College;
  } catch {}

  globalThis.__sic_colleges?.push(newCol);
  return newCol;
}

export async function updateCollege(id: string, updates: Partial<College>): Promise<College | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('colleges').update(updates).eq('id', id).select().single();
    if (!error && data) return data as College;
  } catch {}

  const list = globalThis.__sic_colleges || [];
  const idx = list.findIndex(c => c.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    return list[idx];
  }
  return null;
}

export async function getCourses(collegeId?: string): Promise<Course[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from('courses').select('*, college:colleges(*)').order('name');
    if (collegeId) q = q.eq('college_id', collegeId);
    const { data, error } = await q;
    if (!error && data && data.length > 0) return data as Course[];
  } catch {}

  let list = globalThis.__sic_courses || SEED_COURSES;
  if (collegeId) list = list.filter(c => c.college_id === collegeId);
  return list;
}

export async function addCourse(collegeId: string, name: string, code: string, durationYears: number = 3): Promise<Course> {
  const newCourse: Course = {
    id: crypto.randomUUID(),
    college_id: collegeId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    duration_years: durationYears,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('courses').insert(newCourse).select().single();
    if (!error && data) return data as Course;
  } catch {}

  globalThis.__sic_courses?.push(newCourse);
  return newCourse;
}

export async function getAcademicYears(courseId?: string): Promise<AcademicYear[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from('academic_years').select('*, course:courses(*)').order('year_number');
    if (courseId) q = q.eq('course_id', courseId);
    const { data, error } = await q;
    if (!error && data && data.length > 0) return data as AcademicYear[];
  } catch {}

  let list = globalThis.__sic_academic_years || SEED_YEARS;
  if (courseId) list = list.filter(y => y.course_id === courseId);
  return list;
}

export async function addAcademicYear(courseId: string, yearName: string, yearNumber: number): Promise<AcademicYear> {
  const newYear: AcademicYear = {
    id: crypto.randomUUID(),
    course_id: courseId,
    year_name: yearName.trim(),
    year_number: yearNumber,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('academic_years').insert(newYear).select().single();
    if (!error && data) return data as AcademicYear;
  } catch {}

  globalThis.__sic_academic_years?.push(newYear);
  return newYear;
}

export async function getDivisions(params?: { academicYearId?: string; courseId?: string; collegeId?: string }): Promise<Division[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from('divisions').select('*, academic_year:academic_years(*), course:courses(*), college:colleges(*)').order('name');
    if (params?.academicYearId) q = q.eq('academic_year_id', params.academicYearId);
    if (params?.courseId) q = q.eq('course_id', params.courseId);
    if (params?.collegeId) q = q.eq('college_id', params.collegeId);
    const { data, error } = await q;
    if (!error && data && data.length > 0) return data as Division[];
  } catch {}

  let list = globalThis.__sic_divisions || SEED_DIVISIONS;
  if (params?.academicYearId) list = list.filter(d => d.academic_year_id === params.academicYearId);
  if (params?.courseId) list = list.filter(d => d.course_id === params.courseId);
  if (params?.collegeId) list = list.filter(d => d.college_id === params.collegeId);
  return list;
}

export async function addDivision(collegeId: string, courseId: string, academicYearId: string, name: string): Promise<Division> {
  const newDiv: Division = {
    id: crypto.randomUUID(),
    college_id: collegeId,
    course_id: courseId,
    academic_year_id: academicYearId,
    name: name.trim(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('divisions').insert(newDiv).select().single();
    if (!error && data) return data as Division;
  } catch {}

  globalThis.__sic_divisions?.push(newDiv);
  return newDiv;
}

export async function deleteDivision(divisionId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('divisions').delete().eq('id', divisionId);
    if (!error) return true;
  } catch {}

  if (globalThis.__sic_divisions) {
    const initialLen = globalThis.__sic_divisions.length;
    globalThis.__sic_divisions = globalThis.__sic_divisions.filter(d => d.id !== divisionId);
    return globalThis.__sic_divisions.length < initialLen;
  }
  return false;
}

// ----------------------------------------------------------------------------
// Registration & Approval Engine
// ----------------------------------------------------------------------------
export async function getRegistrations(options?: {
  collegeIds?: string[];
  status?: string;
  authUserId?: string;
}): Promise<MemberRegistration[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from('member_registrations').select(`
      *,
      college:colleges(*),
      course:courses(*),
      academic_year:academic_years(*),
      division:divisions(*),
      requested_groups:registration_groups(*, group:groups(*))
    `).order('created_at', { ascending: false });

    if (options?.authUserId) q = q.eq('auth_user_id', options.authUserId);
    if (options?.status && options.status !== 'ALL') q = q.eq('status', options.status);
    if (options?.collegeIds && options.collegeIds.length > 0) q = q.in('college_id', options.collegeIds);

    const { data, error } = await q;
    if (!error && data) return data as MemberRegistration[];
  } catch {}

  let list = globalThis.__sic_registrations || [];
  if (options?.authUserId) list = list.filter(r => r.auth_user_id === options.authUserId);
  if (options?.status && options.status !== 'ALL') list = list.filter(r => r.status === options.status);
  if (options?.collegeIds && options.collegeIds.length > 0) {
    list = list.filter(r => options.collegeIds?.includes(r.college_id));
  }
  return list;
}

export async function saveRegistration(payload: {
  auth_user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  college_id: string;
  course_id: string;
  academic_year_id: string;
  division_id: string;
  roll_number: string;
  member_group_ids: string[];
  leader_group_ids: string[];
}): Promise<MemberRegistration> {
  const admin = createAdminClient();

  // Populate relationship entities
  const colleges = await getColleges();
  const courses = await getCourses();
  const years = await getAcademicYears();
  const divisions = await getDivisions();

  const college = colleges.find(c => c.id === payload.college_id);
  const course = courses.find(c => c.id === payload.course_id);
  const academic_year = years.find(y => y.id === payload.academic_year_id);
  const division = divisions.find(d => d.id === payload.division_id);

  // Check if updating an existing registration (resubmission)
  const existingList = await getRegistrations({ authUserId: payload.auth_user_id });
  const existing = existingList[0];

  const regId = existing?.id || crypto.randomUUID();
  const now = new Date().toISOString();

  // Build registration record
  const registrationRecord: MemberRegistration = {
    id: regId,
    auth_user_id: payload.auth_user_id,
    email: payload.email,
    full_name: payload.full_name.trim(),
    avatar_url: payload.avatar_url || existing?.avatar_url || null,
    college_id: payload.college_id,
    course_id: payload.course_id,
    academic_year_id: payload.academic_year_id,
    division_id: payload.division_id,
    roll_number: payload.roll_number.trim(),
    status: 'PENDING',
    correction_notes: null, // cleared upon resubmission
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    member_id: null,
    created_at: existing?.created_at || now,
    updated_at: now,
    college,
    course,
    academic_year,
    division,
  };

  // Build group request items
  const requested_groups: RegistrationGroup[] = [
    ...payload.member_group_ids.map(gid => ({
      id: crypto.randomUUID(),
      registration_id: regId,
      group_id: gid,
      request_type: 'MEMBER' as const,
      status: 'PENDING' as const,
    })),
    ...payload.leader_group_ids.map(gid => ({
      id: crypto.randomUUID(),
      registration_id: regId,
      group_id: gid,
      request_type: 'LEADER' as const,
      status: 'PENDING' as const,
    })),
  ];

  registrationRecord.requested_groups = requested_groups;

  // Persist to Supabase DB if table exists
  try {
    const { error: regError } = await admin
      .from('member_registrations')
      .upsert({
        id: regId,
        auth_user_id: payload.auth_user_id,
        email: payload.email,
        full_name: payload.full_name.trim(),
        avatar_url: payload.avatar_url || null,
        college_id: payload.college_id,
        course_id: payload.course_id,
        academic_year_id: payload.academic_year_id,
        division_id: payload.division_id,
        roll_number: payload.roll_number.trim(),
        status: 'PENDING',
        correction_notes: null,
        rejection_reason: null,
        updated_at: now,
      });

    if (!regError) {
      // Re-insert requested groups
      await admin.from('registration_groups').delete().eq('registration_id', regId);
      const groupRows = requested_groups.map(rg => ({
        registration_id: regId,
        group_id: rg.group_id,
        request_type: rg.request_type,
        status: 'PENDING',
      }));
      if (groupRows.length > 0) {
        await admin.from('registration_groups').insert(groupRows);
      }

      // Log audit
      await admin.from('registration_audit_logs').insert({
        registration_id: regId,
        action: existing ? 'RESUBMITTED' : 'SUBMITTED',
        notes: existing ? 'Application updated and resubmitted' : 'New membership application submitted',
      });
    }
  } catch {}

  // Update in-memory fallback
  if (!globalThis.__sic_registrations) globalThis.__sic_registrations = [];
  const idx = globalThis.__sic_registrations.findIndex(r => r.auth_user_id === payload.auth_user_id);
  if (idx >= 0) {
    globalThis.__sic_registrations[idx] = registrationRecord;
  } else {
    globalThis.__sic_registrations.unshift(registrationRecord);
  }

  return registrationRecord;
}

export async function processRegistrationReview(params: {
  registrationId: string;
  reviewerMemberId: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION';
  notes?: string;
  approvedGroupIds?: string[];
  approvedLeaderGroupIds?: string[];
}): Promise<{ success: boolean; error?: string; registration?: MemberRegistration }> {
  const admin = createAdminClient();
  const list = await getRegistrations();
  const reg = list.find(r => r.id === params.registrationId);

  if (!reg) {
    return { success: false, error: 'Registration request not found.' };
  }

  // Security Invariant: User cannot approve their own registration
  const { data: reviewer } = await admin
    .from('members')
    .select('id, auth_user_id, full_name')
    .eq('id', params.reviewerMemberId)
    .single();

  if (reviewer?.auth_user_id === reg.auth_user_id) {
    return { success: false, error: 'Security violation: Administrators cannot review or approve their own registration.' };
  }

  const now = new Date().toISOString();

  if (params.action === 'APPROVE') {
    // 1. Create or link Member profile in members table
    const cleanId = reg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const memberCode = `SIC-${cleanId}`;

    const memberPayload = {
      auth_user_id: reg.auth_user_id,
      member_code: memberCode,
      full_name: reg.full_name,
      email: reg.email,
      avatar_url: reg.avatar_url,
      department: 'Innovation & Operations',
      designation: 'SIC Member',
      org_role: 'MEMBER',
      status: 'ACTIVE',
      college_id: reg.college_id,
      course_id: reg.course_id,
      academic_year_id: reg.academic_year_id,
      division_id: reg.division_id,
      roll_number: reg.roll_number,
      registration_id: reg.id,
    };

    let memberId: string | null = null;

    try {
      // Check if member already exists
      const { data: existingMem } = await admin
        .from('members')
        .select('id')
        .or(`auth_user_id.eq.${reg.auth_user_id},email.eq.${reg.email}`)
        .maybeSingle();

      if (existingMem) {
        memberId = existingMem.id;
        await admin
          .from('members')
          .update({
            ...memberPayload,
            status: 'ACTIVE',
          })
          .eq('id', memberId);
      } else {
        const { data: newMem } = await admin
          .from('members')
          .insert(memberPayload)
          .select('id')
          .single();

        if (newMem) memberId = newMem.id;

      }

      if (memberId) {
        // 2. Insert Approved Group Memberships
        const groupIds = params.approvedGroupIds || [];
        for (const gid of groupIds) {
          await admin.from('group_memberships').insert({
            group_id: gid,
            member_id: memberId,
            status: 'ACTIVE',
            added_by: params.reviewerMemberId,
          });
        }

        // 3. Insert Approved Group Leadership
        const leadGroupIds = params.approvedLeaderGroupIds || [];
        for (const gid of leadGroupIds) {
          await admin.from('group_leads').insert({
            group_id: gid,
            member_id: memberId,
            lead_type: 'PRIMARY_LEAD',
            assigned_by: params.reviewerMemberId,
            is_active: true,
          });
        }
      }
    } catch (dbErr) {
      console.warn('Database member sync warning:', dbErr);
    }

    // 4. Update registration status
    reg.status = 'APPROVED';
    reg.reviewed_by = params.reviewerMemberId;
    reg.reviewed_at = now;
    reg.member_id = memberId;
    reg.updated_at = now;

    // Update group request statuses
    if (reg.requested_groups) {
      for (const rg of reg.requested_groups) {
        if (rg.request_type === 'MEMBER') {
          rg.status = params.approvedGroupIds?.includes(rg.group_id) ? 'APPROVED' : 'REJECTED';
        } else if (rg.request_type === 'LEADER') {
          rg.status = params.approvedLeaderGroupIds?.includes(rg.group_id) ? 'APPROVED' : 'REJECTED';
        }
        rg.reviewed_by = params.reviewerMemberId;
        rg.reviewed_at = now;
      }
    }

    try {
      await admin.from('member_registrations').update({
        status: 'APPROVED',
        reviewed_by: params.reviewerMemberId,
        reviewed_at: now,
        member_id: memberId,
        updated_at: now,
      }).eq('id', reg.id);
    } catch {}

    return { success: true, registration: reg };
  }

  if (params.action === 'REQUEST_CORRECTION') {
    if (!params.notes?.trim()) {
      return { success: false, error: 'Please specify what needs correction so the applicant can amend their details.' };
    }

    reg.status = 'NEEDS_CORRECTION';
    reg.correction_notes = params.notes.trim();
    reg.reviewed_by = params.reviewerMemberId;
    reg.reviewed_at = now;
    reg.updated_at = now;

    try {
      await admin.from('member_registrations').update({
        status: 'NEEDS_CORRECTION',
        correction_notes: params.notes.trim(),
        reviewed_by: params.reviewerMemberId,
        reviewed_at: now,
        updated_at: now,
      }).eq('id', reg.id);
    } catch {}

    return { success: true, registration: reg };
  }

  if (params.action === 'REJECT') {
    reg.status = 'REJECTED';
    reg.rejection_reason = params.notes?.trim() || 'Application does not satisfy institutional criteria.';
    reg.reviewed_by = params.reviewerMemberId;
    reg.reviewed_at = now;
    reg.updated_at = now;

    try {
      await admin.from('member_registrations').update({
        status: 'REJECTED',
        rejection_reason: reg.rejection_reason,
        reviewed_by: params.reviewerMemberId,
        reviewed_at: now,
        updated_at: now,
      }).eq('id', reg.id);
    } catch {}

    return { success: true, registration: reg };
  }

  return { success: false, error: 'Unknown action specified.' };
}
