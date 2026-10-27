import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Member, MemberRegistration, RegistrationStatus } from '@/lib/types/sic';
import { getAssociateAdminScope } from './rbac';

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
 * Does NOT auto-provision members.
 */
export async function getCurrentMember(): Promise<Member | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  // Try matching via auth_user_id
  const { data: byAuth } = await adminClient
    .from('members')
    .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (byAuth) return byAuth as Member;

  // Fallback matching by email (for pre-existing seeded accounts)
  if (user.email) {
    const { data: byEmail } = await adminClient
      .from('members')
      .select('*, college:colleges(*), course:courses(*), academic_year:academic_years(*), division:divisions(*)')
      .eq('email', user.email)
      .maybeSingle();

    if (byEmail) {
      // Auto-link auth_user_id and sync avatar for future quick lookups
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      const updatePayload: Record<string, unknown> = { auth_user_id: user.id };
      if (!byEmail.avatar_url && avatarUrl) {
        updatePayload.avatar_url = avatarUrl;
      }
      await adminClient
        .from('members')
        .update(updatePayload)
        .eq('id', byEmail.id);

      return {
        ...byEmail,
        auth_user_id: user.id,
        avatar_url: (updatePayload.avatar_url as string) || byEmail.avatar_url,
      } as Member;
    }
  }

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

  if (error || !registration) return null;
  return registration as MemberRegistration;
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


