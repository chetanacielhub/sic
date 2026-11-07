// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/members
// Member Directory, Invite User, Ban/Unban & Admin Member Approval Console
// ============================================================================

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { getRegistrations, getStoredMembers, getGroups } from '@/lib/academic/store';
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

  // 3. Build unified directory member list (DB members + Stored/Invited members + Approved/Suspended Registrations)
  const directoryMap = new Map<string, DirectoryMemberItem>();

  for (const m of dbMembers || []) {
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
    directoryMap.set(sm.email.toLowerCase(), {
      ...sm,
      activeGroups: sm.activeGroups || [],
    });
  }

  // Ensure any APPROVED or SUSPENDED registrations in the store are also represented in the directory
  for (const reg of allRegistrations) {
    if (
      (reg.status === 'APPROVED' || reg.status === 'SUSPENDED') &&
      !directoryMap.has(reg.email.toLowerCase())
    ) {
      const cleanCode = reg.auth_user_id.replace(/-/g, '').slice(0, 8).toUpperCase();
      const approvedGroups = (reg.requested_groups || [])
        .filter(rg => rg.request_type === 'MEMBER' && rg.status === 'APPROVED')
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
        status: reg.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
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
        joined_at: reg.reviewed_at || reg.created_at,
        created_at: reg.created_at,
        updated_at: reg.updated_at,
        activeGroups: approvedGroups,
      });
    }
  }

  // Ensure the current admin is also visible if not yet in DB
  if (currentMember && !directoryMap.has(currentMember.email.toLowerCase())) {
    directoryMap.set(currentMember.email.toLowerCase(), {
      ...currentMember,
      activeGroups: [],
    });
  }

  const initialMembers = Array.from(directoryMap.values());

  return (
    <MembersDirectoryClient
      initialMembers={initialMembers}
      initialRegistrations={isAdmin ? allRegistrations : []}
      availableGroups={availableGroups}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      currentMemberEmail={currentMember?.email}
    />
  );
}
