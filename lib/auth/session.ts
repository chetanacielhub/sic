import { NextResponse } from 'next/server';
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
 * Internal helper to obtain the authoritative DB client for session reads.
 * Uses the Service Role client when configured, otherwise uses the RLS-protected server client.
 */
async function getSessionReadClient() {
  try {
    return { db: createAdminClient(), isAdminClient: true };
  } catch {
    return { db: await createClient(), isAdminClient: false };
  }
}

/**
 * Resolves the authenticated user to their SIC Member profile from PostgreSQL.
 * - Returns null if the user has no member record or has been removed (status === 'INACTIVE').
 * - Returns the member with status === 'SUSPENDED' if banned, so callers can block and redirect.
 * - Automatically provisions/elevates configured SUPER_ADMIN_EMAILS.
 */
export async function getCurrentMember(
  providedUser?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null
): Promise<Member | null> {
  const user = providedUser || (await getSessionUser());
  if (!user) return null;

  const { db, isAdminClient } = await getSessionReadClient();
  const isEnvSuperAdmin = isConfiguredSuperAdminEmail(user.email);

  // 1. Match via auth_user_id in PostgreSQL members table
  const { data: byAuth } = await db
    .from('members')
    .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (byAuth) {
    if (isEnvSuperAdmin && (byAuth.org_role !== 'SUPER_ADMIN' || byAuth.status !== 'ACTIVE')) {
      if (isAdminClient) {
        await db
          .from('members')
          .update({ org_role: 'SUPER_ADMIN', status: 'ACTIVE' })
          .eq('id', byAuth.id);
      }
      return { ...byAuth, org_role: 'SUPER_ADMIN', status: 'ACTIVE' } as Member;
    }
    if (byAuth.status === 'INACTIVE') {
      return null;
    }
    return byAuth as Member;
  }

  // 2. Match by email (for invited or pre-seeded PostgreSQL member accounts)
  if (user.email) {
    const { data: byEmail } = await db
      .from('members')
      .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
      .ilike('email', user.email)
      .maybeSingle();

    if (byEmail) {
      if (!isEnvSuperAdmin && byEmail.status === 'INACTIVE') {
        return null;
      }

      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      const updatePayload: Record<string, unknown> = { auth_user_id: user.id };
      if (!byEmail.avatar_url && avatarUrl) {
        updatePayload.avatar_url = avatarUrl;
      }
      if (isEnvSuperAdmin) {
        updatePayload.org_role = 'SUPER_ADMIN';
        updatePayload.status = 'ACTIVE';
      }
      if (isAdminClient) {
        await db
          .from('members')
          .update(updatePayload)
          .eq('id', byEmail.id);
      }

      return {
        ...byEmail,
        auth_user_id: user.id,
        org_role: isEnvSuperAdmin ? 'SUPER_ADMIN' : byEmail.org_role,
        status: isEnvSuperAdmin ? 'ACTIVE' : byEmail.status,
        avatar_url: (updatePayload.avatar_url as string) || byEmail.avatar_url,
      } as Member;
    }
  }

  // 3. Auto-provision configured Super Admin email (e.g. chetana.cielhub@gmail.com)
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

    if (isAdminClient) {
      try {
        const { data: inserted } = await db
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
    }

    return newAdminPayload as Member;
  }

  // 4. Fallback to in-memory store only for local development when DB is unseeded
  if (user.email) {
    const stored = getStoredMembers().find(
      (m) => m.email.toLowerCase() === user.email!.toLowerCase() || m.auth_user_id === user.id
    );
    if (stored) {
      if (stored.status === 'INACTIVE') return null;
      stored.auth_user_id = user.id;
      return stored;
    }
  }

  return null;
}

/**
 * Retrieves the registration submission for the authenticated user from PostgreSQL.
 */
export async function getCurrentUserRegistration(userId?: string): Promise<MemberRegistration | null> {
  const sessionUser = await getSessionUser();
  const effectiveUserId = userId || sessionUser?.id;
  if (!effectiveUserId) return null;

  try {
    const { db } = await getSessionReadClient();
    const { data: registration, error } = await db
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
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && registration) return registration as MemberRegistration;
  } catch {}

  const storeRegs = await getRegistrations({ authUserId: effectiveUserId });
  if (storeRegs[0]) return storeRegs[0];

  return null;
}

/**
 * Enforces that the request is from an authenticated, ACTIVE SIC member.
 * Rejects unauthenticated, unapproved, removed (INACTIVE), or banned (SUSPENDED) users.
 */
export async function requireActiveMember(): Promise<{
  member: Member | null;
  errorResponse: NextResponse | null;
}> {
  const user = await getSessionUser();
  if (!user) {
    return {
      member: null,
      errorResponse: NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      ),
    };
  }

  const member = await getCurrentMember(user);
  if (!member) {
    return {
      member: null,
      errorResponse: NextResponse.json(
        { error: 'Access denied. An approved SIC membership is required.' },
        { status: 403 }
      ),
    };
  }

  if (member.status === 'SUSPENDED') {
    return {
      member: null,
      errorResponse: NextResponse.json(
        { error: 'Your SIC membership has been suspended by an administrator.' },
        { status: 403 }
      ),
    };
  }

  if (member.status !== 'ACTIVE') {
    return {
      member: null,
      errorResponse: NextResponse.json(
        { error: 'Your SIC membership is not active.' },
        { status: 403 }
      ),
    };
  }

  return { member, errorResponse: null };
}

/**
 * Enforces that the request is from an authenticated, ACTIVE SIC Administrator
 * (SUPER_ADMIN, SIC_DIRECTOR, SIC_ADMIN, or authorized ASSOCIATE_ADMIN).
 */
export async function requireAdminMember(): Promise<{
  member: Member | null;
  scope: { isAuthorized: boolean; isSuperAdmin: boolean; collegeIds: string[] } | null;
  errorResponse: NextResponse | null;
}> {
  const { member, errorResponse } = await requireActiveMember();
  if (errorResponse || !member) {
    return { member: null, scope: null, errorResponse };
  }

  const scope = await getAssociateAdminScope(member.id);
  const isRoleAdmin = ['SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN', 'ASSOCIATE_ADMIN'].includes(
    member.org_role
  );

  if (!scope.isAuthorized && !isRoleAdmin) {
    return {
      member: null,
      scope: null,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Only authorized SIC Administrators can perform this action.' },
        { status: 403 }
      ),
    };
  }

  return {
    member,
    scope: {
      isAuthorized: true,
      isSuperAdmin:
        scope.isSuperAdmin ||
        ['SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN'].includes(member.org_role),
      collegeIds: scope.collegeIds,
    },
    errorResponse: null,
  };
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

  const member = await getCurrentMember(user);
  const registration = !member ? await getCurrentUserRegistration(user.id) : null;

  let isAssociateAdmin = false;
  let isSuperAdmin = false;
  let collegeIds: string[] = [];

  if (member && member.status === 'ACTIVE') {
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
