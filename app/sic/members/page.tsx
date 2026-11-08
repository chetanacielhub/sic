// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/members
// Member Directory, Invite User, Ban/Unban & Admin Member Approval Console
// ============================================================================

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { getRegistrations, getStoredMembers, getRemovedMemberKeys, getGroups } from '@/lib/academic/store';
import { MembersDirectoryClient, DirectoryMemberItem } from '@/components/sic/members-directory-client';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const supabase = await createClient();
  const currentMember = await getCurrentMember();

  let isAdmin = false;
  let isSuperAdmin = false;
  let scopedCollegeIds: string[] = [];

  if (currentMember) {
    const scope = await getAssociateAdminScope(currentMember.id);
    isAdmin =
      scope.isAuthorized ||
      currentMember.org_role === 'SUPER_ADMIN' ||
      currentMember.org_role === 'SIC_DIRECTOR' ||
      currentMember.org_role === 'SIC_ADMIN';
    isSuperAdmin =
      scope.isSuperAdmin ||
      currentMember.org_role === 'SUPER_ADMIN' ||
      currentMember.org_role === 'SIC_DIRECTOR';
    scopedCollegeIds = scope.collegeIds;
  }

  // 1. Fetch members from Supabase using authenticated client
  const { data: dbMembers } = await supabase
    .from('members')
    .select(`
      *,
      college:colleges(*),
      course:courses(*),
      academic_year:academic_years(*),
      division:divisions(*),
      group_memberships(
        status,
        group:groups(id, name, code)
      )
    `)
    .order('member_code', { ascending: true });

  // 2. Fetch registrations and groups
  const [allRegistrations, availableGroups] = await Promise.all([
    getRegistrations({
      collegeIds: !isSuperAdmin && scopedCollegeIds.length > 0 ? scopedCollegeIds : undefined,
    }),
    getGroups(),
  ]);

  // 3. Build unified directory member list (DB members + Stored/Invited members + Registrations)
  const directoryMap = new Map<string, DirectoryMemberItem>();
  const removedKeys = getRemovedMemberKeys();

  for (const m of dbMembers || []) {
    if (removedKeys.has(m.id.toLowerCase()) || removedKeys.has(m.email.toLowerCase())) continue;
    const activeGroups = ((m.group_memberships || []) as Array<{
      status: string;
      group: { id?: string; code: string; name: string } | Array<{ id?: string; code: string; name: string }>;
    }>)
      .filter(gm => gm.status === 'ACTIVE')
      .map(gm => (Array.isArray(gm.group) ? gm.group[0] : gm.group))
      .filter(Boolean);

    directoryMap.set(m.email.toLowerCase(), {
      ...m,
      activeGroups,
    } as DirectoryMemberItem);
  }

  // Merge invited/managed members from store
  for (const sm of getStoredMembers()) {
    if (removedKeys.has(sm.id.toLowerCase()) || removedKeys.has(sm.email.toLowerCase())) continue;
    directoryMap.set(sm.email.toLowerCase(), {
      ...sm,
      activeGroups: sm.activeGroups || [],
    });
  }

  // Ensure all registrations in the store are also represented in the directory so Admin can Approve, Ban, or Remove directly
  for (const reg of allRegistrations) {
    if (
      removedKeys.has(reg.id.toLowerCase()) ||
      (reg.member_id && removedKeys.has(reg.member_id.toLowerCase())) ||
      removedKeys.has(reg.email.toLowerCase())
    ) {
      continue;
    }

    if (!directoryMap.has(reg.email.toLowerCase())) {
      const cleanCode = reg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase();
      const approvedGroups = (reg.requested_groups || [])
        .filter(rg => rg.request_type === 'MEMBER' && (rg.status === 'APPROVED' || reg.status === 'PENDING'))
        .map(rg => ({
          id: rg.group_id,
          code: rg.group?.code || 'SIC',
          name: rg.group?.name || 'SIC Group',
        }));

      directoryMap.set(reg.email.toLowerCase(), {
        id: reg.member_id || reg.id,
        auth_user_id: reg.auth_user_id,
        member_code: `SIC-${cleanCode}`,
        full_name: reg.full_name,
        email: reg.email,
        phone: null,
        department: reg.course?.name || 'Innovation & Operations',
        designation: 'SIC Member',
        org_role: 'MEMBER',
        status:
          reg.status === 'SUSPENDED'
            ? 'SUSPENDED'
            : reg.status === 'APPROVED'
            ? 'ACTIVE'
            : 'INACTIVE',
        avatar_url: reg.avatar_url || null,
        college_id: reg.college_id,
        course_id: reg.course_id,
        academic_year_id: reg.academic_year_id,
        division_id: reg.division_id,
        roll_number: reg.roll_number,
        registration_id: reg.id,
        college: reg.college,
        course: reg.course,
        academic_year: reg.academic_year,
        division: reg.division,
        joined_at: reg.reviewed_at || reg.created_at,
        created_at: reg.created_at,
        updated_at: reg.updated_at,
        activeGroups: approvedGroups,
      });
    }
  }

  // Ensure the current admin is also visible if not yet in DB and not removed
  if (
    currentMember &&
    !directoryMap.has(currentMember.email.toLowerCase()) &&
    !removedKeys.has(currentMember.id.toLowerCase()) &&
    !removedKeys.has(currentMember.email.toLowerCase())
  ) {
    directoryMap.set(currentMember.email.toLowerCase(), {
      ...currentMember,
      activeGroups: [],
    });
  }

  const initialMembers = Array.from(directoryMap.values());
  const visibleRegistrations = allRegistrations.filter(
    r =>
      !removedKeys.has(r.id.toLowerCase()) &&
      (!r.member_id || !removedKeys.has(r.member_id.toLowerCase())) &&
      !removedKeys.has(r.email.toLowerCase())
  );

  return (
    <MembersDirectoryClient
      initialMembers={initialMembers}
      initialRegistrations={isAdmin ? visibleRegistrations : []}
      availableGroups={availableGroups}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      currentMemberEmail={currentMember?.email}
    />
  );
}
