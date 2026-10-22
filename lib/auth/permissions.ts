// ============================================================================
// SIC Unified Attendance & Operations Management System
// Server-side Authorization and Scoped Permission Helpers
// ============================================================================

import { Member, Session, OrgRole } from '@/lib/types/sic';
import { createAdminClient } from '@/lib/supabase/admin';

export const ADMIN_ROLES: OrgRole[] = ['SUPER_ADMIN', 'SIC_DIRECTOR', 'SIC_ADMIN'];
export const AUDITOR_ROLES: OrgRole[] = [...ADMIN_ROLES, 'ATTENDANCE_AUDITOR', 'OPERATIONS_MANAGER'];

/**
 * Checks if a member possesses institutional administrator privileges.
 */
export function isInstitutionalAdmin(member: Member | null | undefined): boolean {
  if (!member) return false;
  return ADMIN_ROLES.includes(member.org_role);
}

/**
 * Checks if a member has operations or auditing privileges.
 */
export function hasAuditorPrivileges(member: Member | null | undefined): boolean {
  if (!member) return false;
  return AUDITOR_ROLES.includes(member.org_role);
}

/**
 * Verifies if a member is an active Lead (Primary or Co-Lead) of a specific group.
 */
export async function isMemberLeadOfGroup(memberId: string, groupId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  
  // First check if member is global admin
  const { data: member } = await adminClient
    .from('members')
    .select('org_role')
    .eq('id', memberId)
    .single();

  if (member && ADMIN_ROLES.includes(member.org_role as OrgRole)) {
    return true;
  }

  // Check group_leads table
  const { data: lead } = await adminClient
    .from('group_leads')
    .select('id')
    .eq('group_id', groupId)
    .eq('member_id', memberId)
    .eq('is_active', true)
    .maybeSingle();

  return Boolean(lead);
}

/**
 * Verifies if a member can manage or host a specific session.
 * True if member is the assigned Host, a lead of any participating group, or a global Admin.
 */
export async function canManageSession(memberId: string, session: Session): Promise<boolean> {
  if (session.host_id === memberId) return true;

  const adminClient = createAdminClient();
  const { data: member } = await adminClient
    .from('members')
    .select('org_role')
    .eq('id', memberId)
    .single();

  if (member && ADMIN_ROLES.includes(member.org_role as OrgRole)) {
    return true;
  }

  // Check if lead of any participating group
  const { data: sessionGroups } = await adminClient
    .from('session_groups')
    .select('group_id')
    .eq('session_id', session.id);

  if (sessionGroups && sessionGroups.length > 0) {
    const groupIds = sessionGroups.map(sg => sg.group_id);
    const { data: leadRecord } = await adminClient
      .from('group_leads')
      .select('id')
      .in('group_id', groupIds)
      .eq('member_id', memberId)
      .eq('is_active', true)
      .limit(1);

    if (leadRecord && leadRecord.length > 0) {
      return true;
    }
  }

  return false;
}
