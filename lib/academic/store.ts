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
  Group,
  GroupLead,
  GroupMembership,
  LeadType,
  Member,
  OrgRole,
  MemberStatus,
  MemberRegistration, 
  RegistrationGroup
} from '@/lib/types/sic';

export interface StoredMember extends Member {
  activeGroups?: Array<{ id?: string; code: string; name: string }>;
}

// ----------------------------------------------------------------------------
// Institutional Academic Structure Store
// ----------------------------------------------------------------------------
const INITIAL_TIMESTAMP = '2026-10-27T00:00:00.000Z';

export const SEED_COLLEGES: College[] = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    name: "Chetana's Institute of Management & Research",
    code: 'CIMR',
    description: 'Postgraduate Business & Innovation Management',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'e3333333-3333-3333-3333-333333333333',
    name: "Chetana's R.K. Institute of Management and Research",
    code: 'CRKIMR',
    description: 'Postgraduate Management Studies & Research',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
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
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'f5555555-5555-5555-5555-555555555555',
    college_id: 'e3333333-3333-3333-3333-333333333333',
    name: 'Master of Management Studies (MMS)',
    code: 'MMS',
    duration_years: 2,
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
];

export const SEED_YEARS: AcademicYear[] = [
  // CIMR - PGDM Year 1 & Year 2
  {
    id: 'c1111111-0001-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    year_name: 'Year 1',
    year_number: 1,
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'c1111111-0002-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    year_name: 'Year 2',
    year_number: 2,
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  // CRKIMR - MMS Year 1 & Year 2
  {
    id: 'c5555555-0001-1111-1111-111111111111',
    course_id: 'f5555555-5555-5555-5555-555555555555',
    year_name: 'Year 1',
    year_number: 1,
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'c5555555-0002-1111-1111-111111111111',
    course_id: 'f5555555-5555-5555-5555-555555555555',
    year_name: 'Year 2',
    year_number: 2,
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
];

export const SEED_DIVISIONS: Division[] = [
  // Chetana's Institute of Management & Research (CIMR) - Year 1: Divisions A, B, C, D, M
  {
    id: 'd1111111-0001-000a-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0001-1111-1111-111111111111',
    name: 'Division A',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0001-000b-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0001-1111-1111-111111111111',
    name: 'Division B',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0001-000c-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0001-1111-1111-111111111111',
    name: 'Division C',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0001-000d-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0001-1111-1111-111111111111',
    name: 'Division D',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0001-000e-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0001-1111-1111-111111111111',
    name: 'Division M',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  // Chetana's Institute of Management & Research (CIMR) - Year 2: Divisions A, B, C, D, M
  {
    id: 'd1111111-0002-000a-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0002-1111-1111-111111111111',
    name: 'Division A',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0002-000b-1111-1111-111111111111'.slice(0, 36),
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0002-1111-1111-111111111111',
    name: 'Division B',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0002-000c-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0002-1111-1111-111111111111',
    name: 'Division C',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0002-000d-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0002-1111-1111-111111111111',
    name: 'Division D',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd1111111-0002-000e-1111-111111111111',
    college_id: 'e1111111-1111-1111-1111-111111111111',
    course_id: 'f1111111-1111-1111-1111-111111111111',
    academic_year_id: 'c1111111-0002-1111-1111-111111111111',
    name: 'Division M',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  // Chetana's R.K. Institute of Management and Research (CRKIMR) - Year 1: Divisions A & B
  {
    id: 'd5555555-0001-000a-1111-111111111111',
    college_id: 'e3333333-3333-3333-3333-333333333333',
    course_id: 'f5555555-5555-5555-5555-555555555555',
    academic_year_id: 'c5555555-0001-1111-1111-111111111111',
    name: 'Division A',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd5555555-0001-000b-1111-111111111111',
    college_id: 'e3333333-3333-3333-3333-333333333333',
    course_id: 'f5555555-5555-5555-5555-555555555555',
    academic_year_id: 'c5555555-0001-1111-1111-111111111111',
    name: 'Division B',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  // Chetana's R.K. Institute of Management and Research (CRKIMR) - Year 2: Divisions A & B
  {
    id: 'd5555555-0002-000a-1111-111111111111',
    college_id: 'e3333333-3333-3333-3333-333333333333',
    course_id: 'f5555555-5555-5555-5555-555555555555',
    academic_year_id: 'c5555555-0002-1111-1111-111111111111',
    name: 'Division A',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
  {
    id: 'd5555555-0002-000b-1111-111111111111',
    college_id: 'e3333333-3333-3333-3333-333333333333',
    course_id: 'f5555555-5555-5555-5555-555555555555',
    academic_year_id: 'c5555555-0002-1111-1111-111111111111',
    name: 'Division B',
    is_active: true,
    created_at: INITIAL_TIMESTAMP,
    updated_at: INITIAL_TIMESTAMP,
  },
];

// Persistent state cache across hot-reloads
declare global {
  var __sic_colleges: College[] | undefined;
  var __sic_courses: Course[] | undefined;
  var __sic_academic_years: AcademicYear[] | undefined;
  var __sic_divisions: Division[] | undefined;
  var __sic_groups: Group[] | undefined;
  var __sic_members: StoredMember[] | undefined;
  var __sic_registrations: MemberRegistration[] | undefined;
  var __sic_removed_members: string[] | undefined;
}

if (!globalThis.__sic_colleges) globalThis.__sic_colleges = [];
for (const sc of SEED_COLLEGES) {
  if (!globalThis.__sic_colleges.some(c => c.id === sc.id || c.code === sc.code)) {
    globalThis.__sic_colleges.push(sc);
  }
}

if (!globalThis.__sic_courses) globalThis.__sic_courses = [];
for (const sco of SEED_COURSES) {
  if (!globalThis.__sic_courses.some(c => c.id === sco.id || (c.college_id === sco.college_id && c.code === sco.code))) {
    globalThis.__sic_courses.push(sco);
  }
}

if (!globalThis.__sic_academic_years) globalThis.__sic_academic_years = [];
for (const sy of SEED_YEARS) {
  if (!globalThis.__sic_academic_years.some(y => y.id === sy.id || (y.course_id === sy.course_id && y.year_number === sy.year_number))) {
    globalThis.__sic_academic_years.push(sy);
  }
}

if (!globalThis.__sic_divisions) globalThis.__sic_divisions = [];
for (const sd of SEED_DIVISIONS) {
  if (!globalThis.__sic_divisions.some(d => d.id === sd.id || (d.academic_year_id === sd.academic_year_id && d.name === sd.name))) {
    globalThis.__sic_divisions.push(sd);
  }
}

if (!globalThis.__sic_groups) globalThis.__sic_groups = [];
if (!globalThis.__sic_members) globalThis.__sic_members = [];
if (!globalThis.__sic_registrations) globalThis.__sic_registrations = [];
if (!globalThis.__sic_removed_members) globalThis.__sic_removed_members = [];

// ----------------------------------------------------------------------------
// Managed Members (Invite, Approve, Ban/Unban, Remove)
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Administrative Audit Logging & Managed Members (PostgreSQL Persistence)
// ----------------------------------------------------------------------------
export async function recordAdminAuditLog(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    actorId?: string | null;
    targetMemberId?: string | null;
    action: string;
    entityType: 'MEMBER' | 'MEMBER_REGISTRATION';
    entityId?: string | null;
    previousState?: Record<string, unknown> | null;
    newState?: Record<string, unknown> | null;
  }
): Promise<void> {
  try {
    let validActorId: string | null = null;
    if (params.actorId) {
      const { data: actorRow } = await admin
        .from('members')
        .select('id')
        .eq('id', params.actorId)
        .maybeSingle();
      if (actorRow?.id) validActorId = actorRow.id;
    }

    let validTargetId: string | null = null;
    if (params.targetMemberId) {
      const { data: targetRow } = await admin
        .from('members')
        .select('id')
        .eq('id', params.targetMemberId)
        .maybeSingle();
      if (targetRow?.id) validTargetId = targetRow.id;
    }

    const basePayload: Record<string, unknown> = {
      actor_id: validActorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || validTargetId || null,
      previous_state: params.previousState || null,
      new_state: {
        ...(params.newState || {}),
        performed_by_member_id: params.actorId || null,
        target_member_id: params.targetMemberId || null,
      },
    };

    const { error } = await admin.from('audit_logs').insert({
      ...basePayload,
      target_member_id: validTargetId,
    });

    if (error) {
      // Fallback if target_member_id column has not been migrated yet
      await admin.from('audit_logs').insert(basePayload);
    }
  } catch (err) {
    console.error('[AuditLog] Failed to write administrative audit log:', err);
  }
}

export function getStoredMembers(): StoredMember[] {
  return globalThis.__sic_members || [];
}

export function getRemovedMemberKeys(): Set<string> {
  return new Set((globalThis.__sic_removed_members || []).map(k => k.toLowerCase()));
}

export async function inviteOrCreateMember(params: {
  full_name: string;
  email: string;
  org_role?: OrgRole;
  department?: string;
  designation?: string;
  roll_number?: string | null;
  phone?: string | null;
  group_ids?: string[];
  performedBy?: string | null;
}): Promise<StoredMember> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const cleanEmail = params.email.trim().toLowerCase();
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const memberCode = `SIC-${randomCode}`;

  const allGroups = await getGroups();
  const assignedGroups = (params.group_ids || [])
    .map(gid => allGroups.find(g => g.id === gid))
    .filter(Boolean)
    .map(g => ({ id: g!.id, code: g!.code, name: g!.name }));

  const { data: existingMember } = await admin
    .from('members')
    .select('id, member_code, full_name, email, org_role, status, department, designation, roll_number, phone')
    .ilike('email', cleanEmail)
    .maybeSingle();

  const previousState = existingMember ? { ...existingMember } : null;

  const newMember: StoredMember = {
    id: existingMember?.id || crypto.randomUUID(),
    auth_user_id: null,
    member_code: existingMember?.member_code || memberCode,
    full_name: params.full_name.trim(),
    email: cleanEmail,
    phone: params.phone?.trim() || existingMember?.phone || null,
    department: params.department?.trim() || existingMember?.department || 'Innovation & Operations',
    designation: params.designation?.trim() || existingMember?.designation || 'SIC Member',
    org_role: params.org_role || existingMember?.org_role || 'MEMBER',
    status: 'ACTIVE',
    avatar_url: null,
    roll_number: params.roll_number?.trim() || existingMember?.roll_number || null,
    joined_at: now.split('T')[0],
    created_at: now,
    updated_at: now,
    activeGroups: assignedGroups,
  };

  const { data, error } = await admin
    .from('members')
    .upsert(
      {
        id: newMember.id,
        member_code: newMember.member_code,
        full_name: newMember.full_name,
        email: newMember.email,
        phone: newMember.phone,
        department: newMember.department,
        designation: newMember.designation,
        org_role: newMember.org_role,
        status: 'ACTIVE',
        roll_number: newMember.roll_number,
        updated_at: now,
      },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (error && error.code !== '42501') {
    throw new Error(error.message || 'Failed to persist invited member in PostgreSQL.');
  }

  if (data) {
    newMember.id = data.id;
    newMember.member_code = data.member_code || newMember.member_code;
  }

  for (const gid of params.group_ids || []) {
    await admin.from('group_memberships').upsert(
      {
        group_id: gid,
        member_id: newMember.id,
        status: 'ACTIVE',
        added_by: params.performedBy || null,
      },
      { onConflict: 'group_id,member_id' }
    );
  }

  await recordAdminAuditLog(admin, {
    actorId: params.performedBy || null,
    targetMemberId: data.id,
    action: existingMember ? 'MEMBER_UPDATED' : 'MEMBER_INVITED',
    entityType: 'MEMBER',
    entityId: data.id,
    previousState,
    newState: {
      id: data.id,
      email: newMember.email,
      full_name: newMember.full_name,
      org_role: newMember.org_role,
      status: 'ACTIVE',
      department: newMember.department,
      designation: newMember.designation,
      group_ids: params.group_ids || [],
    },
  });

  if (globalThis.__sic_removed_members) {
    globalThis.__sic_removed_members = globalThis.__sic_removed_members.filter(
      k => k.toLowerCase() !== cleanEmail && k.toLowerCase() !== newMember.id.toLowerCase()
    );
  }

  if (!globalThis.__sic_members) globalThis.__sic_members = [];
  const existingIdx = globalThis.__sic_members.findIndex(
    m => m.email.toLowerCase() === cleanEmail
  );
  if (existingIdx >= 0) {
    globalThis.__sic_members[existingIdx] = {
      ...globalThis.__sic_members[existingIdx],
      ...newMember,
    };
  } else {
    globalThis.__sic_members.unshift(newMember);
  }

  return newMember;
}

export async function setMemberBanStatus(params: {
  memberId: string;
  email?: string;
  full_name?: string;
  department?: string;
  designation?: string;
  roll_number?: string | null;
  phone?: string | null;
  status?: MemberStatus;
  org_role?: OrgRole;
  performedBy?: string | null;
}): Promise<{ success: boolean; member?: Member; error?: string }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const cleanEmail = params.email?.trim().toLowerCase();

  let existingMember: Member | null = null;
  const { data: byId } = await admin
    .from('members')
    .select('*')
    .eq('id', params.memberId)
    .maybeSingle();
  if (byId) existingMember = byId as Member;

  if (!existingMember && cleanEmail) {
    const { data: byEmail } = await admin
      .from('members')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (byEmail) existingMember = byEmail as Member;
  }

  let registration: MemberRegistration | null = null;
  const { data: byRegId } = await admin
    .from('member_registrations')
    .select('*, course:courses(*)')
    .or(`id.eq.${params.memberId},member_id.eq.${params.memberId}`)
    .maybeSingle();
  if (byRegId) registration = byRegId as MemberRegistration;

  if (!registration && (cleanEmail || existingMember?.email)) {
    const lookupEmail = cleanEmail || existingMember!.email.toLowerCase();
    const { data: byRegEmail } = await admin
      .from('member_registrations')
      .select('*, course:courses(*)')
      .ilike('email', lookupEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byRegEmail) registration = byRegEmail as MemberRegistration;
  }

  const nextStatus: MemberStatus = params.status || existingMember?.status || 'ACTIVE';
  const registrationStatus =
    nextStatus === 'SUSPENDED'
      ? 'SUSPENDED'
      : nextStatus === 'INACTIVE'
      ? 'REJECTED'
      : 'APPROVED';

  const previousState = existingMember
    ? {
        id: existingMember.id,
        email: existingMember.email,
        full_name: existingMember.full_name,
        status: existingMember.status,
        org_role: existingMember.org_role,
        department: existingMember.department,
        designation: existingMember.designation,
        roll_number: existingMember.roll_number,
        phone: existingMember.phone,
      }
    : registration
    ? {
        registration_id: registration.id,
        email: registration.email,
        full_name: registration.full_name,
        registration_status: registration.status,
      }
    : null;

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
  };
  if (params.org_role) updatePayload.org_role = params.org_role;
  if (params.full_name !== undefined && params.full_name.trim()) {
    updatePayload.full_name = params.full_name.trim();
  }
  if (params.department !== undefined && params.department.trim()) {
    updatePayload.department = params.department.trim();
  }
  if (params.designation !== undefined && params.designation.trim()) {
    updatePayload.designation = params.designation.trim();
  }
  if (params.roll_number !== undefined) {
    updatePayload.roll_number = params.roll_number ? params.roll_number.trim() : null;
  }
  if (params.phone !== undefined) {
    updatePayload.phone = params.phone ? params.phone.trim() : null;
  }

  let persistedMember: Member | null = null;

  if (existingMember) {
    const { data: updatedRow, error: updateErr } = await admin
      .from('members')
      .update(updatePayload)
      .eq('id', existingMember.id)
      .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
      .maybeSingle();

    if (updateErr && updateErr.code !== '42501') {
      return { success: false, error: updateErr.message };
    }
    persistedMember = (updatedRow as Member) || {
      ...existingMember,
      ...(updatePayload as Partial<Member>),
    };
  } else {
    const resolvedEmail = cleanEmail || registration?.email?.toLowerCase();
    if (!resolvedEmail) {
      return { success: false, error: 'Target member record could not be found in PostgreSQL.' };
    }

    const cleanCode = params.memberId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const fallbackMember: Member = {
      id: params.memberId,
      auth_user_id: registration?.auth_user_id || null,
      member_code: `SIC-${cleanCode}`,
      full_name:
        params.full_name?.trim() || registration?.full_name || resolvedEmail.split('@')[0],
      email: resolvedEmail,
      phone: params.phone?.trim() || null,
      avatar_url: registration?.avatar_url || null,
      department:
        params.department?.trim() ||
        registration?.course?.name ||
        'Innovation & Operations',
      designation: params.designation?.trim() || 'SIC Member',
      org_role: params.org_role || 'MEMBER',
      status: nextStatus,
      college_id: registration?.college_id || null,
      course_id: registration?.course_id || null,
      academic_year_id: registration?.academic_year_id || null,
      division_id: registration?.division_id || null,
      roll_number: params.roll_number ?? registration?.roll_number ?? null,
      registration_id: registration?.id || null,
      joined_at: now.split('T')[0],
      created_at: registration?.created_at || now,
      updated_at: now,
    };

    const { data: insertedRow, error: upsertErr } = await admin
      .from('members')
      .upsert(
        {
          id: fallbackMember.id,
          auth_user_id: fallbackMember.auth_user_id,
          member_code: fallbackMember.member_code,
          full_name: fallbackMember.full_name,
          email: fallbackMember.email,
          phone: fallbackMember.phone,
          avatar_url: fallbackMember.avatar_url,
          department: fallbackMember.department,
          designation: fallbackMember.designation,
          org_role: fallbackMember.org_role,
          status: fallbackMember.status,
          college_id: fallbackMember.college_id,
          course_id: fallbackMember.course_id,
          academic_year_id: fallbackMember.academic_year_id,
          division_id: fallbackMember.division_id,
          roll_number: fallbackMember.roll_number,
          registration_id: fallbackMember.registration_id,
          updated_at: now,
        },
        { onConflict: 'email' }
      )
      .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
      .maybeSingle();

    if (upsertErr && upsertErr.code !== '42501') {
      return { success: false, error: upsertErr.message };
    }
    persistedMember = (insertedRow as Member) || fallbackMember;
  }

  if (registration) {
    await admin
      .from('member_registrations')
      .update({
        status: registrationStatus,
        member_id: persistedMember.id,
        reviewed_by: params.performedBy || registration.reviewed_by || null,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', registration.id);

    await admin.from('registration_audit_logs').insert({
      registration_id: registration.id,
      action: registrationStatus,
      performed_by: params.performedBy || null,
      notes:
        nextStatus === 'SUSPENDED'
          ? 'Member account suspended by an administrator.'
          : existingMember?.status === 'SUSPENDED'
          ? 'Member account unbanned by an administrator.'
          : existingMember?.status === 'INACTIVE'
          ? 'Member account restored by an administrator.'
          : 'Member profile approved or updated by an administrator.',
    });
  }

  let auditAction = 'MEMBER_UPDATED';
  if (nextStatus === 'SUSPENDED' && existingMember?.status !== 'SUSPENDED') {
    auditAction = 'MEMBER_BANNED';
  } else if (nextStatus === 'ACTIVE' && existingMember?.status === 'SUSPENDED') {
    auditAction = 'MEMBER_UNBANNED';
  } else if (nextStatus === 'ACTIVE' && existingMember?.status === 'INACTIVE') {
    auditAction = 'MEMBER_RESTORED';
  } else if (nextStatus === 'ACTIVE' && !existingMember) {
    auditAction = 'MEMBER_APPROVED';
  }

  await recordAdminAuditLog(admin, {
    actorId: params.performedBy || null,
    targetMemberId: persistedMember.id,
    action: auditAction,
    entityType: 'MEMBER',
    entityId: persistedMember.id,
    previousState,
    newState: {
      id: persistedMember.id,
      email: persistedMember.email,
      full_name: persistedMember.full_name,
      status: persistedMember.status,
      org_role: persistedMember.org_role,
      department: persistedMember.department,
      designation: persistedMember.designation,
      roll_number: persistedMember.roll_number,
      phone: persistedMember.phone,
    },
  });

  if (globalThis.__sic_removed_members && nextStatus !== 'INACTIVE') {
    globalThis.__sic_removed_members = globalThis.__sic_removed_members.filter(
      key =>
        key.toLowerCase() !== params.memberId.toLowerCase() &&
        key.toLowerCase() !== persistedMember!.id.toLowerCase() &&
        (!cleanEmail || key.toLowerCase() !== cleanEmail)
    );
  }

  if (!globalThis.__sic_members) globalThis.__sic_members = [];
  const memIdx = globalThis.__sic_members.findIndex(
    m =>
      m.id === persistedMember!.id ||
      m.id === params.memberId ||
      m.email.toLowerCase() === persistedMember!.email.toLowerCase()
  );
  if (memIdx >= 0) {
    globalThis.__sic_members[memIdx] = {
      ...globalThis.__sic_members[memIdx],
      ...persistedMember,
    };
  } else {
    globalThis.__sic_members.unshift({
      ...persistedMember,
      activeGroups: [],
    });
  }

  if (globalThis.__sic_registrations) {
    for (const item of globalThis.__sic_registrations) {
      if (
        item.id === params.memberId ||
        item.member_id === persistedMember.id ||
        item.email.toLowerCase() === persistedMember.email.toLowerCase()
      ) {
        item.status = registrationStatus;
        item.member_id = persistedMember.id;
        item.updated_at = now;
      }
    }
  }

  return { success: true, member: persistedMember };
}

export async function restoreMemberById(
  memberId: string,
  email?: string,
  performedBy?: string | null
): Promise<{ success: boolean; member?: Member; error?: string }> {
  return setMemberBanStatus({
    memberId,
    email,
    status: 'ACTIVE',
    performedBy,
  });
}

export async function removeMemberById(
  memberId: string,
  email?: string,
  performedBy?: string | null
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const cleanEmail = email?.trim().toLowerCase();
  const now = new Date().toISOString();

  let existingMember: Member | null = null;
  const { data: memById } = await admin
    .from('members')
    .select('*')
    .eq('id', memberId)
    .maybeSingle();
  if (memById) existingMember = memById as Member;

  if (!existingMember && cleanEmail) {
    const { data: memByEmail } = await admin
      .from('members')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (memByEmail) existingMember = memByEmail as Member;
  }

  let registration: MemberRegistration | null = null;
  const { data: byRegId } = await admin
    .from('member_registrations')
    .select('*')
    .or(`id.eq.${memberId},member_id.eq.${memberId}`)
    .maybeSingle();
  if (byRegId) registration = byRegId as MemberRegistration;

  if (!registration && (cleanEmail || existingMember?.email)) {
    const lookupEmail = cleanEmail || existingMember!.email.toLowerCase();
    const { data: byRegEmail } = await admin
      .from('member_registrations')
      .select('*')
      .ilike('email', lookupEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byRegEmail) registration = byRegEmail as MemberRegistration;
  }

  const resolvedMemberId = existingMember?.id || registration?.member_id || memberId;
  const previousState = existingMember
    ? {
        id: existingMember.id,
        email: existingMember.email,
        full_name: existingMember.full_name,
        status: existingMember.status,
        org_role: existingMember.org_role,
      }
    : registration
    ? {
        registration_id: registration.id,
        email: registration.email,
        full_name: registration.full_name,
        registration_status: registration.status,
      }
    : null;

  const { error: memErr } = await admin
    .from('members')
    .update({ status: 'INACTIVE', updated_at: now })
    .eq('id', resolvedMemberId);

  if (memErr && memErr.code !== '42501') {
    return { success: false, error: memErr.message };
  }

  if (cleanEmail) {
    await admin
      .from('members')
      .update({ status: 'INACTIVE', updated_at: now })
      .ilike('email', cleanEmail);
  }

  await admin
    .from('group_memberships')
    .update({ status: 'LEFT', ended_at: now })
    .eq('member_id', resolvedMemberId);

  await admin
    .from('group_leads')
    .update({ is_active: false })
    .eq('member_id', resolvedMemberId);

  await admin
    .from('project_memberships')
    .update({ status: 'LEFT', updated_at: now })
    .eq('member_id', resolvedMemberId);

  if (registration) {
    await admin
      .from('member_registrations')
      .update({
        status: 'REJECTED',
        rejection_reason: 'Removed from the SIC directory by an administrator.',
        reviewed_by: performedBy || registration.reviewed_by || null,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', registration.id);

    await admin.from('registration_audit_logs').insert({
      registration_id: registration.id,
      action: 'REMOVED_FROM_DIRECTORY',
      performed_by: performedBy || null,
      notes:
        'Member was removed from the active SIC directory. Historical attendance and audit records were retained.',
    });
  }

  await recordAdminAuditLog(admin, {
    actorId: performedBy || null,
    targetMemberId: existingMember?.id || null,
    action: 'MEMBER_REMOVED',
    entityType: 'MEMBER',
    entityId: resolvedMemberId,
    previousState,
    newState: {
      id: resolvedMemberId,
      email: cleanEmail || existingMember?.email || registration?.email || null,
      status: 'INACTIVE',
      registration_status: registration ? 'REJECTED' : undefined,
    },
  });

  if (!globalThis.__sic_removed_members) globalThis.__sic_removed_members = [];
  for (const key of [memberId.toLowerCase(), resolvedMemberId.toLowerCase(), cleanEmail].filter(
    Boolean
  ) as string[]) {
    if (!globalThis.__sic_removed_members.includes(key)) {
      globalThis.__sic_removed_members.push(key);
    }
  }

  if (globalThis.__sic_members) {
    globalThis.__sic_members = globalThis.__sic_members.filter(
      member =>
        member.id !== memberId &&
        member.id !== resolvedMemberId &&
        (!cleanEmail || member.email.toLowerCase() !== cleanEmail)
    );
  }

  if (globalThis.__sic_registrations) {
    globalThis.__sic_registrations = globalThis.__sic_registrations.map(item =>
      item.id === memberId ||
      item.member_id === resolvedMemberId ||
      (cleanEmail && item.email.toLowerCase() === cleanEmail)
        ? {
            ...item,
            status: 'REJECTED',
            rejection_reason: 'Removed from the SIC directory by an administrator.',
            updated_at: now,
          }
        : item
    );
  }

  return { success: true };
}

// ----------------------------------------------------------------------------
// SIC Groups Query, Multi-Leader Assignment & Roster Helpers
// ----------------------------------------------------------------------------
export async function resolveAllKnownMembers(): Promise<Member[]> {
  const memberMap = new Map<string, Member>();

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('members')
      .select('id, auth_user_id, member_code, full_name, email, phone, avatar_url, department, designation, org_role, status, joining_date, roll_number, created_at, updated_at')
      .order('full_name', { ascending: true });

    for (const m of data || []) {
      memberMap.set(m.id, m as Member);
    }
  } catch {}

  for (const sm of globalThis.__sic_members || []) {
    const existing = Array.from(memberMap.values()).find(
      m => m.id === sm.id || m.email.toLowerCase() === sm.email.toLowerCase()
    );
    if (!existing) {
      memberMap.set(sm.id, sm);
    }
  }

  for (const reg of globalThis.__sic_registrations || []) {
    if (reg.status === 'APPROVED') {
      const id = reg.member_id || reg.id;
      const existing = Array.from(memberMap.values()).find(
        m => m.id === id || m.email.toLowerCase() === reg.email.toLowerCase()
      );
      if (!existing) {
        const cleanCode = reg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase();
        memberMap.set(id, {
          id,
          auth_user_id: reg.auth_user_id,
          member_code: `SIC-${cleanCode}`,
          full_name: reg.full_name,
          email: reg.email,
          department: reg.course?.name || 'Innovation & Operations',
          designation: 'SIC Member',
          org_role: 'MEMBER',
          status: 'ACTIVE',
          avatar_url: reg.avatar_url || null,
          roll_number: reg.roll_number,
          joining_date: reg.reviewed_at || reg.created_at,
          created_at: reg.created_at,
          updated_at: reg.updated_at,
        });
      }
    }
  }

  return Array.from(memberMap.values());
}

function enrichGroupsWithRegistrationsAndMembers(groups: Group[], knownMembers: Member[]): Group[] {
  const memberById = new Map<string, Member>();
  const memberByEmail = new Map<string, Member>();
  for (const m of knownMembers) {
    memberById.set(m.id, m);
    memberByEmail.set(m.email.toLowerCase(), m);
  }

  return groups.map(g => {
    const leadsMap = new Map<string, GroupLead>();
    const membershipsMap = new Map<string, GroupMembership>();

    for (const l of g.group_leads || []) {
      if (!l.is_active) continue;
      const rawMem = Array.isArray(l.member) ? l.member[0] : l.member;
      const mem = rawMem || memberById.get(l.member_id);
      if (mem) {
        const key = (mem.email || mem.id || l.member_id).toLowerCase();
        leadsMap.set(key, {
          ...l,
          member_id: mem.id || l.member_id,
          member: mem,
        });
      }
    }

    for (const gm of g.group_memberships || []) {
      if (gm.status !== 'ACTIVE') continue;
      const rawMem = Array.isArray(gm.member) ? gm.member[0] : gm.member;
      const mem = rawMem || memberById.get(gm.member_id);
      if (mem) {
        const key = (mem.email || mem.id || gm.member_id).toLowerCase();
        membershipsMap.set(key, {
          ...gm,
          member_id: mem.id || gm.member_id,
          member: mem,
        });
      }
    }

    // Merge from invited/stored members activeGroups
    for (const sm of globalThis.__sic_members || []) {
      if (sm.status === 'SUSPENDED') continue;
      const inGroup = (sm.activeGroups || []).some(
        ag => ag.id === g.id || ag.code.toUpperCase() === g.code.toUpperCase()
      );
      if (inGroup) {
        const key = sm.email.toLowerCase();
        if (!membershipsMap.has(key)) {
          membershipsMap.set(key, {
            id: `${g.id}-mem-${sm.id}`,
            group_id: g.id,
            member_id: sm.id,
            status: 'ACTIVE',
            joined_at: sm.created_at,
            member: sm,
          });
        }
      }
    }

    // Merge from approved registrations
    for (const reg of globalThis.__sic_registrations || []) {
      if (reg.status !== 'APPROVED') continue;
      const mem =
        memberByEmail.get(reg.email.toLowerCase()) ||
        memberById.get(reg.member_id || reg.id);
      if (!mem) continue;
      const key = mem.email.toLowerCase();

      for (const rg of reg.requested_groups || []) {
        const matchesGroup =
          rg.group_id === g.id ||
          (rg.group?.code && rg.group.code.toUpperCase() === g.code.toUpperCase());
        if (!matchesGroup || rg.status !== 'APPROVED') continue;

        if (rg.request_type === 'LEADER') {
          if (!leadsMap.has(key)) {
            leadsMap.set(key, {
              id: `${g.id}-lead-${mem.id}`,
              group_id: g.id,
              member_id: mem.id,
              lead_type: 'PRIMARY_LEAD',
              assigned_at: reg.reviewed_at || reg.updated_at,
              is_active: true,
              member: mem,
            });
          }
          // Leaders are also enrolled members of the group
          if (!membershipsMap.has(key)) {
            membershipsMap.set(key, {
              id: `${g.id}-mem-${mem.id}`,
              group_id: g.id,
              member_id: mem.id,
              status: 'ACTIVE',
              joined_at: reg.reviewed_at || reg.updated_at,
              member: mem,
            });
          }
        } else if (rg.request_type === 'MEMBER') {
          if (!membershipsMap.has(key)) {
            membershipsMap.set(key, {
              id: `${g.id}-mem-${mem.id}`,
              group_id: g.id,
              member_id: mem.id,
              status: 'ACTIVE',
              joined_at: reg.reviewed_at || reg.updated_at,
              member: mem,
            });
          }
        }
      }
    }

    const finalLeads = Array.from(leadsMap.values());
    const finalMemberships = Array.from(membershipsMap.values());

    return {
      ...g,
      group_leads: finalLeads,
      group_memberships: finalMemberships,
      member_count: finalMemberships.length,
    };
  });
}

export async function getGroups(): Promise<Group[]> {
  const knownMembers = await resolveAllKnownMembers();
  const groupMap = new Map<string, Group>();

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('groups')
      .select(`
        *,
        group_leads(
          id,
          member_id,
          lead_type,
          is_active,
          assigned_at,
          member:members(id, full_name, email, member_code, department, avatar_url)
        ),
        group_memberships(
          id,
          member_id,
          status,
          joined_at,
          member:members(id, full_name, email, member_code, department, avatar_url)
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (!error && data) {
      for (const g of data) {
        groupMap.set(g.id, g as Group);
      }
    }
  } catch {}

  for (const sg of globalThis.__sic_groups || []) {
    if (!sg.is_active) continue;
    const existing = groupMap.get(sg.id);
    if (existing) {
      // Merge in-memory leads/memberships if stored
      groupMap.set(sg.id, {
        ...existing,
        ...sg,
        group_leads: sg.group_leads?.length ? sg.group_leads : existing.group_leads,
        group_memberships: sg.group_memberships?.length
          ? sg.group_memberships
          : existing.group_memberships,
      });
    } else {
      groupMap.set(sg.id, sg);
    }
  }

  const allGroups = Array.from(groupMap.values());
  return enrichGroupsWithRegistrationsAndMembers(allGroups, knownMembers);
}

export async function addGroup(params: {
  name: string;
  code: string;
  description?: string | null;
  group_type?: 'PERMANENT' | 'TEMPORARY' | 'PROJECT' | 'EVENT' | 'WORKSHOP';
  grace_period_mins?: number;
  min_attendance_pct?: number;
  leaders?: Array<{
    member_id: string;
    lead_type?: LeadType;
  }>;
  member_ids?: string[];
}): Promise<Group> {
  const now = new Date().toISOString();
  const knownMembers = await resolveAllKnownMembers();
  const memberById = new Map<string, Member>(knownMembers.map(m => [m.id, m]));

  const groupId = crypto.randomUUID();
  const cleanCode = params.code.trim().toUpperCase();
  const cleanName = params.name.trim();

  // Build initial group_leads (can be multiple)
  const groupLeads: GroupLead[] = (params.leaders || []).map(l => {
    const mem = memberById.get(l.member_id);
    return {
      id: crypto.randomUUID(),
      group_id: groupId,
      member_id: l.member_id,
      lead_type: l.lead_type || 'PRIMARY_LEAD',
      assigned_at: now,
      is_active: true,
      member: mem,
    };
  });

  // Combine explicit member_ids + all leader member_ids so leaders are also members
  const combinedMemberIds = Array.from(
    new Set([
      ...(params.member_ids || []),
      ...(params.leaders || []).map(l => l.member_id),
    ])
  );

  const groupMemberships: GroupMembership[] = combinedMemberIds.map(mid => {
    const mem = memberById.get(mid);
    return {
      id: crypto.randomUUID(),
      group_id: groupId,
      member_id: mid,
      status: 'ACTIVE',
      joined_at: now,
      member: mem,
    };
  });

  const newGroup: Group = {
    id: groupId,
    name: cleanName,
    code: cleanCode,
    description: params.description?.trim() || null,
    group_type: params.group_type || 'PERMANENT',
    parent_group_id: null,
    is_active: true,
    capacity_limit: 0,
    attendance_policy: {
      grace_period_mins: params.grace_period_mins ?? 15,
      min_attendance_pct: params.min_attendance_pct ?? 75,
    },
    created_by: null,
    created_at: now,
    updated_at: now,
    group_leads: groupLeads,
    group_memberships: groupMemberships,
    member_count: groupMemberships.length,
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('groups')
      .insert({
        id: newGroup.id,
        name: newGroup.name,
        code: newGroup.code,
        description: newGroup.description,
        group_type: newGroup.group_type,
        is_active: true,
        capacity_limit: 0,
        attendance_policy: newGroup.attendance_policy,
      })
      .select()
      .single();

    if (!error && data) {
      newGroup.id = data.id;
      for (const gl of groupLeads) {
        await admin.from('group_leads').upsert(
          {
            group_id: data.id,
            member_id: gl.member_id,
            lead_type: gl.lead_type,
            is_active: true,
          },
          { onConflict: 'group_id,member_id' }
        );
      }
      for (const gm of groupMemberships) {
        await admin.from('group_memberships').upsert(
          {
            group_id: data.id,
            member_id: gm.member_id,
            status: 'ACTIVE',
          },
          { onConflict: 'group_id,member_id' }
        );
      }
    }
  } catch {}

  // Also sync to globalThis.__sic_members activeGroups
  if (globalThis.__sic_members) {
    for (const sm of globalThis.__sic_members) {
      if (combinedMemberIds.includes(sm.id)) {
        const current = sm.activeGroups || [];
        if (!current.some(ag => ag.id === newGroup.id || ag.code === newGroup.code)) {
          sm.activeGroups = [...current, { id: newGroup.id, code: newGroup.code, name: newGroup.name }];
        }
      }
    }
  }

  if (!globalThis.__sic_groups) globalThis.__sic_groups = [];
  globalThis.__sic_groups.push(newGroup);
  return newGroup;
}

export async function updateGroupRoster(params: {
  group_id: string;
  name?: string;
  description?: string | null;
  leaders: Array<{
    member_id: string;
    lead_type: LeadType;
  }>;
  member_ids: string[];
}): Promise<Group | null> {
  const now = new Date().toISOString();
  const knownMembers = await resolveAllKnownMembers();
  const memberById = new Map<string, Member>(knownMembers.map(m => [m.id, m]));

  const currentGroups = await getGroups();
  const target = currentGroups.find(g => g.id === params.group_id);
  if (!target) return null;

  const updatedLeads: GroupLead[] = params.leaders.map(l => ({
    id: crypto.randomUUID(),
    group_id: params.group_id,
    member_id: l.member_id,
    lead_type: l.lead_type,
    assigned_at: now,
    is_active: true,
    member: memberById.get(l.member_id),
  }));

  const combinedMemberIds = Array.from(
    new Set([...params.member_ids, ...params.leaders.map(l => l.member_id)])
  );

  const updatedMemberships: GroupMembership[] = combinedMemberIds.map(mid => ({
    id: crypto.randomUUID(),
    group_id: params.group_id,
    member_id: mid,
    status: 'ACTIVE',
    joined_at: now,
    member: memberById.get(mid),
  }));

  const updatedGroup: Group = {
    ...target,
    name: params.name?.trim() || target.name,
    description: params.description !== undefined ? params.description : target.description,
    updated_at: now,
    group_leads: updatedLeads,
    group_memberships: updatedMemberships,
    member_count: updatedMemberships.length,
  };

  try {
    const admin = createAdminClient();
    await admin
      .from('groups')
      .update({
        name: updatedGroup.name,
        description: updatedGroup.description,
        updated_at: now,
      })
      .eq('id', params.group_id);

    // Replace leads
    await admin.from('group_leads').delete().eq('group_id', params.group_id);
    for (const gl of updatedLeads) {
      await admin.from('group_leads').insert({
        group_id: params.group_id,
        member_id: gl.member_id,
        lead_type: gl.lead_type,
        is_active: true,
      });
    }

    // Replace memberships
    await admin.from('group_memberships').delete().eq('group_id', params.group_id);
    for (const gm of updatedMemberships) {
      await admin.from('group_memberships').insert({
        group_id: params.group_id,
        member_id: gm.member_id,
        status: 'ACTIVE',
      });
    }
  } catch {}

  if (!globalThis.__sic_groups) globalThis.__sic_groups = [];
  const idx = globalThis.__sic_groups.findIndex(g => g.id === params.group_id);
  if (idx >= 0) {
    globalThis.__sic_groups[idx] = updatedGroup;
  } else {
    globalThis.__sic_groups.push(updatedGroup);
  }

  return updatedGroup;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('groups').delete().eq('id', groupId);
    if (!error) {
      if (globalThis.__sic_groups) {
        globalThis.__sic_groups = globalThis.__sic_groups.filter(g => g.id !== groupId);
      }
      return true;
    }
  } catch {}

  if (globalThis.__sic_groups) {
    const prevLen = globalThis.__sic_groups.length;
    globalThis.__sic_groups = globalThis.__sic_groups.filter(g => g.id !== groupId);
    return globalThis.__sic_groups.length < prevLen;
  }
  return false;
}

// ----------------------------------------------------------------------------
// Academic Query Helpers
// ----------------------------------------------------------------------------
function isExcludedCollege(c?: Partial<College> | null): boolean {
  if (!c) return false;
  if (c.id === 'e2222222-2222-2222-2222-222222222222') return true;
  if (c.code && c.code.toUpperCase() === 'CHSC') return true;
  if (c.name && c.name.toLowerCase().includes('hazarimal somani')) return true;
  return false;
}

export async function getColleges(): Promise<College[]> {
  const collegeMap = new Map<string, College>();

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('colleges').select('*').order('name');
    if (!error && data) {
      for (const c of data as College[]) {
        if (isExcludedCollege(c)) continue;
        collegeMap.set(c.id, c);
      }
    }
  } catch {}

  for (const sc of globalThis.__sic_colleges || []) {
    if (isExcludedCollege(sc)) continue;
    const exists = Array.from(collegeMap.values()).some(
      c => c.id === sc.id || c.code.toUpperCase() === sc.code.toUpperCase() || c.name.toLowerCase() === sc.name.toLowerCase()
    );
    if (!exists) {
      collegeMap.set(sc.id, sc);
    }
  }

  return Array.from(collegeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
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
    if (!error && data) {
      globalThis.__sic_colleges?.push(data as College);
      return data as College;
    }
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
  const courseMap = new Map<string, Course>();

  try {
    const admin = createAdminClient();
    let q = admin.from('courses').select('*, college:colleges(*)').order('name');
    if (collegeId) q = q.eq('college_id', collegeId);
    const { data, error } = await q;
    if (!error && data) {
      for (const c of data as Course[]) {
        if (c.college_id === 'e2222222-2222-2222-2222-222222222222' || isExcludedCollege(c.college)) {
          continue;
        }
        courseMap.set(c.id, c);
      }
    }
  } catch {}

  for (const sc of globalThis.__sic_courses || []) {
    if (collegeId && sc.college_id !== collegeId) continue;
    const exists = Array.from(courseMap.values()).some(
      c => c.id === sc.id || (c.college_id === sc.college_id && c.code.toUpperCase() === sc.code.toUpperCase())
    );
    if (!exists) {
      courseMap.set(sc.id, sc);
    }
  }

  return Array.from(courseMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const ORDINAL_YEAR_NAMES = ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year', 'Sixth Year'];

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

  let createdCourse: Course = newCourse;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('courses').insert(newCourse).select().single();
    if (!error && data) {
      createdCourse = data as Course;
      globalThis.__sic_courses?.push(createdCourse);
    } else {
      globalThis.__sic_courses?.push(newCourse);
    }
  } catch {
    globalThis.__sic_courses?.push(newCourse);
  }

  // Auto-generate Academic Years (1..durationYears) for the newly created course
  for (let yr = 1; yr <= durationYears; yr++) {
    const yearLabel = ORDINAL_YEAR_NAMES[yr - 1] || `Year ${yr}`;
    await addAcademicYear(createdCourse.id, yearLabel, yr);
  }

  return createdCourse;
}

export async function getAcademicYears(courseId?: string): Promise<AcademicYear[]> {
  const yearMap = new Map<string, AcademicYear>();

  try {
    const admin = createAdminClient();
    let q = admin.from('academic_years').select('*, course:courses(*)').order('year_number');
    if (courseId) q = q.eq('course_id', courseId);
    const { data, error } = await q;
    if (!error && data) {
      for (const y of data as AcademicYear[]) {
        yearMap.set(y.id, y);
      }
    }
  } catch {}

  for (const sy of globalThis.__sic_academic_years || []) {
    if (courseId && sy.course_id !== courseId) continue;
    const exists = Array.from(yearMap.values()).some(
      y => y.id === sy.id || (y.course_id === sy.course_id && y.year_number === sy.year_number)
    );
    if (!exists) {
      yearMap.set(sy.id, sy);
    }
  }

  return Array.from(yearMap.values()).sort((a, b) => a.year_number - b.year_number);
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
    if (!error && data) {
      globalThis.__sic_academic_years?.push(data as AcademicYear);
      return data as AcademicYear;
    }
  } catch {}

  globalThis.__sic_academic_years?.push(newYear);
  return newYear;
}

export async function getDivisions(params?: { academicYearId?: string; courseId?: string; collegeId?: string }): Promise<Division[]> {
  const divMap = new Map<string, Division>();

  try {
    const admin = createAdminClient();
    let q = admin.from('divisions').select('*, academic_year:academic_years(*), course:courses(*), college:colleges(*)').order('name');
    if (params?.academicYearId) q = q.eq('academic_year_id', params.academicYearId);
    if (params?.courseId) q = q.eq('course_id', params.courseId);
    if (params?.collegeId) q = q.eq('college_id', params.collegeId);
    const { data, error } = await q;
    if (!error && data) {
      for (const d of data as Division[]) {
        divMap.set(d.id, d);
      }
    }
  } catch {}

  for (const sd of globalThis.__sic_divisions || []) {
    if (params?.academicYearId && sd.academic_year_id !== params.academicYearId) continue;
    if (params?.courseId && sd.course_id !== params.courseId) continue;
    if (params?.collegeId && sd.college_id !== params.collegeId) continue;

    const exists = Array.from(divMap.values()).some(
      d =>
        d.id === sd.id ||
        (d.academic_year_id === sd.academic_year_id &&
          d.name.trim().toLowerCase() === sd.name.trim().toLowerCase())
    );
    if (!exists) {
      divMap.set(sd.id, sd);
    }
  }

  return Array.from(divMap.values()).sort((a, b) => a.name.localeCompare(b.name));
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
    if (!error && data) {
      globalThis.__sic_divisions?.push(data as Division);
      return data as Division;
    }
  } catch {}

  globalThis.__sic_divisions?.push(newDiv);
  return newDiv;
}

export async function deleteDivision(divisionId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('divisions').delete().eq('id', divisionId);
    if (!error) {
      if (globalThis.__sic_divisions) {
        globalThis.__sic_divisions = globalThis.__sic_divisions.filter(d => d.id !== divisionId);
      }
      return true;
    }
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
    let q = admin
      .from('member_registrations')
      .select(`
        *,
        college:colleges(*),
        course:courses(*),
        academic_year:academic_years(*),
        division:divisions(*),
        requested_groups:registration_groups(*, group:groups(*))
      `)
      .order('created_at', { ascending: false });

    if (options?.authUserId) q = q.eq('auth_user_id', options.authUserId);
    if (options?.status && options.status !== 'ALL') q = q.eq('status', options.status);
    if (options?.collegeIds && options.collegeIds.length > 0) {
      q = q.in('college_id', options.collegeIds);
    }

    const { data, error } = await q;
    if (!error && data) {
      if (!globalThis.__sic_registrations) globalThis.__sic_registrations = [];
      for (const r of data as MemberRegistration[]) {
        const idx = globalThis.__sic_registrations.findIndex(
          existing => existing.id === r.id || existing.email.toLowerCase() === r.email.toLowerCase()
        );
        if (idx >= 0) {
          globalThis.__sic_registrations[idx] = { ...globalThis.__sic_registrations[idx], ...r };
        } else {
          globalThis.__sic_registrations.push(r);
        }
      }
      return data as MemberRegistration[];
    }
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
  const allGroups = await getGroups();

  const college = colleges.find(c => c.id === payload.college_id);
  const course = courses.find(c => c.id === payload.course_id);
  const academic_year = years.find(y => y.id === payload.academic_year_id);
  const division = divisions.find(d => d.id === payload.division_id);

  // Check if updating an existing registration (resubmission)
  const existingList = await getRegistrations({ authUserId: payload.auth_user_id });
  const existing = existingList[0];

  const regId = existing?.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const registrationRecord: MemberRegistration = {
    id: regId,
    auth_user_id: payload.auth_user_id,
    email: payload.email.trim().toLowerCase(),
    full_name: payload.full_name.trim(),
    avatar_url: payload.avatar_url || existing?.avatar_url || null,
    college_id: payload.college_id,
    course_id: payload.course_id,
    academic_year_id: payload.academic_year_id,
    division_id: payload.division_id,
    roll_number: payload.roll_number.trim(),
    status: 'PENDING',
    correction_notes: null,
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

  const requested_groups: RegistrationGroup[] = [
    ...payload.member_group_ids.map(gid => ({
      id: crypto.randomUUID(),
      registration_id: regId,
      group_id: gid,
      request_type: 'MEMBER' as const,
      status: 'PENDING' as const,
      group: allGroups.find(g => g.id === gid),
    })),
    ...payload.leader_group_ids.map(gid => ({
      id: crypto.randomUUID(),
      registration_id: regId,
      group_id: gid,
      request_type: 'LEADER' as const,
      status: 'PENDING' as const,
      group: allGroups.find(g => g.id === gid),
    })),
  ];

  registrationRecord.requested_groups = requested_groups;

  const { error: regError } = await admin.from('member_registrations').upsert({
    id: regId,
    auth_user_id: payload.auth_user_id,
    email: registrationRecord.email,
    full_name: registrationRecord.full_name,
    avatar_url: registrationRecord.avatar_url,
    college_id: payload.college_id,
    course_id: payload.course_id,
    academic_year_id: payload.academic_year_id,
    division_id: payload.division_id,
    roll_number: registrationRecord.roll_number,
    status: 'PENDING',
    correction_notes: null,
    rejection_reason: null,
    updated_at: now,
  });

  if (regError && regError.code !== '42501') {
    throw new Error(regError.message || 'Failed to persist registration in PostgreSQL.');
  }

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

  await admin.from('registration_audit_logs').insert({
    registration_id: regId,
    action: existing ? 'RESUBMITTED' : 'SUBMITTED',
    notes: existing
      ? 'Application updated and resubmitted'
      : 'New membership application submitted',
  });

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
  if (!reg) return { success: false, error: 'Registration request not found.' };

  // Security Invariant: Admins may never approve or review their own registration
  const { data: reviewerMember } = await admin
    .from('members')
    .select('id, auth_user_id, email')
    .eq('id', params.reviewerMemberId)
    .maybeSingle();

  if (reviewerMember && reviewerMember.auth_user_id && reviewerMember.auth_user_id === reg.auth_user_id) {
    return {
      success: false,
      error: 'Security policy violation: You cannot review or approve your own registration.',
    };
  }

  const now = new Date().toISOString();
  const previousState = {
    registration_id: reg.id,
    email: reg.email,
    full_name: reg.full_name,
    status: reg.status,
    member_id: reg.member_id || null,
  };

  if (params.action === 'APPROVE') {
    const cleanId = reg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const memberCode = `SIC-${cleanId}`;
    const memberPayload = {
      auth_user_id: reg.auth_user_id,
      member_code: memberCode,
      full_name: reg.full_name,
      email: reg.email.toLowerCase(),
      avatar_url: reg.avatar_url,
      department: reg.course?.name || 'Innovation & Operations',
      designation: 'SIC Member',
      org_role: 'MEMBER',
      status: 'ACTIVE',
      college_id: reg.college_id,
      course_id: reg.course_id,
      academic_year_id: reg.academic_year_id,
      division_id: reg.division_id,
      roll_number: reg.roll_number,
      registration_id: reg.id,
      updated_at: now,
    };

    let memberId: string = reg.member_id || reg.id;
    const memberGroupIds = params.approvedGroupIds || [];
    const leaderGroupIds = params.approvedLeaderGroupIds || [];

    let lookup = await admin
      .from('members')
      .select('id, org_role')
      .eq('auth_user_id', reg.auth_user_id)
      .maybeSingle();
    if (!lookup.data) {
      lookup = await admin
        .from('members')
        .select('id, org_role')
        .ilike('email', reg.email)
        .maybeSingle();
    }

    if (lookup.data?.id) {
      memberId = lookup.data.id;
      const { error: updateMemberErr } = await admin
        .from('members')
        .update({
          ...memberPayload,
          org_role: lookup.data.org_role || 'MEMBER',
        })
        .eq('id', memberId);

      if (updateMemberErr && updateMemberErr.code !== '42501') {
        return { success: false, error: updateMemberErr.message };
      }
    } else {
      const { data: insertedMember, error: insertMemberErr } = await admin
        .from('members')
        .insert(memberPayload)
        .select('id')
        .maybeSingle();

      if (insertMemberErr && insertMemberErr.code !== '42501') {
        return {
          success: false,
          error: insertMemberErr.message || 'Failed to create member record on approval.',
        };
      }
      if (insertedMember?.id) {
        memberId = insertedMember.id;
      }
    }

    const validReviewerId = reviewerMember?.id || null;

    for (const groupId of memberGroupIds) {
      await admin.from('group_memberships').upsert(
        {
          group_id: groupId,
          member_id: memberId,
          status: 'ACTIVE',
          added_by: validReviewerId,
        },
        { onConflict: 'group_id,member_id' }
      );
    }

    for (const groupId of leaderGroupIds) {
      await admin.from('group_leads').upsert(
        {
          group_id: groupId,
          member_id: memberId,
          lead_type: 'PRIMARY_LEAD',
          assigned_by: validReviewerId,
          is_active: true,
        },
        { onConflict: 'group_id,member_id' }
      );
      await admin.from('group_memberships').upsert(
        {
          group_id: groupId,
          member_id: memberId,
          status: 'ACTIVE',
          added_by: validReviewerId,
        },
        { onConflict: 'group_id,member_id' }
      );
    }

    for (const request of reg.requested_groups || []) {
      const approved =
        request.request_type === 'MEMBER'
          ? memberGroupIds.includes(request.group_id)
          : leaderGroupIds.includes(request.group_id);
      await admin
        .from('registration_groups')
        .update({
          status: approved ? 'APPROVED' : 'REJECTED',
          reviewed_by: validReviewerId,
          reviewed_at: now,
        })
        .eq('registration_id', reg.id)
        .eq('group_id', request.group_id)
        .eq('request_type', request.request_type);
    }

    const { error: regUpdateErr } = await admin
      .from('member_registrations')
      .update({
        status: 'APPROVED',
        reviewed_by: validReviewerId,
        reviewed_at: now,
        member_id: memberId,
        updated_at: now,
      })
      .eq('id', reg.id);

    if (regUpdateErr && regUpdateErr.code !== '42501') {
      return { success: false, error: regUpdateErr.message };
    }

    await admin.from('registration_audit_logs').insert({
      registration_id: reg.id,
      action: 'APPROVED',
      performed_by: validReviewerId,
      notes: 'Registration approved by an authorized administrator.',
    });

    await recordAdminAuditLog(admin, {
      actorId: params.reviewerMemberId,
      targetMemberId: memberId,
      action: 'REGISTRATION_APPROVED',
      entityType: 'MEMBER_REGISTRATION',
      entityId: reg.id,
      previousState,
      newState: {
        registration_id: reg.id,
        member_id: memberId,
        email: reg.email,
        status: 'APPROVED',
        member_status: 'ACTIVE',
        approved_group_ids: memberGroupIds,
        approved_leader_group_ids: leaderGroupIds,
      },
    });

    reg.status = 'APPROVED';
    reg.reviewed_by = params.reviewerMemberId;
    reg.reviewed_at = now;
    reg.member_id = memberId;
    reg.updated_at = now;

    if (reg.requested_groups) {
      for (const request of reg.requested_groups) {
        const approved =
          request.request_type === 'MEMBER'
            ? memberGroupIds.includes(request.group_id)
            : leaderGroupIds.includes(request.group_id);
        request.status = approved ? 'APPROVED' : 'REJECTED';
        request.reviewed_by = params.reviewerMemberId;
        request.reviewed_at = now;
      }
    }

    if (!globalThis.__sic_members) globalThis.__sic_members = [];
    const activeGroups = (reg.requested_groups || [])
      .filter(r => r.request_type === 'MEMBER' && r.status === 'APPROVED')
      .map(r => ({
        id: r.group_id,
        code: r.group?.code || 'SIC',
        name: r.group?.name || 'SIC Group',
      }));
    const storedMember: StoredMember = {
      id: memberId,
      auth_user_id: reg.auth_user_id,
      member_code: memberCode,
      full_name: reg.full_name,
      email: reg.email,
      phone: null,
      department: reg.course?.name || 'Innovation & Operations',
      designation: 'SIC Member',
      org_role: 'MEMBER',
      status: 'ACTIVE',
      avatar_url: reg.avatar_url || null,
      college_id: reg.college_id,
      course_id: reg.course_id,
      academic_year_id: reg.academic_year_id,
      division_id: reg.division_id,
      roll_number: reg.roll_number,
      college: reg.college,
      course: reg.course,
      academic_year: reg.academic_year,
      division: reg.division,
      joined_at: now.split('T')[0],
      created_at: reg.created_at,
      updated_at: now,
      activeGroups,
    };
    const index = globalThis.__sic_members.findIndex(
      m => m.email.toLowerCase() === reg.email.toLowerCase()
    );
    if (index >= 0) {
      globalThis.__sic_members[index] = { ...globalThis.__sic_members[index], ...storedMember };
    } else {
      globalThis.__sic_members.unshift(storedMember);
    }

    return { success: true, registration: reg };
  }

  const validReviewerId = reviewerMember?.id || null;

  if (params.action === 'REQUEST_CORRECTION') {
    if (!params.notes?.trim()) {
      return {
        success: false,
        error: 'Please specify what needs correction so the applicant can amend their details.',
      };
    }

    const { error: updateErr } = await admin
      .from('member_registrations')
      .update({
        status: 'NEEDS_CORRECTION',
        correction_notes: params.notes.trim(),
        reviewed_by: validReviewerId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', reg.id);

    if (updateErr && updateErr.code !== '42501') {
      return { success: false, error: updateErr.message };
    }

    await admin.from('registration_audit_logs').insert({
      registration_id: reg.id,
      action: 'NEEDS_CORRECTION',
      performed_by: validReviewerId,
      notes: params.notes.trim(),
    });

    await recordAdminAuditLog(admin, {
      actorId: params.reviewerMemberId,
      targetMemberId: reg.member_id || null,
      action: 'REGISTRATION_CORRECTION_REQUESTED',
      entityType: 'MEMBER_REGISTRATION',
      entityId: reg.id,
      previousState,
      newState: {
        registration_id: reg.id,
        email: reg.email,
        status: 'NEEDS_CORRECTION',
        correction_notes: params.notes.trim(),
      },
    });

    reg.status = 'NEEDS_CORRECTION';
    reg.correction_notes = params.notes.trim();
    reg.reviewed_by = params.reviewerMemberId;
    reg.reviewed_at = now;
    reg.updated_at = now;

    return { success: true, registration: reg };
  }

  if (params.action === 'REJECT') {
    const reason =
      params.notes?.trim() || 'Application does not satisfy institutional criteria.';

    const { error: updateErr } = await admin
      .from('member_registrations')
      .update({
        status: 'REJECTED',
        rejection_reason: reason,
        reviewed_by: validReviewerId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', reg.id);

    if (updateErr && updateErr.code !== '42501') {
      return { success: false, error: updateErr.message };
    }

    await admin.from('registration_audit_logs').insert({
      registration_id: reg.id,
      action: 'REJECTED',
      performed_by: validReviewerId,
      notes: reason,
    });

    await recordAdminAuditLog(admin, {
      actorId: params.reviewerMemberId,
      targetMemberId: reg.member_id || null,
      action: 'REGISTRATION_REJECTED',
      entityType: 'MEMBER_REGISTRATION',
      entityId: reg.id,
      previousState,
      newState: {
        registration_id: reg.id,
        email: reg.email,
        status: 'REJECTED',
        rejection_reason: reason,
      },
    });

    reg.status = 'REJECTED';
    reg.rejection_reason = reason;
    reg.reviewed_by = params.reviewerMemberId;
    reg.reviewed_at = now;
    reg.updated_at = now;

    return { success: true, registration: reg };
  }

  return { success: false, error: 'Unknown action specified.' };
}
