// ============================================================================
// SIC Unified Attendance & Operations Management System
// Page: /sic/groups
// Group Management, Multi-Leader Assignment & Member Group Visibility
// ============================================================================

import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember, getSessionUser, getCurrentUserRegistration } from '@/lib/auth/session';
import { getAssociateAdminScope } from '@/lib/auth/rbac';
import { getGroups, resolveAllKnownMembers } from '@/lib/academic/store';
import { GroupsDirectoryClient } from '@/components/sic/groups-directory-client';
import { Member } from '@/lib/types/sic';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect('/login?next=/sic/groups');
  }

  const currentMember = await getCurrentMember(sessionUser);
  if (!currentMember) {
    const registration = await getCurrentUserRegistration(sessionUser.id);
    if (!registration) {
      redirect('/register');
    }
    if (registration.status === 'NEEDS_CORRECTION') {
      redirect('/register?correction=true');
    }
    redirect('/registration-status');
  }

  if (currentMember.status === 'SUSPENDED') {
    redirect('/registration-status?status=SUSPENDED');
  }

  const supabase = await createClient();
  const scope = await getAssociateAdminScope(currentMember.id);
  const isAdmin =
    scope.isAuthorized ||
    currentMember.org_role === 'SUPER_ADMIN' ||
    currentMember.org_role === 'SIC_DIRECTOR' ||
    currentMember.org_role === 'SIC_ADMIN';

  const [groups, storeKnownMembers, { data: dbMembers }] = await Promise.all([
    getGroups(),
    resolveAllKnownMembers(),
    supabase
      .from('members')
      .select(
        'id, auth_user_id, member_code, full_name, email, phone, avatar_url, department, designation, org_role, status, joining_date, roll_number, created_at, updated_at'
      )
      .order('full_name', { ascending: true }),
  ]);

  // Build unified list of active members for leader/member assignment
  const memberMap = new Map<string, Member>();
  for (const m of dbMembers || []) {
    if (m.status === 'ACTIVE') {
      memberMap.set(m.email.toLowerCase(), m as Member);
    }
  }
  for (const m of storeKnownMembers) {
    if (m.status === 'ACTIVE' && !memberMap.has(m.email.toLowerCase())) {
      memberMap.set(m.email.toLowerCase(), m);
    }
  }
  if (currentMember && !memberMap.has(currentMember.email.toLowerCase())) {
    memberMap.set(currentMember.email.toLowerCase(), currentMember);
  }

  const availableMembers = Array.from(memberMap.values());

  return (
    <GroupsDirectoryClient
      initialGroups={groups}
      availableMembers={availableMembers}
      currentMember={{
        id: currentMember.id,
        email: currentMember.email,
        full_name: currentMember.full_name,
        member_code: currentMember.member_code,
        org_role: currentMember.org_role,
      }}
      isAdmin={isAdmin}
    />
  );
}
