import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Member, MemberRegistration, RegistrationStatus } from '@/lib/types/sic';
import { getRegistrations, getStoredMembers } from '@/lib/academic/store';
import { getAssociateAdminScope } from './rbac';

export const SUPER_ADMIN_FALLBACK_MEMBER_ID = 'a0000000-0000-0000-0000-000000000000';

/**
 * Checks whether an email address is configured as a Super Admin via SUPER_ADMIN_EMAILS.
 */
export function isConfiguredSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.SUPER_ADMIN_EMAILS || 'chetana.cielhub@gmail.com';
  const list = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.includes('chetana.cielhub@gmail.com')) {
    list.push('chetana.cielhub@gmail.com');
  }
  return list.includes(email.trim().toLowerCase());
}

/**
 * Retrieves the currently authenticated Supabase Auth user.
 */
export async function getSessionUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user to their approved SIC Member profile.
 * Automatically provisions/elevates configured SUPER_ADMIN_EMAILS (such as chetana.cielhub@gmail.com).
 */
export async function getCurrentMember(
  providedUser?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null
): Promise<Member | null> {
  const user = providedUser || (await getSessionUser());
  if (!user) return null;

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const isEnvSuperAdmin = isConfiguredSuperAdminEmail(user.email);

  // Try matching via auth_user_id (using authenticated client first so RLS auth.uid() is populated)
  const { data: byAuth } = await supabase
    .from('members')
    .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (byAuth) {
    if (isEnvSuperAdmin && (byAuth.org_role !== 'SUPER_ADMIN' || byAuth.status !== 'ACTIVE')) {
      await adminClient
        .from('members')
        .update({ org_role: 'SUPER_ADMIN', status: 'ACTIVE' })
        .eq('id', byAuth.id);
      return { ...byAuth, org_role: 'SUPER_ADMIN', status: 'ACTIVE' } as Member;
    }
    return byAuth as Member;
  }

  // Fallback matching by email (for pre-existing seeded accounts)
  if (user.email) {
    const { data: byEmail } = await supabase
      .from('members')
      .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
      .ilike('email', user.email)
      .maybeSingle();

    if (byEmail) {
      // Auto-link auth_user_id and sync avatar for future quick lookups
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      const updatePayload: Record<string, unknown> = { auth_user_id: user.id };
      if (!byEmail.avatar_url && avatarUrl) {
        updatePayload.avatar_url = avatarUrl;
      }
      if (isEnvSuperAdmin) {
        updatePayload.org_role = 'SUPER_ADMIN';
        updatePayload.status = 'ACTIVE';
      }
      await adminClient
        .from('members')
        .update(updatePayload)
        .eq('id', byEmail.id);

      return {
        ...byEmail,
        auth_user_id: user.id,
        org_role: isEnvSuperAdmin ? 'SUPER_ADMIN' : byEmail.org_role,
        status: isEnvSuperAdmin ? 'ACTIVE' : byEmail.status,
        avatar_url: (updatePayload.avatar_url as string) || byEmail.avatar_url,
      } as Member;
    }
  }

  // Auto-provision configured Super Admin email (e.g. chetana.cielhub@gmail.com)
  if (isEnvSuperAdmin && user.email) {
    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      'Chetana CIEL Super Admin';
    const avatarUrl =
      (user.user_metadata?.avatar_url as string) ||
      (user.user_metadata?.picture as string) ||
      null;
    const nowIso = new Date().toISOString();

    const newAdminPayload = {
      id: SUPER_ADMIN_FALLBACK_MEMBER_ID,
      auth_user_id: user.id,
      member_code: 'SIC-ADM-000',
      full_name: fullName,
      email: user.email,
      phone: null,
      department: 'Executive Board & CIEL Operations',
      designation: 'Platform Super Administrator',
      org_role: 'SUPER_ADMIN' as const,
      status: 'ACTIVE' as const,
      avatar_url: avatarUrl,
      joined_at: nowIso.split('T')[0],
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      const { data: inserted } = await adminClient
        .from('members')
        .upsert(newAdminPayload, { onConflict: 'email' })
        .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
        .maybeSingle();

      if (inserted) {
        return inserted as Member;
      }
    } catch {
      // Fallback to in-memory Super Admin profile if DB table is not migrated yet
    }

    return newAdminPayload as Member;
  }

  // Fallback: check invited / managed members in store
  if (user.email) {
    const stored = getStoredMembers().find(
      m => m.email.toLowerCase() === user.email!.toLowerCase() || m.auth_user_id === user.id
    );
    if (stored) {
      stored.auth_user_id = user.id;
      return stored;
    }
  }

  // Fallback: check if user has an APPROVED registration in the registration store
  try {
    const regs = await getRegistrations({ authUserId: user.id });
    const approvedReg = regs.find(r => r.status === 'APPROVED');
    if (approvedReg) {
      const cleanId = user.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      return {
        id: approvedReg.member_id || approvedReg.id,
        auth_user_id: user.id,
        member_code: `SIC-${cleanId}`,
        full_name: approvedReg.full_name,
        email: approvedReg.email,
        phone: null,
        department: approvedReg.course?.name || 'Innovation & Operations',
        designation: 'SIC Member',
        org_role: 'MEMBER',
        status: 'ACTIVE',
        avatar_url: approvedReg.avatar_url || null,
        college_id: approvedReg.college_id,
        course_id: approvedReg.course_id,
        academic_year_id: approvedReg.academic_year_id,
        division_id: approvedReg.division_id,
        roll_number: approvedReg.roll_number,
        college: approvedReg.college,
        course: approvedReg.course,
        academic_year: approvedReg.academic_year,
        division: approvedReg.division,
        joined_at: approvedReg.reviewed_at || approvedReg.created_at,
        created_at: approvedReg.created_at,
        updated_at: approvedReg.updated_at,
      } as Member;
    }
  } catch {}

  return null;
}

/**
 * Retrieves the registration submission for the authenticated user.
 */
export async function getCurrentUserRegistration(userId?: string): Promise<MemberRegistration | null> {
  const adminClient = createAdminClient();
  const effectiveUserId = userId || (await getSessionUser())?.id;
  if (!effectiveUserId) return null;

  const { data: registration, error } = await adminClient
    .from('member_registrations')
    .select(`
      *,
      college:colleges(*),
      course:courses(*),
      academic_year:academic_years(*),
      division:divisions(*),
      requested_groups:registration_groups(*, group:groups(*))
    `)
    .eq('auth_user_id', effectiveUserId)
    .maybeSingle();

  if (!error && registration) return registration as MemberRegistration;

  const storeRegs = await getRegistrations({ authUserId: effectiveUserId });
  return storeRegs[0] || null;
}

export interface UnifiedAuthContext {
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null;
  member: Member | null;
  registration: MemberRegistration | null;
  registrationStatus: RegistrationStatus | null;
  isRegistered: boolean;
  isApprovedMember: boolean;
  isAssociateAdmin: boolean;
  isSuperAdmin: boolean;
  collegeIds: string[];
}

/**
 * Resolves comprehensive security and access context for the current session.
 */
export async function getUnifiedAuthContext(): Promise<UnifiedAuthContext> {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      member: null,
      registration: null,
      registrationStatus: null,
      isRegistered: false,
      isApprovedMember: false,
      isAssociateAdmin: false,
      isSuperAdmin: false,
      collegeIds: [],
    };
  }

  const member = await getCurrentMember();
  const registration = !member ? await getCurrentUserRegistration(user.id) : null;

  let isAssociateAdmin = false;
  let isSuperAdmin = false;
  let collegeIds: string[] = [];

  if (member) {
    const scope = await getAssociateAdminScope(member.id);
    isAssociateAdmin = scope.isAuthorized;
    isSuperAdmin = scope.isSuperAdmin;
    collegeIds = scope.collegeIds;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    },
    member,
    registration,
    registrationStatus: registration?.status || null,
    isRegistered: Boolean(registration || member),
    isApprovedMember: Boolean(member && member.status === 'ACTIVE'),
    isAssociateAdmin,
    isSuperAdmin,
    collegeIds,
  };
}


