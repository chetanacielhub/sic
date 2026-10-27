// ============================================================================
// SIC Unified Attendance & Operations Management System
// Centralized Project-Based Role Based Access Control (RBAC) Engine
// ============================================================================

import { Permission, ProjectRole, UserEffectiveContext, Project } from '@/lib/types/sic';
import { createAdminClient } from '@/lib/supabase/admin';

export const ALL_PERMISSIONS: Permission[] = [
  'platform.manage',
  'projects.create',
  'projects.manage',
  'members.view',
  'members.invite',
  'members.manage',
  'roles.assign',
  'teams.manage',
  'attendance.create',
  'attendance.check_in',
  'attendance.view_own',
  'attendance.view_team',
  'attendance.view_project',
  'attendance.correct',
  'attendance.export',
  'minutes.view',
  'minutes.manage',
  'tasks.view',
  'tasks.manage',
  'analytics.view',
  'audit.view',
];

export const ROLE_PERMISSIONS: Record<'SUPER_ADMIN' | 'ASSOCIATE_ADMIN' | ProjectRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ASSOCIATE_ADMIN: [
    'academic.manage',
    'registrations.review',
    'members.view',
    'attendance.view_team',
    'attendance.view_project',
    'analytics.view',
  ],

  PROJECT_ADMIN: [
    'projects.manage',
    'members.view',
    'members.invite',
    'members.manage',
    'roles.assign',
    'teams.manage',
    'attendance.create',
    'attendance.check_in',
    'attendance.view_own',
    'attendance.view_team',
    'attendance.view_project',
    'attendance.correct',
    'attendance.export',
    'minutes.view',
    'minutes.manage',
    'tasks.view',
    'tasks.manage',
    'analytics.view',
    'audit.view',
  ],

  LEAD: [
    'members.view',
    'teams.manage',
    'attendance.create',
    'attendance.check_in',
    'attendance.view_own',
    'attendance.view_team',
    'attendance.correct',
    'minutes.view',
    'minutes.manage',
    'tasks.view',
    'tasks.manage',
    'analytics.view',
  ],

  MEMBER: [
    'attendance.check_in',
    'attendance.view_own',
    'minutes.view',
    'tasks.view',
  ],
};

/**
 * Returns granted permissions array for a role.
 */
export function getPermissionsForRole(role: 'SUPER_ADMIN' | 'ASSOCIATE_ADMIN' | ProjectRole | null | undefined): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Validates if a role possesses a specific permission.
 */
export function roleHasPermission(role: 'SUPER_ADMIN' | 'ASSOCIATE_ADMIN' | ProjectRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if a member is an authorized Associate Admin or Super Admin,
 * returning their authorized college scope.
 */
export async function getAssociateAdminScope(memberId: string): Promise<{
  isAuthorized: boolean;
  isSuperAdmin: boolean;
  collegeIds: string[]; // empty means all colleges (Super Admin or unrestricted)
}> {
  const adminClient = createAdminClient();

  const { data: member } = await adminClient
    .from('members')
    .select('id, org_role, status')
    .eq('id', memberId)
    .single();

  if (!member || member.status !== 'ACTIVE') {
    return { isAuthorized: false, isSuperAdmin: false, collegeIds: [] };
  }

  // Check Platform Super Admin
  const isSuper = member.org_role === 'SUPER_ADMIN' || member.org_role === 'SIC_DIRECTOR' || member.org_role === 'SIC_ADMIN';
  if (isSuper) {
    return { isAuthorized: true, isSuperAdmin: true, collegeIds: [] };
  }

  // Check Associate Admin role
  const isAssocRole = member.org_role === 'ASSOCIATE_ADMIN';

  // Support designated demo associate admin (Aarav Patel)
  if (memberId === 'a1111111-1111-1111-1111-111111111111') {
    return {
      isAuthorized: true,
      isSuperAdmin: false,
      collegeIds: ['e1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222'],
    };
  }

  // Check associate_admins table for specific college scoping
  let assignments = null;
  try {
    const res = await adminClient
      .from('associate_admins')
      .select('college_id, is_active')
      .eq('member_id', memberId)
      .eq('is_active', true);
    assignments = res.data;
  } catch {}

  const hasAssignment = (assignments && assignments.length > 0);

  if (!isAssocRole && !hasAssignment) {
    return { isAuthorized: false, isSuperAdmin: false, collegeIds: [] };
  }


  // Filter assigned college IDs (null college_id means all colleges)
  const hasGlobalScope = assignments?.some(a => a.college_id === null);
  const collegeIds = hasGlobalScope 
    ? [] 
    : (assignments || []).map(a => a.college_id).filter(Boolean) as string[];

  return {
    isAuthorized: true,
    isSuperAdmin: false,
    collegeIds,
  };
}


/**
 * Fetches the user's platform super admin status and all project memberships.
 */
export async function resolveUserContext(
  memberId: string,
  targetProjectId?: string
): Promise<UserEffectiveContext> {
  const adminClient = createAdminClient();

  // 1. Fetch Member Profile
  const { data: member } = await adminClient
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (!member) {
    return {
      member: null,
      isSuperAdmin: false,
      projects: [],
      permissions: [],
    };
  }

  // 2. Check Platform Super Admin
  const { data: superAdminRecord } = await adminClient
    .from('platform_super_admins')
    .select('id')
    .eq('member_id', memberId)
    .maybeSingle();

  const isSuperAdmin = Boolean(superAdminRecord) || member.org_role === 'SUPER_ADMIN' || member.org_role === 'SIC_DIRECTOR';

  // 3. Fetch Active Project Memberships
  const { data: memberships } = await adminClient
    .from('project_memberships')
    .select(`
      role,
      status,
      project:projects(*)
    `)
    .eq('member_id', memberId)
    .eq('status', 'ACTIVE');

  const projects: Array<{ project: Project; role: ProjectRole }> = (memberships || [])
    .map(m => {
      const p = Array.isArray(m.project) ? m.project[0] : m.project;
      return {
        project: p as Project,
        role: m.role as ProjectRole,
      };
    })
    .filter(p => Boolean(p.project));

  // 4. Resolve Active Project and Effective Role
  let activeProjectId = targetProjectId;
  if (!activeProjectId && projects.length > 0) {
    activeProjectId = projects[0].project.id;
  }

  let effectiveRole: 'SUPER_ADMIN' | ProjectRole | undefined = undefined;
  if (isSuperAdmin) {
    effectiveRole = 'SUPER_ADMIN';
  } else if (activeProjectId) {
    const match = projects.find(p => p.project.id === activeProjectId);
    effectiveRole = match ? match.role : undefined;
  }

  const permissions = isSuperAdmin 
    ? ALL_PERMISSIONS 
    : effectiveRole 
    ? getPermissionsForRole(effectiveRole) 
    : [];

  return {
    member,
    isSuperAdmin,
    projects,
    activeProjectId,
    effectiveRole,
    permissions,
  };
}
